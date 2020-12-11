/**
 * @fileoverview This module provides a file system API for the manipulation of paths,
 * directories, files, links, and the construction of input and output streams. It follows
 * the <a href="http://wiki.commonjs.org/wiki/Filesystem/A">CommonJS Filesystem/A</a>
 * proposal.
 *
 * @example // Writes a simple text file
 * const fs = require('fs');
 * if (!fs.exists('test.txt')) {
 *   const textStream = fs.open('test.txt', {
 *     write: true,
 *     binary: false
 *   });
 *   try {
 *     textStream.write('Hello World!');
 *     textStream.flush();
 *   } finally {
 *     textStream.close();
 *   }
 *   console.log('Wrote test.txt');
 * } else {
 *   console.error('test.txt already exists.');
 * }
 */

include('io');
include('binary');

const security = java.lang.System.getSecurityManager();

const arrays = require('ringo/utils/arrays');
const {PosixPermissions} = require('ringo/utils/files');

const {Paths,
    Files,
    FileSystems,
    LinkOption,
    StandardOpenOption,
    StandardCopyOption,
    FileVisitor,
    FileVisitResult} = java.nio.file;

const {FileTime, PosixFileAttributeView, BasicFileAttributes} = java.nio.file.attribute;

const getPath = Paths.get;

const FS = FileSystems.getDefault();
const SEPARATOR = FS.getSeparator();
const SEPARATOR_RE = (SEPARATOR === '/') ?
    new RegExp(SEPARATOR) :
    new RegExp(SEPARATOR.replace("\\", "\\\\") + "|/");

/**
 * Open the file corresponding to `path` for reading or writing,
 * depending on the `options` argument. Returns a [binary stream](../io#Stream)
 * or a [text stream](../io/#TextStream).
 *
 * The `options` argument may contain the following properties:
 *
 *  - __read__ _(boolean)_ open the file in read-only mode.
 *  - __write__ _(boolean)_ open the file in write mode starting at the beginning of the file.
 *  - __append__ _(boolean)_ open the file in write mode starting at the end of the file.
 *  - __binary__ _(boolean)_ open the file in binary mode.
 *  - __charset__ _(string)_ open the file in text mode using the given encoding. Defaults to UTF-8.
 *
 * Instead of an `options` object, a string with the following modes can be
 * provided:
 *
 *  - __r__ _(string)_ equivalent to read-only
 *  - __w__ _(string)_ equivalent to write
 *  - __a__ _(string)_ equivalent to append
 *  - __b__ _(string)_ equivalent to binary
 *
 * So an `options` object `{ read: true, binary: true }` and the mode string `'rb'` are
 * functionally equivalent. <em>Note: The options canonical and exclusive proposed by CommonJS are
 * not supported.</em>
 *
 * @param {String} path the file path
 * @param {Object|String} options options as object properties or as mode string
 * @return {Stream|TextStream} a <code>Stream</code> object in binary mode, otherwise a <code>TextStream</code>
 * @example // Opens a m4a file in binary mode
 * const m4aStream = fs.open('music.m4a', {
 *    binary: true,
 *    read: true
 * });
 *
 * // The equivalent call with options as string
 * const m4aStream = fs.open('music.m4a', 'br');
 *
 * // Opens a text file
 * const textStream = fs.open('example.txt', { read: true });
 *
 * // The equivalent call with options as string
 * const textStream = fs.open('example.txt', 'r');
 */
