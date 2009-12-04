include('io');
include('binary');
require('core/array');

var File = java.io.File,
    FileInputStream = java.io.FileInputStream,
    FileOutputStream = java.io.FileOutputStream;

export('absolute',
       'basename',
       'canonical',
       'chdir',
       'chmod',
       'copy',
       'copyTree',
       'cwd',
       'dirname',
       'exists',
       'extension',
       'isRelative',
       'isAbsolute',
       'isDirectory',
       'isFile',
       'isReadable',
       'isWritable',
       'join',
       'list',
       'listPaths',
       'mkdir',
       'mkdirs',
       'move',
       'mtime',
       'normal',
       'open',
       'read',
       'relative',
       'remove',
        // 'rename',
       'resolve',
       'rmdir',
       'rmtree',
       'size',
       'split',
        // 'stat',
       'symlink',
       'touch',
       'write',
       'path',
       'Path');

var SEPARATOR = File.separator;
var SEPARATOR_RE = SEPARATOR == '/' ?
                   new RegExp(SEPARATOR) :
                   new RegExp(SEPARATOR.replace("\\", "\\\\") + "|/");

function open(path, mode, options) {
    options = checkOptions(mode, options);
    var file = resolveFile(path);
    var {read, write, append, update, binary, charset} = options;
    if (!read && !write && !append && !update) {
        read = true;
    }
    var stream = new Stream(read ?
            new FileInputStream(file) : new FileOutputStream(file, Boolean(append)));
    if (binary) {
        return stream;
    } else if (read || write || append) {
        return new TextStream(stream, charset);
    } else if (update) {
        throw new Error("update not yet implemented");
    }
}

function read(path, options) {
    var stream = open(path, 'r', options);
    try {
        return stream.read();
    } finally {
        stream.close();
    }
}

function write(path, content, options) {
    var mode = content instanceof Binary ? 'wb' : 'w';
    var stream = open(path, mode, options);
    try {
        stream.write(content);
        stream.flush();
    } finally {
        stream.close();
    }
}

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

function copyTree(from, to) {
    var source = resolveFile(from);
    var target = resolveFile(to);
    if (isDirectory(from)) {
        mkdirs(target);
        var files = list(source);
        for each (var file in files) {
            copyTree(join(source, file), join(target, file));
        }
    } else {
        copy(source, target);
    }
}

function move(from, to) {
    var source = resolveFile(from);
    var target = resolveFile(to);
    if (!source.renameTo(target)) {
        throw new Error("failed to move file from " + from + " to " + to);
    }
}

function remove(path) {
    var file = resolveFile(path);
    if (!file['delete']()) {
        throw new Error("failed to remove file " + path);
    }
}

function exists(path) {
    var file = resolveFile(path);
    return file.exists();
}

function cwd() {
    return java.lang.System.getProperty('user.dir');
}

function chdir(path) {
    path = new File(path).getCanonicalPath();
    java.lang.System.setProperty('user.dir', path);
}

function chmod(path, mode) {
    try {
        var POSIX = org.jruby.ext.posix.POSIXFactory.getPOSIX(
                new JavaAdapter(org.jruby.ext.posix.POSIXHandler, {}), true);
        return POSIX.chmod(path, mode);
    } catch (error) {
        return -1;
    }
}

function symlink(source, target) {
    if (isRelative(source))
        source = relative(target, source);
    try {
        var POSIX = org.jruby.ext.posix.POSIXFactory.getPOSIX(
                new JavaAdapter(org.jruby.ext.posix.POSIXHandler, {}), true);
        return POSIX.symlink(source, target);
    } catch (error) {
        return -1;
    }
}

function rmdir(path) {
    var file = resolveFile(path);
    if (!file['delete']()) {
        throw new Error("failed to remove directory " + path);
    }
}

function rmtree(path) {
    var file = resolveFile(path);
    if (file.isDirectory()) {
        Array.forEach(file.list(), function(child) {
            rmtree(join(file, child));
        })
    }
    if (!file['delete']()) {
        throw new Error("failed to remove " + path);
    }
}

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

function listPaths(path) {
    return list(path).map(function(p) {
        return new Path(join(path, p));
    });
}

function size(path) {
    var file = resolveFile(path);
    return file.length();
}

function mtime(path) {
    var file = resolveFile(path);
    return new Date(file.lastModified());
}

function mkdir(path) {
    var file = resolveFile(path);
    if (!file.isDirectory() && !file.mkdir()) {
        throw new Error("failed to make directory " + path);
    }
}

