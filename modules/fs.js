/**
 * @fileoverview <p>This module provides an implementation of "fs" as
 * defined by the <a href="http://wiki.commonjs.org/wiki/Filesystem/A">CommonJS
 * Filesystem/A</a> proposal.
 */

var fsBase = require('fs-base');
include('io');

module.shared = true;

var File = java.io.File,
    FileInputStream = java.io.FileInputStream,
    FileOutputStream = java.io.FileOutputStream;

var SEPARATOR = File.separator;
var SEPARATOR_RE = SEPARATOR == '/' ?
                   new RegExp(SEPARATOR) :
                   new RegExp(SEPARATOR.replace("\\", "\\\\") + "|/");

// copy exports from fs-base
for each (var key in Object.keys(fsBase)) {
    exports[key] = fsBase[key];
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
       'normal',
       'open',
       'path',
       'Path',
       'read',
       'relative',
       'removeTree',
       'resolve',
       'write',
       'split');


function open(path, options) {
    options = checkOptions(options);
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
    if (source.isDirectory()) {
        makeTree(target);
        var files = source.list();
        for each (var file in files) {
            copyTree(join(source, file), join(target, file));
        }
    } else {
        copy(source, target);
    }
}

function makeTree(path) {
    var file = resolveFile(path);
    if (!file.isDirectory() && !file.mkdirs()) {
        throw new Error("failed to make tree " + path);
    }
}

function removeTree(path) {
    var file = resolveFile(path);
    // do not follow symlinks
    if (file.isDirectory() && !fsBase.isLink(file.getPath())) {
        for each (var child in file.list()) {
            removeTree(join(file, child));
        }
    }
    if (!file['delete']()) {
        throw new Error("failed to remove " + path);
    }
}

// non-standard/non-spec
function isAbsolute(path) {
    return new File(path).isAbsolute();
}

// non-standard/non-spec
function isRelative(path) {
    return !isAbsolute(path);
}

function absolute(path) {
    return resolve(fsBase.workingDirectory(), path);
}

function base(path, ext) {
    var name = split(path).peek();
    if (ext && name) {
        var diff = name.length - ext.length;
        if (diff > -1 && name.lastIndexOf(ext) == diff) {
            return name.substring(0, diff);
        }
    }
    return name;
}

function directory(path) {
    return new File(path).getParent() || '.';
}

function extension(path) {
    var name = base(path);
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

function normal(path) {
    return resolve(path);
}

// Adapted from Narwhal.
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
        source = fsBase.workingDirectory();
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

// convert mode string to options object
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
    // relative files are not resolved against workingDirectory/user.dir in java,
    // making the file absolute makes sure it is resolved correctly.
    if (path == undefined) {
        throw new Error('undefined path argument');
    }
    var file = file instanceof File ? file : new File(String(path));
    return file.isAbsolute() ? file : file.getAbsoluteFile();
}


// Path object

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

Path.prototype = new String();

Path.prototype.valueOf = function() {
    return this.toString();
};

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

Path.prototype.to = function (target) {
    return exports.Path(relative(this.toString(), target));
};

Path.prototype.from = function (target) {
    return exports.Path(relative(target, this.toString()));
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
                [this.toString()].concat(Array.prototype.slice.call(arguments))
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
    'iterateTree',
    'lastModified',
    'link',
    'list',
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


