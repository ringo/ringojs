/**
 * @fileoverview This module provides a file system API for the manipulation of paths,
 * directories, files, links, and the construction of input and output streams. It follows
 * the <a href="http://wiki.commonjs.org/wiki/Filesystem/A">CommonJS Filesystem/A</a>
 * proposal.
 *
 * Some file system manipulations use a wrapper around standard POSIX functions. Their
 * functionality depends on the concrete file system and operating system. Others use
 * the <code>java.io</code> package and work cross-platform.
 *
 * @example // Writes a simple text file
 * var fs = require('fs');
 * if (!fs.exists('test.txt')) {
 *   var textStream = fs.open('test.txt', {
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

var arrays = require('ringo/utils/arrays');
include('io');
include('binary');

var File = java.io.File,
    FileInputStream = java.io.FileInputStream,
    FileOutputStream = java.io.FileOutputStream;

var SEPARATOR = File.separator;
var SEPARATOR_RE = SEPARATOR == '/' ?
                   new RegExp(SEPARATOR) :
                   new RegExp(SEPARATOR.replace("\\", "\\\\") + "|/");

var POSIX;
var security = java.lang.System.getSecurityManager();

function getPOSIX() {
    POSIX = POSIX || org.ringojs.wrappers.POSIX.getPOSIX();
    return POSIX;
}

export('absolute',
       'base',
       'copy',
       'copyTree',
       'directory',
       'extension',
       'isAbsolute', // non-standard/non-spec
       'isRelative', // non-standard/non-spec
       'join',
       'makeTree',
       'listDirectoryTree',
       'listTree',
       'normal',
       'open',
       'path',
       'Path',
       'read',
       'relative',
       'removeTree',
       'resolve',
       'write',
       'split',
       // previously in fs-base
       'canonical',
       'changeWorkingDirectory',
       'workingDirectory',
       'exists',
       'isDirectory',
       'isFile',
       'isReadable',
       'isWritable',
       'list',
       'makeDirectory',
       'move',
       'lastModified',
       'openRaw',
       'remove',
       'removeDirectory',
       'size',
       'touch',
       'symbolicLink',
       'hardLink',
       'readLink',
       'isLink',
       'same',
       'sameFilesystem',
       'iterate',
       'Permissions',
       'owner',
       'group',
       'changePermissions',
       'changeOwner',
       'changeGroup',
       'permissions');

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
 * var m4aStream = fs.open('music.m4a', {
 *    binary: true,
 *    read: true
 * });
 *
 * // The equivalent call with options as string
 * var m4aStream = fs.open('music.m4a', 'br');
 *
 * // Opens a text file
 * var textStream = fs.open('example.txt', { read: true });
 *
 * // The equivalent call with options as string
 * var textStream = fs.open('example.txt', 'r');
 */