function mkdirs(path) {
    var file = resolveFile(path);
    if (!file.isDirectory() && !file.mkdirs()) {
        throw new Error("failed to make directories " + path);
    }
}

function isReadable(path) {
    return resolveFile(path).canRead();
}

function isWritable(path) {
    return resolveFile(path).canWrite();
}

function isFile(path) {
    return resolveFile(path).isFile();
}

function isDirectory(path) {
    return resolveFile(path).isDirectory();
}

function isAbsolute(path) {
    return new File(path).isAbsolute();
}

function isRelative(path) {
    return !isAbsolute(path);
}

function absolute(path) {
    return resolve(join(cwd(), ''), path);
}

function canonical(path) {
    return resolveFile(path).getCanonicalPath();
}

function basename(path, ext) {
    var name = split(path).peek();
    if (ext && name) {
        var diff = name.length - ext.length;
        if (diff > -1 && name.lastIndexOf(ext) == diff) {
            return name.substring(0, diff);
        }
    }
    return name;
}

function dirname(path) {
    return new File(path).getParent() || '.';
}

function extension(path) {
    var name = basename(path);
    if (!name) {
        return '';
    }
    name = name.replace(/^\.+/, '');
    var index = name.lastIndexOf('.');
    return index > 0 ? name.substring(index) : '';
}

function join() {
    return normal(Array.join(arguments, SEPARATOR));
}

function split(path) {
    if (!path) {
        return [];
    }
    return String(path).split(SEPARATOR_RE);
}

function touch(path, mtime) {
    mtime = mtime || Date.now();
    return resolveFile(path).setLastModified(mtime);

}

// adapted from narwhal
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
        if (isAbsolute(path)) {
            // path is absolute, throw away everyting we have so far
            root = parts.shift() + SEPARATOR;
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
                if (elements.length > 0 && elements.peek() != '..') {
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

// adapted from narwhal
function relative(source, target) {
    if (!target) {
        target = source;
        source = cwd() + '/';
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

function normal(path) {
    return resolve(path);
}

function path() {
    return new Path(join.apply(null, arguments));
}

function Path(path) {
    if (!(this instanceof Path)) {
        return new Path(path);
    }
    this.toString = function() path;
    return this;
}

Path.prototype.join = function() {
    return new Path(join.apply(null,
            [this.toString()].concat(Array.slice(arguments))));
};

Path.prototype.resolve = function () {
    return new Path(resolve.apply(
            null,
            [this.toString()].concat(Array.slice(arguments))
        )
    );
};

var pathed = [
    'absolute',
    'basename',
    'canonical',
    'dirname',
    'normal',
    'relative'
];

for (var i = 0; i < pathed.length; i++) {
    var name = pathed[i];
    Path.prototype[name] = (function (name) {
        return function () {
            return new Path(exports[name].apply(
                this,
                [this.toString()].concat(Array.prototype.slice.call(arguments))
            ));
        };
    })(name);
}

var trivia = [
    'basename',
    'chmod',
    // 'chown',
    'copy',
    'copyTree',
    'exists',
    'extension',
    'isDirectory',
    'isFile',
    // 'isLink',
    'isReadable',
    'isWritable',
    // 'link',
    // 'linkExists',
    'list',
    'listPaths',
    // 'listTree',
    'mkdir',
    'mkdirs',
    'move',
    'mtime',
    'open',
    'read',
    'remove',
    'rename',
    'rmdir',
    'rmtree',
    'size',
    'split',
    // 'stat',
    'symlink',
    'touch',
    'write'
];

for (i = 0; i < trivia.length; i++) {
    var name = trivia[i];
    Path.prototype[name] = (function (name) {
        return function () {
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

function checkOptions(mode, options) {
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
    if (typeof mode == 'string') {
        // apply mode string to options object
        applyMode(mode, options);
    }
    return options;
}

// apply mode string to options object
function applyMode(mode, options) {
    options = options || {};
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
            options.exclusive = true;
            break;
        case 'c':
            options.canonical = true;
            break;
        default:
            throw new Error("unsupported mode argument: " + options);
        }
    }
    return options;
}

function resolveFile(path) {
    // Fix for http://bugs.sun.com/bugdatabase/view_bug.do?bug_id=4117557
    // relative files are not resolved against cwd/user.dir in java,
    // making the file absolute makes sure it is resolved correctly.
    if (path == undefined) {
        throw new Error('undefined path argument');
    }
    var file = new File(String(path));
    return file.isAbsolute() ? file : file.getAbsoluteFile();
}