const open = exports.open = function(path, options) {
    options = checkOptions(options);
    const nioPath = resolvePath(path);
    let {read, write, append, update, binary, charset} = options;

    if (read === true && write === true) {
        throw new Error("Cannot open a file for reading and writing at the same time");
    }

    if (!read && !write && !append && !update) {
        read = true;
    }

    // configure the NIO options
    const nioOptions = [];
    if (append === true) {
        nioOptions.push(StandardOpenOption.APPEND);
    }
    if (read === true) {
        nioOptions.push(StandardOpenOption.READ);
    }
    if (write === true) {
        nioOptions.push(StandardOpenOption.WRITE, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
    }

    const stream = new Stream(read ?
        Files.newInputStream(nioPath, nioOptions) : Files.newOutputStream(nioPath, nioOptions));
    if (binary) {
        return stream;
    } else if (read || write || append) {
        // if charset is undefined, TextStream will use utf8
        return new TextStream(stream, {charset: charset});
    } else if (update) {
        // FIXME botic: check for invalid options before returning a stream? See issue #270
        throw new Error("update not yet implemented");
    }
}

/**
 * Opens the file corresponding to `path` for reading or writing in binary
 * mode. The `options` argument may contain the following properties:
 *
 *  - __read__ _(boolean)_ open the file in read-only mode. (default)
 *  - __write__ _(boolean)_ open the file in write mode starting at the beginning of the file.
 *  - __append__ _(boolean)_ open the file in write mode starting at the end of the file.
 *
 * @param {String} path the file path
 * @param {Object} options options
 * @returns {Stream}
 * @see #open
 */
const openRaw = exports.openRaw = function(path, options) {
    const nioPath = resolvePath(path);
    options = checkOptions(options || {});

    let {read, write, append} = options;
    if (!read && !write && !append) {
        read = true;
    } else if (read === true && write === true) {
        throw new Error("Cannot open a file for reading and writing at the same time");
    }

    // configure the NIO options
    const nioOptions = [];
    if (append === true) {
        nioOptions.push(StandardOpenOption.APPEND);
    }
    if (read === true) {
        nioOptions.push(StandardOpenOption.READ);
    }
    if (write === true) {
        nioOptions.push(StandardOpenOption.WRITE, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
    }

    return new Stream(read ? Files.newInputStream(nioPath, nioOptions) : Files.newOutputStream(nioPath, nioOptions));
}


/**
 * Read the content of the file corresponding to `path`. Returns a
 * String or [ByteString](../binary/#ByteString) object depending on the `options`
 * argument. This function supports the same options as [open()](#open).
 *
 * @param {String} path the file path
 * @param {Object} options optional options
 * @return {String|Binary} the content of the file
 */
const read = exports.read = function(path, options) {
    options = options === undefined ? {} : checkOptions(options);
    options.read = true;
    const stream = open(path, options);
    try {
        return stream.read();
    } finally {
        stream.close();
    }
}

/**
 * Open, write, flush, and close a file, writing the given content. If
 * content is a `ByteArray` or `ByteString` from the `binary` module,
 * binary mode is implied.
 * @param {String} path
 * @param {ByteArray|ByteString|String} content
 * @param {Object} options
 * @see <a href="../binary/index.html#ByteArray">ByteArray</a> or
 *      <a href="../binary/index.html#ByteString">ByteString</a> for binary data
 */
const write = exports.write = function(path, content, options) {
    options = options === undefined ? {} : checkOptions(options);
    options.write = true;
    options.binary = content instanceof Binary;
    const stream = open(path, options);
    try {
        stream.write(content);
        stream.flush();
    } finally {
        stream.close();
    }
}

/**
 * Read data from one file and write it into another using binary mode.
 * Replaces an existing file if it exists.
 * @param {String} from original file
 * @param {String} to copy to create
 * @example // Copies file from a temporary upload directory into /var/www
 * fs.copy('/tmp/uploads/fileA.txt', '/var/www/fileA.txt');
 */
const copy = exports.copy = function(from, to) {
    const sourcePath = resolvePath(from);
    const targetPath = resolvePath(to);

    if (!Files.exists(sourcePath) || Files.isDirectory(sourcePath)) {
        throw new Error(sourcePath + " does not exist!");
    }

    Files.copy(sourcePath, targetPath, [StandardCopyOption.REPLACE_EXISTING]);
}

/**
 * Copy files from a source path to a target path. Files of the below the
 * source path are copied to the corresponding locations relative to the target
 * path, symbolic links to directories are copied but not traversed into.
 * @param {String} from the original tree
 * @param {String} to the destination for the copy
 * @example Before:
 * └── foo
 *     ├── bar
 *     │   └── example.m4a
 *     └── baz
 *
 * // Copy foo
 * fs.copyTree('./foo', './foo2');
 *
 * After:
 * ├── foo
 * │   ├── bar
 * │   │   └── example.m4a
 * │   └── baz
 * └── foo2
 *     ├── bar
 *     │   └── example.m4a
 *     └── baz
 */
const copyTree = exports.copyTree = function(from, to) {
    const source = resolvePath(from);
    const target = resolvePath(to);

    if (String(target) === String(source)) {
        throw new Error("Source and target files are equal in copyTree.");
    } else if (String(target).indexOf(String(source) + SEPARATOR) === 0) {
        throw new Error("Target is a child of source in copyTree");
    }

    if (Files.isDirectory(source)) {
        makeTree(target);
        list(source).forEach(file => {
            const s = join(source.toString(), file);
            const t = join(target.toString(), file);
            if (isLink(s)) {
                symbolicLink(readLink(s), t);
            } else {
                copyTree(s, t);
            }
        });
    } else {
        copy(source.toString(), target.toString());
    }
}

/**
 * Create the directory specified by `path` including any missing parent
 * directories.
 *
 * @param {String} path the path of the tree to create
 * @example Before:
 * └── foo
 *
 * fs.makeTree('foo/bar/baz/');
 *
 * After:
 * └── foo
 *    └── bar
 *       └── baz
 */
const makeTree = exports.makeTree = function(path) {
    Files.createDirectories(resolvePath(path));
}

/**
 * Return an array with all directories below (and including) the given path,
 * as discovered by depth-first traversal. Entries are in lexically sorted
 * order within directories. Symbolic links to directories are not traversed
 * into.
 *
 * @param {String} path the path to discover
 * @returns {Array} array of strings with all directories lexically sorted
 * @example // File system tree of the current working directory:
 * .
 * └── foo
 *     └── bar
 *         └── baz
 *
 * fs.listDirectoryTree('.');
 * // returned array:
 * [ '', 'foo', 'foo/bar', 'foo/bar/baz' ]
 */
const listDirectoryTree = exports.listDirectoryTree = function(path) {
    path = path === '' ? '.' : String(path);
    list(path).reduce((result, child) => {
        const childPath = join(path, child);
        if (isDirectory(childPath)) {
            if (!isLink(childPath)) {
                result.push.apply(result,
                        listDirectoryTree(childPath).map(p => join(child, p)));
            } else { // Don't follow symlinks.
                result.push(child);
            }
        }
        return result;
    }, ['']);
    return result.sort();
}

/**
 * Return an array with all paths (files, directories, etc.) below (and
 * including) the given path, as discovered by depth-first traversal. Entries
 * are in lexically sorted order within directories. Symbolic links to
 * directories are returned but not traversed into.
 *
 * @param {String} path the path to list
 * @returns {Array} array of strings with all discovered paths
 * @example // File system tree of the current working directory:
 * .
 * ├── foo
 * │   └── bar
 * │       └── baz
 * ├── musicfile.m4a
 * └── test.txt
 *
 * fs.listTree('.');
 * // returned array:
 * ['', 'foo', 'foo/bar', 'foo/bar/baz', 'musicfile.m4a', 'test.txt']
 */
const listTree = exports.listTree = function(path) {
    path = path === '' ? '.' : String(path);
    list(path).reduce((result, child) => {
        const childPath = join(path, child);
        // Don't follow directory symlinks, but include them
        if (isDirectory(childPath) && !isLink(childPath)) {
            result.push.apply(result,
                    listTree(childPath).map(p => join(child, p)));
        } else {
            // Add file or symlinked directory.
            result.push(child);
        }
    }, ['']);
    return result.sort();
}

/**
 * Remove the element pointed to by the given path. If path points to a
 * directory, all members of the directory are removed recursively.
 *
 * @param {String} path the element to delete recursively
 * @example // File system tree of the current working directory:
 * ├── foo
 * │   └── bar
 * │       └── baz
 * ├── musicfile.m4a
 * └── test.txt
 *
 * fs.removeTree('foo');
 *
 * After:
 * ├── musicfile.m4a
 * └── test.txt
 */
const removeTree = exports.removeTree = function(path) {
    const nioPath = resolvePath(path);
    Files.walkFileTree(nioPath, new FileVisitor({
        visitFile: (file, attrs) => {
            Files.delete(file);
            return FileVisitResult.CONTINUE;
        },
        visitFileFailed: (file, e) => {
            throw e;
        },
        preVisitDirectory: () => FileVisitResult.CONTINUE,
        postVisitDirectory: (dir, e) => {
            if (e == null) {
                Files.delete(dir);
                return FileVisitResult.CONTINUE;
            } else {
                throw e;
            }
        }
    }));
}

/**
 * Check whether the given pathname is absolute. This is a non-standard extension,
 * not part of CommonJS Filesystem/A.
 *
 * @param {String} path the path to check
 * @returns {Boolean} true if path is absolute, false if not
 * @example >> fs.isAbsolute('../../');
 * false
 * >> fs.isAbsolute('/Users/username/Desktop/example.txt');
 * true
 */
const isAbsolute = exports.isAbsolute = function(path) {
    return getPath(path).isAbsolute();
}

/**
 * Check whether the given pathname is relative (i.e. not absolute). This is a non-standard
 * extension, not part of CommonJS Filesystem/A.
 *
 * @param {String} path the path to check
 * @returns {Boolean} true if path is relative, false if not
 */
const isRelative = exports.isRelative = function(path) {
    return !isAbsolute(path);
}

/**
 * Make the given path absolute by resolving it against the current working
 * directory.
 *
 * @param {String} path the path to resolve
 * @returns {String} the absolute path
 * @example >> fs.absolute('foo/bar/test.txt');
 * '/Users/username/Desktop/working-directory/foo/bar/test.txt'
 */
const absolute = exports.absolute = function(path) {
    return resolve(workingDirectory(), path);
}

/**
 * Return the basename of the given path. That is the path with any leading
 * directory components removed. If specified, also remove a trailing
 * extension.
 * @param {String} path the full path
 * @param {String} ext an optional extension to remove
 * @returns {String} the basename
 * @example >> fs.base('/a/b/c/foosomeext', 'someext');
 * 'foo'
 */
const base = exports.base = function(path, ext) {
    const name = arrays.peek(split(path));
    if (ext && name) {
        const diff = name.length - ext.length;
        if (diff > -1 && name.lastIndexOf(ext) === diff) {
            return name.substring(0, diff);
        }
    }
    return name;
}

/**
 * Return the dirname of the given path. That is the path with any trailing
 * non-directory component removed.
 * @param {String} path
 * @returns {String} the parent directory path
 * @example >> fs.directory('/Users/username/Desktop/example/test.txt');
 * '/Users/username/Desktop/example'
 */
const directory = exports.directory = function(path) {
    return (getPath(path).getParent() || getPath('.')).toString();
}

/**
 * Return the extension of a given path. That is everything after the last dot
 * in the basename of the given path, including the last dot. Returns an empty
 * string if no valid extension exists.
 * @param {String} path
 * @returns {String} the file's extension
 * @example >> fs.extension('test.txt');
 * '.txt'
 */
const extension = exports.extension = function(path) {
    let name = base(path);
    if (!name) {
        return '';
    }
    name = name.replace(/^\.+/, '');
    const index = name.lastIndexOf('.');
    return index > 0 ? name.substring(index) : '';
}

/**
 * Join a list of path elements using the local file system's path separator.
 * Empty path elements (null, undefined and empty strings) will be skipped.
 * All non-string path elements will be converted to strings.
 * The result is not normalized, so `join("..", "foo")` returns `"../foo"`.
 * @returns {String} the joined path
 * @see <a href="http://docs.oracle.com/javase/8/docs/api/java/nio/file/Paths.html#get(java.lang.String,%20java.lang.String...)">java.nio.file.Paths.get(String first, String... more)</a>
 * @example // build path to the config.json file
 * const fullPath = fs.join(configDir, "config.json");
 */
const join = exports.join = function() {
    // filter out empty strings to avoid join("", "foo") -> "/foo"
    const args = Array.prototype.filter.call(arguments, function(p) {
        return p !== "" && p !== null && p !== undefined;
    });

    return String(Paths.get.apply(this, (args.length > 0 ? args : ["."])));
}

/**
 * Split a given path into an array of path components.
 * @param {String} path
 * @returns {Array} the path components
 * @example >> fs.split('/Users/someuser/Desktop/subdir/test.txt');
 * [ '', 'Users', 'someuser', 'Desktop', 'subdir', 'test.txt' ]
 */
const split = exports.split = function(path) {
    if (!path) {
        return [];
    }
    return String(path).split(SEPARATOR_RE);
}

/**
 * Normalize a path by removing '.' and simplifying '..' components, wherever
 * possible.
 * @param {String} path
 * @returns {String} the normalized path
 * @example >> fs.normal('../redundant/../foo/./bar.txt');
 * '../foo/bar.txt'
 */
const normal = exports.normal = function(path) {
    return resolve(path);
}

// Adapted from Narwhal.
/**
 * Join a list of paths by starting at an empty location and iteratively
 * "walking" to each path given. Correctly takes into account both relative and
 * absolute paths.
 *
 * @param {String...} paths... the paths to resolve
 * @return {String} the joined path
 * @example >> fs.resolve('../.././foo/file.txt', 'bar/baz/', 'test.txt');
 * '../../foo/bar/baz/test.txt'
 */
const resolve = exports.resolve = function() {
    const elements = [];
    let root = '';
    let leaf = '';
    let path;
    for (let i = 0; i < arguments.length; i++) {
        path = String(arguments[i]);
        if (path.trim() === '') {
            continue;
        }
        let parts = path.split(SEPARATOR_RE);
        // Checking for absolute paths is not enough here as Windows has
        // something like quasi-absolute paths where a path starts with a
        // path separator instead of a drive character, e.g. \home\projects.
        if (isAbsolute(path) || SEPARATOR_RE.test(path[0])) {
            // path is absolute, throw away everyting we have so far.
            // We still need to explicitly make absolute for the quasi-absolute
            // Windows paths mentioned above.
            root = String(getPath(parts.shift() + SEPARATOR).toAbsolutePath());
            elements.length = 0;
        }
        leaf = parts.pop();
        if (leaf === '.' || leaf === '..') {
            parts.push(leaf);
            leaf = '';
        }
        for (let j = 0; j < parts.length; j++) {
            let part = parts[j];
            if (part === '..') {
                if (elements.length > 0 && arrays.peek(elements) !== '..') {
                    elements.pop();
                } else if (!root) {
                    elements.push(part);
                }
            } else if (part !== '' && part !== '.') {
                elements.push(part);
            }
        }
    }
    path = elements.join(SEPARATOR);
    if (path.length > 0) {
        leaf = SEPARATOR + leaf;
    }
    return root + path + leaf;
}

// Adapted from narwhal.
/**
 * Establish the relative path that links source to target by strictly
 * traversing up ('..') to find a common ancestor of both paths. If the target
 * is omitted, returns the path to the source from the current working
 * directory.
 * @param {String} source
 * @param {String} target
 * @returns {String} the path needed to change from source to target
 * @example >> fs.relative('foo/bar/', 'foo/baz/');
 * '../baz/'
 * >> fs.relative('foo/bar/', 'foo/bar/baz/');
 * 'baz/'
 */
const relative = exports.relative = function(source, target) {
    if (!target) {
        target = source;
        source = workingDirectory();
    }
    source = absolute(source);
    target = absolute(target);
    source = source.split(SEPARATOR_RE);
    target = target.split(SEPARATOR_RE);
    source.pop();
    while (source.length && target.length && target[0] === source[0]) {
        source.shift();
        target.shift();
    }
    while (source.length) {
        source.shift();
        target.unshift("..");
    }
    return target.join(SEPARATOR);
}

/**
 * Move a file from `source` to `target`. If `target` already exists,
 * it is replaced by the `source` file.
 * @param {String} source the source path
 * @param {String} target the target path
 * @throws Error
 * @example // Moves file from a temporary upload directory into /var/www
 * fs.move('/tmp/uploads/fileA.txt', '/var/www/fileA.txt');
 */
const move = exports.move = function(source, target) {
    const from = resolvePath(source);
    const to = resolvePath(target);
    Files.move(from, to, [StandardCopyOption.REPLACE_EXISTING]);
}

/**
 * Remove a file at the given `path`. Throws an error if `path` is not a file
 * or a symbolic link to a file.
 * @param {String} path the path of the file to remove.
 * @throws Error if path is not a file or could not be removed.
 */
const remove = exports.remove = function(path) {
    const nioPath = resolvePath(path);

    if (Files.isDirectory(nioPath)) {
        throw new Error(path + " is not a file");
    }

    Files.delete(nioPath);
}

/**
 * Return true if the file denoted by `path` exists, false otherwise.
 * @param {String} path the file path.
 */
const exists = exports.exists = function(path) {
    return Files.exists(resolvePath(path));
}

/**
 * Return the path name of the current working directory.
 * @returns {String} the current working directory
 */
const workingDirectory = exports.workingDirectory = function() {
    return resolvePath(java.lang.System.getProperty('user.dir')) + SEPARATOR;
}

/**
 * Remove a file or directory identified by `path`. Throws an error if
 * `path` is a directory and not empty.
 * @param {String} path the directory path
 * @throws Error if the file or directory could not be removed.
 */
const removeDirectory = exports.removeDirectory = function(path) {
    Files.delete(resolvePath(path));
}

/**
 * Returns an array of strings naming the files and directories in
 * the given directory. There is no guarantee that the strings are in
 * any specific order.
 *
 * @example const names = fs.list('/usr/local/');
 * names.forEach(function(name) {
 *   const fullPath = fs.join(dir, name);
 *   if (fs.isFile(fullPath)) {
 *     // do something with the file
 *   }
 * });
 * @param {String} path the directory path
 * @returns {Array} an array of strings with the files, directories, or symbolic links
 */
const list = exports.list = function(path) {
    const nioPath = resolvePath(path);

    if (!Files.isDirectory(nioPath)) {
        throw new Error("failed to list directory " + path);
    }

    const files = [];
    const dirStream = Files.newDirectoryStream(nioPath);
    const dirIterator = dirStream.iterator();
    while (dirIterator.hasNext()) {
        files.push(String(dirIterator.next().getFileName()));
    }
    dirStream.close();

    return files;
}

/**
 * Returns the size of a file in bytes, or throws an exception if the path does
 * not correspond to an accessible path, or is not a regular file or a link.
 * @param {String} path the file path
 * @returns {Number} the file size in bytes
 * @throws Error if path is not a file
 */
const size = exports.size = function(path) {
    const nioPath = resolvePath(path);
    if (!Files.isRegularFile(nioPath)) {
        throw new Error(path + " is not a file");
    }
    return Files.size(nioPath);
}

/**
 * Returns the time a file was last modified as a Date object.
 * @param {String} path the file path
 * @returns {Date} the date the file was last modified
 */
const lastModified = exports.lastModified = function(path) {
    const nioPath = resolvePath(path);
    const fileTime = Files.getLastModifiedTime(nioPath);
    return new Date(fileTime.toMillis());
}

/**
 * Create a single directory specified by `path`. If the directory cannot be
 * created for any reason an error is thrown. This includes if the parent
 * directories of `path` are not present. If a `permissions` argument is passed
 * to this function it is used to create a Permissions instance which is
 * applied to the given path during directory creation.
 *
 * @param {String} path the file path
 * @param {Number|String|java.util.Set<PosixFilePermission>} permissions optional the POSIX permissions
 */
const makeDirectory = exports.makeDirectory = function(path, permissions) {
    if (security) {
        security.checkWrite(path);
    }

    // single-argument Files.createDirectory() respects the current umask
    if (permissions == null) {
        Files.createDirectory(getPath(path));
    } else {
        Files.createDirectory(getPath(path), (new PosixPermissions(permissions)).toJavaFileAttribute());
    }
}

/**
 * Returns true if the file specified by path exists and can be opened for reading.
 * @param {String} path the file path
 * @returns {Boolean} whether the file exists and is readable
 */
const isReadable = exports.isReadable = function(path) {
    return Files.isReadable(resolvePath(path));
}

/**
 * Returns true if the file specified by path exists and can be opened for writing.
 * @param {String} path the file path
 * @returns {Boolean} whether the file exists and is writable
 */
const isWritable = exports.isWritable = function(path) {
    return Files.isWritable(resolvePath(path));
}

/**
 * Returns true if the file specified by path exists and is a regular file.
 * @param {String} path the file path
 * @returns {Boolean} whether the file exists and is a file
 */
const isFile = exports.isFile = function(path) {
    return Files.isRegularFile(resolvePath(path));
}

/**
 * Returns true if the file specified by path exists and is a directory.
 * @param {String} path the file path
 * @returns {Boolean} whether the file exists and is a directory
 */
const isDirectory = exports.isDirectory = function(path) {
    return Files.isDirectory(resolvePath(path));
}

/**
 * Return true if target file is a symbolic link, false otherwise.
 *
 * @param {String} path the file path
 * @returns {Boolean} true if the given file exists and is a symbolic link
 */
const isLink = exports.isLink = function(path) {
    if (security) {
        security.checkRead(path);
    }
    return Files.isSymbolicLink(resolvePath(path));
}

/**
 * Returns whether two paths refer to the same storage (file or directory),
 * either by virtue of symbolic or hard links, such that modifying one would
 * modify the other.
 *
 * @param {String} pathA the first path
 * @param {String} pathB the second path
 * @returns {Boolean} true iff the two paths locate the same file
 */
const same = exports.same = function(pathA, pathB) {
    if (security) {
        security.checkRead(pathA);
        security.checkRead(pathB);
    }
    // make canonical to resolve symbolic links
    const nioPathA = getPath(canonical(pathA));
    const nioPathB = getPath(canonical(pathB));

    return Files.isSameFile(nioPathA, nioPathB);
}

/**
 * Returns whether two paths refer to an entity of the same file system.
 *
 * @param {String} pathA the first path
 * @param {String} pathB the second path
 * @returns {Boolean} true if same file system, otherwise false
 */
const sameFilesystem = exports.sameFilesystem = function(pathA, pathB) {
    if (security) {
        security.checkRead(pathA);
        security.checkRead(pathB);
    }
    // make canonical to resolve symbolic links
    const nioPathA = getPath(canonical(pathA));
    const nioPathB = getPath(canonical(pathB));

    return nioPathA.getFileSystem().equals(nioPathB.getFileSystem());
}

/**
 * Returns the canonical path to a given abstract path. Canonical paths are both
 * absolute and intrinsic, such that all paths that refer to a given file
 * (whether it exists or not) have the same corresponding canonical path.
 * @param {String} path a file path
 * @returns {String} the canonical path
 */
const canonical = exports.canonical = function(path) {
    return String(resolvePath(path).toRealPath().normalize());
}

/**
 * Sets the modification time of a file or directory at a given path to a
 * specified time, or the current time. Creates an empty file at the given path
 * if no file or directory exists, using the default permissions.
 * @param {String} path the file path
 * @param {Date} mtime optional date
 */
const touch = exports.touch = function(path, mtime) {
    const nioPath = resolvePath(path);
    if (!Files.exists(nioPath)) {
        Files.createFile(nioPath);
    } else {
        Files.setLastModifiedTime(nioPath, FileTime.fromMillis(mtime || Date.now()));
    }

    return true;
}

/**
 * Creates a symbolic link at the target path that refers to the source path.
 * The concrete implementation depends on the file system and the operating system.
 *
 * @param {String} existing path to an existing file, therefore the target of the link
 * @param {String} link the link to create pointing to an existing path
 * @returns {String} the path to the symbolic link
 */
const symbolicLink = exports.symbolicLink = function(existing, link) {
    if (security) {
        security.checkRead(existing);
        security.checkWrite(link);
    }

    return String(Files.createSymbolicLink(getPath(link), getPath(existing)));
}

/**
 * Creates a hard link at the target path that refers to the source path.
 * The concrete implementation depends on the file system and the operating system.
 *
 * @param {String} existing path to an existing file, therefore the target of the link
 * @param {String} link the link to create pointing to an existing path
 * @returns {String} the path to the link
 */
const hardLink = exports.hardLink = function(existing, link) {
    if (security) {
        security.checkRead(existing);
        security.checkWrite(link);
    }

    return String(Files.createLink(getPath(link), getPath(existing)));
}

/**
 * Returns the immediate target of the symbolic link at the given `path`.
 *
 * @param {String} path a file path
 */
const readLink = exports.readLink = function(path) {
    if (security) security.checkRead(path);

    // Throws an exception if there is no symbolic link at the given path or the link cannot be read.
    if (!Files.isReadable(getPath(path))) {
        throw new Error("Path " + path + " is not readable!");
    }

    return Files.readSymbolicLink(resolvePath(path)).toString();
}

/**
 * Returns a Rhino-specific generator that produces the file names of a directory.
 * There is no guarantee that the produced strings are in any specific order.
 * @param {String} path a directory path
 * @see <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Iterators_and_Generators">MDN Iterators and Generators</a>
 * @example // Iterates over the current working directory
 * for (let name of fs.iterate(".")) {
 *   console.log(name);
 * }
 */
const iterate = exports.iterate = function(path) {
    return function*() {
        for (let item of list(path)) {
            yield item;
        }
        throw StopIteration;
    }();
}

/**
 * Returns the POSIX file permissions for the given path, if the filesystem supports POSIX.
 * @param {String} path
 * @returns PosixFilePermission the POSIX permissions for the given path
 */
const permissions = exports.permissions = function(path) {
    if (security) {
        security.checkRead(path);
    }
    return new PosixPermissions(Files.getPosixFilePermissions(getPath(path)));
}

/**
 * Returns the username of the owner of the given file.
 * @param {String} path
 * @returns {String} the username of the owner, or null if not possible to determine
 */
const owner = exports.owner = function(path) {
    if (security) {
        security.checkRead(path);
    }
    try {
        return Files.getOwner(getPath(path)).getName();
    } catch (error) {
        // do nothing
    }

    return null;
}

/**
 * Returns the group name for the given file.
 * @param {String} path
 * @returns {String} the group's name, or null if not possible to determine
 */
const group = exports.group = function(path) {
    if (security) {
        security.checkRead(path);
    }
    try {
        const attributes = Files.getFileAttributeView(getPath(path), PosixFileAttributeView);
        return attributes.readAttributes().group().getName();
    } catch (error) {
        // do nothing
    }

    return null;
}

/**
 * Changes the permissions of the specified file.
 * @param {String} path
 * @param {Number|String|java.util.Set<PosixFilePermission>} permissions the POSIX permissions
 */
const changePermissions = exports.changePermissions = function(path, permissions) {
    if (security) {
        security.checkWrite(path);
    }
    permissions = new PosixPermissions(permissions);
    return Files.setPosixFilePermissions(getPath(path), permissions.toJavaPosixFilePermissionSet());
}

/**
 * Changes the owner of the specified file.
 *
 * @param {String} path
 * @param {String} owner the user name string
 */
const changeOwner = exports.changeOwner = function(path, user) {
    if (security) {
        security.checkWrite(path);
    }

    const lookupService = FS.getUserPrincipalLookupService();
    const userPrincipal = lookupService.lookupPrincipalByName(user);

    return Files.setOwner(getPath(path), userPrincipal);
}

/**
 * Changes the group of the specified file.
 *
 * @param {String} path
 * @param {String} group group name string
 */
const changeGroup = exports.changeGroup = function(path, group) {
    if (security) {
        security.checkWrite(path);
    }

    const lookupService = FS.getUserPrincipalLookupService();
    const groupPrincipal = lookupService.lookupPrincipalByGroupName(group);

    const attributes = Files.getFileAttributeView(
        getPath(path),
        PosixFileAttributeView,
        LinkOption.NOFOLLOW_LINKS
    );
    attributes.setGroup(groupPrincipal);

    return true;
}

/**
 * Returns basic attributes associated with a file in a file system.
 * @param {String} path
 * @returns {Object} An Object with properties {creationTime, isDirectory, isOther, isRegularFile, isSymbolicLink, lastAccessTime, lastModifiedTime, size}
 * @see <a href="https://docs.oracle.com/javase/8/docs/api/java/nio/file/attribute/BasicFileAttributes.html">java.nio BasicFileAttributes</a>
 */
function getAttributes(path) {
    const attributes = Files.readAttributes(resolvePath(path), BasicFileAttributes, LinkOption.NOFOLLOW_LINKS);
    return {
        creationTime: new Date(attributes.creationTime().toMillis()),
        isDirectory: attributes.isDirectory(),
        isOther: attributes.isOther(),
        isRegularFile: attributes.isRegularFile(),
        isSymbolicLink: attributes.isSymbolicLink(),
        lastAccessTime: new Date(attributes.lastAccessTime().toMillis()),
        lastModifiedTime: new Date(attributes.lastModifiedTime().toMillis()),
        size: attributes.size()
    }
}

const optionsMask = {
    read: 1,
    write: 1,
    append: 1,
    update: 1,
    binary: 1,
    exclusive: 1,
    canonical: 1,
    charset: 1
};

/**
 * Internal.
 */
const checkOptions = function(options) {
    if (!options) {
        options = {};
    } else if (typeof options != 'object') {
        if (typeof options == 'string') {
            // if options is a mode string convert it to options object
            options = applyMode(options);
        } else {
            throw new Error('unsupported options argument');
        }
    } else {
        // run sanity check on user-provided options object
        Object.keys(options).forEach(key => {
            if (!(key in optionsMask)) {
                throw new Error("unsupported option: " + key);
            }
            options[key] = (key === 'charset') ?
                String(options[key]) : Boolean(options[key]);
        });
    }
    return options;
}

/**
 * Internal. Convert a mode string to an options object.
 */
const applyMode = function(mode) {
    const options = {};
    for (let i = 0; i < mode.length; i++) {
        switch (mode[i]) {
            case 'r':
                options.read = true;
                break;
            case 'w':
                options.write = true;
                break;
            case 'a':
                options.append = true;
                break;
            case '+':
                options.update = true;
                break;
            case 'b':
                options.binary = true;
                break;
            case 'x':
                // FIXME botic: is this implemented?
                options.exclusive = true;
                break;
            case 'c':
                // FIXME botic: is this needed?
                options.canonical = true;
                break;
            default:
                throw new Error("unsupported mode argument: " + options);
        }
    }
    return options;
}

/**
 * Internal.
 */
const resolvePath = function(path) {
    if (path === null || path === undefined) {
        throw new Error('undefined path argument');
    }

    return getPath(path instanceof Path ? path : String(path)).toAbsolutePath().normalize();
}

// Path object

/**
 * A shorthand for creating a new `Path` without the `new` keyword.
 */
const path = exports.path = function() {
    return new Path(join.apply(null, arguments));
}

/**
 * Path constructor. Path is a chainable shorthand for working with paths.
 * @augments String
 */
const Path = exports.Path = function() {
    if (!(this instanceof Path)) {
        return new Path(join.apply(null, arguments));
    }
    const path = join.apply(null, arguments);
    this.toString = () => path;
    return this;
}

/** @ignore */
Path.prototype = Object.create(String.prototype);
Path.prototype.constructor = Path;

/**
 * This is a non-standard extension, not part of CommonJS Filesystem/A.
 */
Path.prototype.valueOf = function() {
    return this.toString();
};

/**
 * Join a list of paths to this path.
 */
Path.prototype.join = function() {
    return new Path(join.apply(null,
            [this.toString()].concat(Array.prototype.slice.call(arguments))));
};

/**
 * Resolve against this path.
 */
Path.prototype.resolve = function() {
    return new Path(resolve.apply(
            null,
            [this.toString()].concat(Array.prototype.slice.call(arguments))
        )
    );
};

/**
 * Return the relative path from this path to the given target path. Equivalent
 * to `fs.Path(fs.relative(this, target))`.
 * @param {String} target
 */
Path.prototype.to = function(target) {
    return exports.Path(relative(this.toString(), target));
};

/**
 * Return the relative path from the given source path to this path. Equivalent
 * to `fs.Path(fs.relative(source, this))`.
 * @param {String} target
 */
Path.prototype.from = function(target) {
    return exports.Path(relative(target, this.toString()));
};

/**
 * Return the names of all files in this path, in lexically sorted order and
 * wrapped in Path objects.
 */
Path.prototype.listPaths = function() {
    return this.list().map(file => new Path(this, file), this).sort();
};

const PATHED = [
    'absolute',
    'base',
    'canonical',
    'directory',
    'normal',
    'relative'
];
PATHED.forEach(name => {
    Path.prototype[name] = function() {
        return new Path(exports[name].apply(
            this,
            [this.toString()].concat(Array.prototype.slice.call(arguments))
        ));
    };
});

const TRIVIA = [
    'copy',
    'copyTree',
    'exists',
    'extension',
    'getAttributes',
    'isDirectory',
    'isFile',
    'isLink',
    'isReadable',
    'isWritable',
    'iterate',
    'lastModified',
    'link',
    'list',
    'listDirectoryTree',
    'listTree',
    'makeDirectory',
    'makeTree',
    'move',
    'open',
    'read',
    'remove',
    'removeTree',
    'rename',
    'size',
    'split',
    'symbolicLink',
    'touch',
    'write'
];

TRIVIA.forEach(name => {
    Path.prototype[name] = function() {
        const fn = exports[name];
        if (!fn) {
            throw new Error("Not found: " + name);
        }
        const result = fn.apply(
            this,
            [this.toString()].concat(Array.prototype.slice.call(arguments))
        );
        return result === undefined ? this : result;
    };
});