function open(path, options) {
    options = checkOptions(options);
    var file = resolveFile(path);
    var {read, write, append, update, binary, charset} = options;

    if (read === true && write === true) {
        throw new Error("Cannot open a file for reading and writing at the same time");
    }

    if (!read && !write && !append && !update) {
        read = true;
    }
    var stream = new Stream(read ?
            new FileInputStream(file) : new FileOutputStream(file, Boolean(append)));
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
function openRaw(path, options) {
    var file = resolveFile(path);
    options = options || {};
    var {read, write, append} = options;
    if (!read && !write && !append) {
        read = true;
    } else if (read === true && write === true) {
        throw new Error("Cannot open a file for reading and writing at the same time");
    }

    if (read) {
        return new Stream(new FileInputStream(file));
    } else {
        return new Stream(FileOutputStream(file, Boolean(append)));
    }
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
function read(path, options) {
    options = options === undefined ? {} : checkOptions(options);
    options.read = true;
    var stream = open(path, options);
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
function write(path, content, options) {
    options = options === undefined ? {} : checkOptions(options);
    options.write = true;
    options.binary = content instanceof Binary;
    var stream = open(path, options);
    try {
        stream.write(content);
        stream.flush();
    } finally {
        stream.close();
    }
}

/**
 * Read data from one file and write it into another using binary mode.
 * @param {String} from original file
 * @param {String} to copy to create
 * @example // Copies file from a temporary upload directory into /var/www
 * fs.copy('/tmp/uploads/fileA.txt', '/var/www/fileA.txt');
 */
function copy(from, to) {
    var source = resolveFile(from);
    var target = resolveFile(to);
    var input = new FileInputStream(source).getChannel();
    var output = new FileOutputStream(target).getChannel();
    var size = source.length();
    try {
        input.transferTo(0, size, output);
    } finally {
        input.close();
        output.close();
    }
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
function copyTree(from, to) {
    var source = resolveFile(from).getCanonicalFile();
    var target = resolveFile(to).getCanonicalFile();
    if (String(target) == String(source)) {
        throw new Error("Source and target files are equal in copyTree.");
    } else if (String(target).indexOf(String(source) + SEPARATOR) == 0) {
        throw new Error("Target is a child of source in copyTree");
    }
    if (source.isDirectory()) {
        makeTree(target);
        var files = source.list();
        for each (var file in files) {
            var s = join(source, file);
            var t = join(target, file);
            if (isLink(s)) {
                symbolicLink(readLink(s), t);
            } else {
                copyTree(s, t);
            }
        }
    } else {
        copy(source, target);
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
function makeTree(path) {
    var file = resolveFile(path);
    if (!file.isDirectory() && !file.mkdirs()) {
        throw new Error("failed to make tree " + path);
    }
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
function listDirectoryTree(path) {
    path = path === '' ? '.' : String(path);
    var result = [''];
    list(path).forEach(function (child) {
        var childPath = join(path, child);
        if (isDirectory(childPath)) {
            if (!isLink(childPath)) {
                result.push.apply(result,
                        listDirectoryTree(childPath).map(function (p) join(child, p)));
            } else { // Don't follow symlinks.
                result.push(child);
            }
        }
    });
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
function listTree(path) {
    path = path === '' ? '.' : String(path);
    var result = [''];
    list(path).forEach(function (child) {
        var childPath = join(path, child);
        // Don't follow directory symlinks, but include them
        if (isDirectory(childPath) && !isLink(childPath)) {
            result.push.apply(result,
                    listTree(childPath).map(function (p) join(child, p)));
        } else {
            // Add file or symlinked directory.
            result.push(child);
        }
    });
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
function removeTree(path) {
    var file = resolveFile(path);
    // do not follow symlinks
    if (file.isDirectory() && !isLink(file.getPath())) {
        for each (var child in file.list()) {
            removeTree(join(file, child));
        }
    }
    if (!file['delete']()) {
        throw new Error("failed to remove " + path);
    }
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
function isAbsolute(path) {
    return new File(path).isAbsolute();
}

/**
 * Check whether the given pathname is relative (i.e. not absolute). This is a non-standard
 * extension, not part of CommonJS Filesystem/A.
 *
 * @param {String} path the path to check
 * @returns {Boolean} true if path is relative, false if not
 */
function isRelative(path) {
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
function absolute(path) {
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
function base(path, ext) {
    var name = arrays.peek(split(path));
    if (ext && name) {
        var diff = name.length - ext.length;
        if (diff > -1 && name.lastIndexOf(ext) == diff) {
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
function directory(path) {
    return new File(path).getParent() || '.';
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
function extension(path) {
    var name = base(path);
    if (!name) {
        return '';
    }
    name = name.replace(/^\.+/, '');
    var index = name.lastIndexOf('.');
    return index > 0 ? name.substring(index) : '';
}

/**
 * Join a list of paths using the local file system's path separator.
 * The result is not normalized, so `join("..", "foo")` returns `"../foo"`.
 * @see http://wiki.commonjs.org/wiki/Filesystem/Join
 * @example // build path to the config.json file
 * var fullPath = fs.join(configDir, "config.json");
 */
function join() {
    // filter out empty strings to avoid join("", "foo") -> "/foo"
    var args = Array.filter(arguments, function(p) p != "")
    return args.join(SEPARATOR);
}

/**
 * Split a given path into an array of path components.
 * @param {String} path
 * @returns {Array} the path components
 * @example >> fs.split('/Users/someuser/Desktop/subdir/test.txt');
 * [ '', 'Users', 'someuser', 'Desktop', 'subdir', 'test.txt' ]
 */
function split(path) {
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
function normal(path) {
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
function resolve() {
    var root = '';
    var elements = [];
    var leaf = '';
    var path;
    for (var i = 0; i < arguments.length; i++) {
        path = String(arguments[i]);
        if (path.trim() == '') {
            continue;
        }
        var parts = path.split(SEPARATOR_RE);
        // Checking for absolute paths is not enough here as Windows has
        // something like quasi-absolute paths where a path starts with a
        // path separator instead of a drive character, e.g. \home\projects.
        if (isAbsolute(path) || SEPARATOR_RE.test(path[0])) {
            // path is absolute, throw away everyting we have so far.
            // We still need to explicitly make absolute for the quasi-absolute
            // Windows paths mentioned above.
            root = new File(parts.shift() + SEPARATOR).getAbsolutePath();
            elements = [];
        }
        leaf = parts.pop();
        if (leaf == '.' || leaf == '..') {
            parts.push(leaf);
            leaf = '';
        }
        for (var j = 0; j < parts.length; j++) {
            var part = parts[j];
            if (part == '..') {
                if (elements.length > 0 && arrays.peek(elements) != '..') {
                    elements.pop();
                } else if (!root) {
                    elements.push(part);
                }
            } else if (part != '' && part != '.') {
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
function relative(source, target) {
    if (!target) {
        target = source;
        source = workingDirectory();
    }
    source = absolute(source);
    target = absolute(target);
    source = source.split(SEPARATOR_RE);
    target = target.split(SEPARATOR_RE);
    source.pop();
    while (
        source.length &&
        target.length &&
        target[0] == source[0]) {
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
 * Move a file from `source` to `target`.
 * @param {String} source the source path
 * @param {String} target the target path
 * @throws Error
 * @example // Moves file from a temporary upload directory into /var/www
 * fs.move('/tmp/uploads/fileA.txt', '/var/www/fileA.txt');
 */
function move(source, target) {
    var from = resolveFile(source);
    var to = resolveFile(target);
    if (!from.renameTo(to)) {
        throw new Error("Failed to move file from " + source + " to " + target);
    }
}

/**
 * Remove a file at the given `path`. Throws an error if `path` is not a file
 * or a symbolic link to a file.
 * @param {String} path the path of the file to remove.
 * @throws Error if path is not a file or could not be removed.
 */
function remove(path) {
    var file = resolveFile(path);
    if (!file.isFile()) {
        throw new Error(path + " is not a file");
    }
    if (!file['delete']()) {
        throw new Error("failed to remove file " + path);
    }
}

/**
 * Return true if the file denoted by `path` exists, false otherwise.
 * @param {String} path the file path.
 */
function exists(path) {
    var file = resolveFile(path);
    return file.exists();
}

/**
 * Return the path name of the current working directory.
 * @returns {String} the current working directory
 */
function workingDirectory() {
    return java.lang.System.getProperty('user.dir') + SEPARATOR;
}

/**
 * Set the current working directory to `path`.
 * @param {String} path the new working directory
 */
function changeWorkingDirectory(path) {
    path = new File(path).getCanonicalPath();
    java.lang.System.setProperty('user.dir', path);
}

/**
 * Remove a file or directory identified by `path`. Throws an error if
 * `path` is a directory and not empty.
 * @param {String} path the directory path
 * @throws Error if the file or directory could not be removed.
 */
function removeDirectory(path) {
    var file = resolveFile(path);
    if (!file['delete']()) {
        throw new Error("failed to remove directory " + path);
    }
}

/**
 * Returns an array of strings naming the files and directories in
 * the given directory. There is no guarantee that the strings are in
 * any specific order.
 *
 * @example var names = fs.list('/usr/local/');
 * names.forEach(function(name) {
 *   var fullPath = fs.join(dir, name);
 *   if (fs.isFile(fullPath)) {
 *     // do something with the file
 *   }
 * });
 * @param {String} path the directory path
 * @returns {Array} an array of strings with the files, directories, or symbolic links
 */
function list(path) {
    var file = resolveFile(path);
    var list = file.list();
    if (list == null) {
        throw new Error("failed to list directory " + path);
    }
    var result = [];
    for (var i = 0; i < list.length; i++) {
        result[i] = list[i];
    }
    return result;
}

/**
 * Returns the size of a file in bytes, or throws an exception if the path does
 * not correspond to an accessible path, or is not a regular file or a link.
 * @param {String} path the file path
 * @returns {Number} the file size in bytes
 * @throws Error if path is not a file
 */
function size(path) {
    var file = resolveFile(path);
    if (!file.isFile()) {
        throw new Error(path + " is not a file");
    }
    return file.length();
}

/**
 * Returns the time a file was last modified as a Date object.
 * @param {String} path the file path
 * @returns {Date} the date the file was last modified
 */
function lastModified(path) {
    var file = resolveFile(path);
    return new Date(file.lastModified());
}

/**
 * Create a single directory specified by `path`. If the directory cannot be
 * created for any reason an error is thrown. This includes if the parent
 * directories of `path` are not present. If a `permissions` argument is passed
 * to this function it is used to create a Permissions instance which is
 * applied to the given path during directory creation.
 *
 * This function wraps the POSIX <code>mkdir()</code> function.
 *
 * @param {String} path the file path
 * @param {Number|Object} permissions optional permissions
 * @see <a href="http://pubs.opengroup.org/onlinepubs/9699919799/utilities/mkdir.html">POSIX <code>mkdir</code></a>
 */
function makeDirectory(path, permissions) {
    if (security) security.checkWrite(path);
    permissions = permissions != null ?
            new Permissions(permissions) : Permissions["default"];
    var POSIX = getPOSIX();
    if (POSIX.mkdir(path, permissions.toNumber()) != 0) {
        throw new Error("failed to make directory " + path);
    }
}

/**
 * Returns true if the file specified by path exists and can be opened for reading.
 * @param {String} path the file path
 * @returns {Boolean} whether the file exists and is readable
 */
function isReadable(path) {
    return resolveFile(path).canRead();
}

/**
 * Returns true if the file specified by path exists and can be opened for writing.
 * @param {String} path the file path
 * @returns {Boolean} whether the file exists and is writable
 */
function isWritable(path) {
    return resolveFile(path).canWrite();
}

/**
 * Returns true if the file specified by path exists and is a regular file.
 * @param {String} path the file path
 * @returns {Boolean} whether the file exists and is a file
 */
function isFile(path) {
    return resolveFile(path).isFile();
}

/**
 * Returns true if the file specified by path exists and is a directory.
 * @param {String} path the file path
 * @returns {Boolean} whether the file exists and is a directory
 */
function isDirectory(path) {
    return resolveFile(path).isDirectory();
}

/**
 * Return true if target file is a symbolic link, false otherwise.
 *
 * This function wraps the POSIX <code>lstat()</code> function to get the
 * symbolic link status.
 *
 * @param {String} path the file path
 * @returns {Boolean} true if the given file exists and is a symbolic link
 * @see <a href="http://pubs.opengroup.org/onlinepubs/9699919799/functions/lstat.html">POSIX <code>lstat</code></a>
 */
function isLink(path) {
    if (security) security.checkRead(path);
    try {
        var POSIX = getPOSIX();
        var stat = POSIX.lstat(path);
        return stat.isSymlink();
    } catch (error) {
        // fallback if POSIX is no available
        path = resolveFile(path);
        var parent = path.getParentFile();
        if (!parent) return false;
        parent = parent.getCanonicalFile();
        path = new File(parent, path.getName());
        return !path.equals(path.getCanonicalFile())
    }
}

/**
 * Returns whether two paths refer to the same storage (file or directory),
 * either by virtue of symbolic or hard links, such that modifying one would
 * modify the other.
 *
 * This function uses the POSIX <code>stat()</code> function to compare two
 * files or links.
 *
 * @param {String} pathA the first path
 * @param {String} pathB the second path
 * @returns {Boolean} true if identical, otherwise false
 * @see <a href="http://pubs.opengroup.org/onlinepubs/9699919799/functions/stat.html">POSIX <code>stat</code></a>
 */
function same(pathA, pathB) {
    if (security) {
        security.checkRead(pathA);
        security.checkRead(pathB);
    }
    // make canonical to resolve symbolic links
    pathA = canonical(pathA);
    pathB = canonical(pathB);
    // check inode to test hard links
    var POSIX = getPOSIX();
    var stat1 = POSIX.stat(pathA);
    var stat2 = POSIX.stat(pathB);
    return stat1.isIdentical(stat2);
}

/**
 * Returns whether two paths refer to an entity of the same file system.
 *
 * This function uses the POSIX <code>stat()</code> function to compare two
 * paths by checking if the associated devices are identical.
 *
 * @param {String} pathA the first path
 * @param {String} pathB the second path
 * @returns {Boolean} true if same file system, otherwise false
 * @see <a href="http://pubs.opengroup.org/onlinepubs/9699919799/functions/stat.html">POSIX <code>stat</code></a>
 */
function sameFilesystem(pathA, pathB) {
    if (security) {
        security.checkRead(pathA);
        security.checkRead(pathB);
    }
    // make canonical to resolve symbolic links
    pathA = canonical(pathA);
    pathB = canonical(pathB);
    var POSIX = getPOSIX();
    var stat1 = POSIX.stat(pathA);
    var stat2 = POSIX.stat(pathB);
    return stat1.dev() == stat2.dev();
}

/**
 * Returns the canonical path to a given abstract path. Canonical paths are both
 * absolute and intrinsic, such that all paths that refer to a given file
 * (whether it exists or not) have the same corresponding canonical path.
 * @param {String} path a file path
 * @returns {String} the canonical path
 */
function canonical(path) {
    return resolveFile(path).getCanonicalPath();
}

/**
 * Sets the modification time of a file or directory at a given path to a
 * specified time, or the current time. Creates an empty file at the given path
 * if no file or directory exists, using the default permissions.
 * @param {String} path the file path
 * @param {Date} mtime optional date
 */
function touch(path, mtime) {
    var file = resolveFile(path);
    if (!file.exists()) {
        return file.createNewFile();
    }
    return file.setLastModified(mtime || Date.now());
}

/**
 * Creates a symbolic link at the target path that refers to the source path.
 * The concrete implementation depends on the file system and the operating system.
 *
 * This function wraps the POSIX <code>symlink()</code> function, which may not work
 * on Microsoft Windows platforms.
 *
 * @param {String} source the source file
 * @param {String} target the target link
 * @see <a href="http://pubs.opengroup.org/onlinepubs/9699919799/functions/symlink.html">POSIX <code>symlink</code></a>
 */
function symbolicLink(source, target) {
    if (security) {
        security.checkRead(source);
        security.checkWrite(target);
    }
    var POSIX = getPOSIX();
    return POSIX.symlink(source, target);
}

/**
 * Creates a hard link at the target path that refers to the source path.
 * The concrete implementation depends on the file system and the operating system.
 *
 * This function wraps the POSIX <code>link()</code> function, which may not work
 * on Microsoft Windows platforms.
 *
 * @param {String} source the source file
 * @param {String} target the target file
 * @see <a href="http://pubs.opengroup.org/onlinepubs/9699919799/functions/link.html">POSIX <code>link</code></a>
 */
function hardLink(source, target) {
    if (security) {
        security.checkRead(source);
        security.checkWrite(target);
    }
    var POSIX = getPOSIX();
    return POSIX.link(source, target);
}

/**
 * Returns the immediate target of the symbolic link at the given `path`.
 *
 * This function wraps the POSIX <code>readlink()</code> function, which may not work
 * on Microsoft Windows platforms.
 *
 * @param {String} path a file path
 * @see <a href="http://pubs.opengroup.org/onlinepubs/9699919799/functions/readlink.html">POSIX <code>readlink</code></a>
 */
function readLink(path) {
    if (security) security.checkRead(path);
    var POSIX = getPOSIX();
    return POSIX.readlink(path);
}

/**
 * Returns a Rhino-specific generator that produces the file names of a directory.
 * There is no guarantee that the produced strings are in any specific order.
 * @param {String} path a directory path
 * @see <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Iterators_and_Generators">MDN Iterators and Generators</a>
 * @example // Iterates over the current working directory
 * for (var name in fs.iterate(".")) {
 *   console.log(name);
 * }
 */
function iterate(path) {
    var iter = function() {
        for each (var item in list(path)) {
            yield item;
        }
        throw StopIteration;
    }();
    // spec requires iterator(), native iterators/generators only have __iterator__().
    iter.iterator = iter.__iterator__;
    return iter;
}

/**
 * The Permissions class describes the permissions associated with a file.
 * @param {Number|Object} permissions a number or object representing the permissions.
 * @param {Function} constructor
 */
function Permissions(permissions, constructor) {
    if (!(this instanceof Permissions)) {
        return new Permissions(permissions, constructor);
    }
    this.update(Permissions['default']);
    this.update(permissions);
    /** @ignore */
    this.constructor = constructor;
}

/**
 * @param {Number|Object} permissions
 */
Permissions.prototype.update = function(permissions) {
    var fromNumber = typeof permissions == 'number';
    if (!fromNumber && !(permissions instanceof Object)) {
        return;
    }
    for each (var user in ['owner', 'group', 'other']) {
        this[user] = this[user] || {};
        for each (var perm in ['read', 'write', 'execute']) {
            this[user][perm] = fromNumber ?
                Boolean((permissions <<= 1) & 512) :
                Boolean(permissions[user] && permissions[user][perm]);
        }
    }
};

Permissions.prototype.toNumber = function() {
    var result = 0;
    for each (var user in ['owner', 'group', 'other']) {
        for each (var perm in ['read', 'write', 'execute']) {
            result <<= 1;
            result |= +this[user][perm];
        }
    }
    return result;
};

if (!Permissions['default']) {
    try {
        var POSIX = getPOSIX();
        // FIXME: no way to get umask without setting it?
        var umask = POSIX.umask(0022);
        if (umask != 0022) {
            POSIX.umask(umask);
        }
        Permissions['default'] = new Permissions(~umask & 0777);
    } catch (error) {
        Permissions['default'] = new Permissions(0755);
    }
}

/**
 * @param {String} path
 */
function permissions(path) {
    if (security) security.checkRead(path);
    var POSIX = getPOSIX();
    var stat = POSIX.stat(path);
    return new Permissions(stat.mode() & 0777);
}

/**
 * @param {String} path
 */
function owner(path) {
    if (security) security.checkRead(path);
    try {
        var POSIX = getPOSIX();
        var uid = POSIX.stat(path).uid();
        var owner = POSIX.getpwuid(uid);
        return owner ? String(owner.pw_name) : uid;
    } catch (error) {
        return null;
    }
}

/**
 * @param {String} path
 */
function group(path) {
    if (security) security.checkRead(path);
    try {
        var POSIX = getPOSIX();
        var gid = POSIX.stat(path).gid();
        var group = POSIX.getgrgid(gid);
        return group ? String(group.gr_name) : gid;
    } catch (error) {
        return null;
    }
}

/**
 * Changes the permissions of the specified file. This function wraps the
 * POSIX <code>chmod()</code> function.
 * @param {String} path
 * @param {Number|Object} permissions
 * @see <a href="http://pubs.opengroup.org/onlinepubs/9699919799/functions/chmod.html">POSIX <code>chmod</code></a>
 */
function changePermissions(path, permissions) {
    if (security) security.checkWrite(path);
    permissions = new Permissions(permissions);
    var POSIX = getPOSIX();
    var stat = POSIX.stat(path);
    // do not overwrite set-UID bits etc
    var preservedBits = stat.mode() & 07000;
    var newBits = permissions.toNumber();
    POSIX.chmod(path, preservedBits | newBits);
}

/**
 * Changes the owner of the specified file. This function wraps the
 * POSIX <code>chown()</code> function. Supports user name string as well
 * as uid number input.
 *
 * @param {String} path
 * @param {String|Number} owner the user name string or uid number
 * @see <a href="http://pubs.opengroup.org/onlinepubs/9699919799/functions/chown.html">POSIX <code>chown</code></a>
 */
function changeOwner(path, user) {
    if (security) security.checkWrite(path);
    var POSIX = getPOSIX();
    return POSIX.chown(path, typeof user === 'string' ?
            POSIX.getpwnam(user).pw_uid : user, -1);
}

/**
 * Changes the group of the specified file. This function wraps the
 * POSIX <code>chown()</code> function. Supports group name string
 * as well as gid number input.
 *
 * @param {String} path
 * @param {String|Number} group group name string or gid number
 * @see <a href="http://pubs.opengroup.org/onlinepubs/9699919799/functions/chown.html">POSIX <code>chown</code></a>
 */
function changeGroup(path, group) {
    if (security) security.checkWrite(path);
    var POSIX = getPOSIX();
    return POSIX.chown(path, -1, typeof group === 'string' ?
            POSIX.getgrnam(group).gr_gid : group);
}

var optionsMask = {
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
function checkOptions(options) {
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
        for (var key in options) {
            if (!(key in optionsMask)) {
                throw new Error("unsupported option: " + key);
            }
            options[key] = key == 'charset' ?
                    String(options[key]) : Boolean(options[key]);
        }
    }
    return options;
}

/**
 * Internal. Convert a mode string to an options object.
 */
function applyMode(mode) {
    var options = {};
    for (var i = 0; i < mode.length; i++) {
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
function resolveFile(path) {
    // Fix for http://bugs.sun.com/bugdatabase/view_bug.do?bug_id=4117557
    // relative files are not resolved against workingDirectory/user.dir in java,
    // making the file absolute makes sure it is resolved correctly.
    if (path == undefined) {
        throw new Error('undefined path argument');
    }
    var file = path instanceof File ? path : new File(String(path));
    return file.isAbsolute() ? file : file.getAbsoluteFile();
}


// Path object

/**
 * A shorthand for creating a new `Path` without the `new` keyword.
 */
function path() {
    return new Path(join.apply(null, arguments));
}

/**
 * Path constructor. Path is a chainable shorthand for working with paths.
 * @augments String
 */
function Path() {
    if (!(this instanceof Path)) {
        return new Path(join.apply(null, arguments));
    }
    var path = join.apply(null, arguments)
    this.toString = function() path;
    return this;
}

/** @ignore */
Path.prototype = new String();

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
            [this.toString()].concat(Array.slice(arguments))));
};

/**
 * Resolve against this path.
 */
Path.prototype.resolve = function () {
    return new Path(resolve.apply(
            null,
            [this.toString()].concat(Array.slice(arguments))
        )
    );
};

/**
 * Return the relative path from this path to the given target path. Equivalent
 * to `fs.Path(fs.relative(this, target))`.
 * @param {String} target
 */
Path.prototype.to = function (target) {
    return exports.Path(relative(this.toString(), target));
};

/**
 * Return the relative path from the given source path to this path. Equivalent
 * to `fs.Path(fs.relative(source, this))`.
 * @param {String} target
 */
Path.prototype.from = function (target) {
    return exports.Path(relative(target, this.toString()));
};

/**
 * Return the names of all files in this path, in lexically sorted order and
 * wrapped in Path objects.
 */
Path.prototype.listPaths = function() {
    return this.list().map(function (file) new Path(this, file), this).sort();
};

var pathed = [
    'absolute',
    'base',
    'canonical',
    'directory',
    'normal',
    'relative'
];

for (var i = 0; i < pathed.length; i++) {
    var name = pathed[i];
    Path.prototype[name] = (function (name) {
        return function () {
            return new Path(exports[name].apply(
                this,
                [this.toString()].concat(Array.slice(arguments))
            ));
        };
    })(name);
}

var trivia = [
    'copy',
    'copyTree',
    'exists',
    'extension',
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

for (i = 0; i < trivia.length; i++) {
    var name = trivia[i];
    Path.prototype[name] = (function (name) {
        return function () {
            var fn = exports[name];
            if (!fn) throw new Error("Not found: " + name);
            var result = exports[name].apply(
                this,
                [this.toString()].concat(Array.slice(arguments))
            );
            if (result === undefined)
                result = this;
            return result;
        };
    })(name);
}
