/**
 * @fileoverview <p>This module provides an implementation of "fs-base" as
 * defined by the <a href="http://wiki.commonjs.org/wiki/Filesystem/A/0">CommonJS
 * Filesystem/A/0</a> proposal.
 */

include('io');
include('binary');
require('core/array');

module.shared = true;

export('canonical',
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

var File = java.io.File,
    FileInputStream = java.io.FileInputStream,
    FileOutputStream = java.io.FileOutputStream;

var SEPARATOR = File.separator;

var POSIX;

function getPOSIX() {
    POSIX = POSIX || org.ringojs.wrappers.POSIX.getPOSIX();
    return POSIX;
}

function openRaw(path, mode, permissions) {
    // TODO many things missing here
    var file = resolveFile(path);
    mode = mode || {};
    var {read, write, append, create, exclusive, truncate} = mode;
    if (!read && !write && !append) {
        read = true;
    }
    if (read) {
        return new Stream(new FileInputStream(file));
    } else {
        return new Stream(FileOutputStream(file, Boolean(append)));
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

function workingDirectory() {
    return java.lang.System.getProperty('user.dir') + SEPARATOR;
}

function changeWorkingDirectory(path) {
    path = new File(path).getCanonicalPath();
    java.lang.System.setProperty('user.dir', path);
}

function removeDirectory(path) {
    var file = resolveFile(path);
    if (!file['delete']()) {
        throw new Error("failed to remove directory " + path);
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

function size(path) {
    var file = resolveFile(path);
    return file.length();
}

function lastModified(path) {
    var file = resolveFile(path);
    return new Date(file.lastModified());
}

function makeDirectory(path, permissions) {
    permissions = permissions != null ?
            new Permissions(permissions) : Permissions["default"];
    var POSIX = getPOSIX();
    if (POSIX.mkdir(path, permissions.toNumber()) != 0) {
        throw new Error("failed to make directory " + path);
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

function isLink(target) {
    var POSIX = getPOSIX();
    var stat = POSIX.lstat(target);
    return stat.isSymlink();
}

function same(pathA, pathB) {
    var POSIX = getPOSIX();
    var stat1 = POSIX.stat(pathA);
    var stat2 = POSIX.stat(pathB);
    return stat1.isIdentical(stat2);
}

function sameFilesystem(pathA, pathB) {
    var POSIX = getPOSIX();
    var stat1 = POSIX.stat(pathA);
    var stat2 = POSIX.stat(pathB);
    return stat1.dev() == stat2.dev();
}

function canonical(path) {
    return resolveFile(path).getCanonicalPath();
}

function touch(path, mtime) {
    mtime = mtime || Date.now();
    return resolveFile(path).setLastModified(mtime);
}

function symbolicLink(source, target) {
    var POSIX = getPOSIX();
    return POSIX.symlink(source, target);
}

function hardLink(source, target) {
    var POSIX = getPOSIX();
    return POSIX.link(source, target);
}

function readLink(path) {
    var POSIX = getPOSIX();
    return POSIX.readlink(path);
}

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

function Permissions(permissions, constructor) {
    if (!(this instanceof Permissions)) {
        return new Permissions(permissions, constructor);
    }
    this.update(Permissions['default']);
    this.update(permissions);
    this.constructor = constructor;
}

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

function permissions(path) {
    var POSIX = getPOSIX();
    var stat = POSIX.stat(path);
    return new Permissions(stat.mode() & 0777);
}

function owner(path) {
    try {
        var POSIX = getPOSIX();
        var uid = POSIX.stat(path).uid();
        var owner = POSIX.getpwuid(uid);
        return owner ? owner.pw_name : uid;
    } catch (error) {
        return null;
    }
}

function group(path) {
    try {
        var POSIX = getPOSIX();
        var gid = POSIX.stat(path).gid();
        var group = POSIX.getgrgid(gid);
        return group ? group.gr_name : gid;
    } catch (error) {
        return null;
    }
}

function changePermissions(path, permissions) {
    permissions = new Permissions(permissions);
    var POSIX = getPOSIX();
    var stat = POSIX.stat(path);
    // do not overwrite set-UID bits etc
    var preservedBits = stat.mode() & 07000;
    var newBits = permissions.toNumber();
    POSIX.chmod(path, preservedBits | newBits);
}

// Supports user name string as well as uid int input.
function changeOwner(path, user) {
    var POSIX = getPOSIX();
    return POSIX.chown(path, typeof user === 'string' ?
            POSIX.getpwnam(user).pw_uid : user, -1);
}

// Supports group name string as well as gid int input.
function changeGroup(path, group) {
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
    // relative files are not resolved against workingDirectory/user.dir in java,
    // making the file absolute makes sure it is resolved correctly.
    if (path == undefined) {
        throw new Error('undefined path argument');
    }
    var file = file instanceof File ? file : new File(String(path));
    return file.isAbsolute() ? file : file.getAbsoluteFile();
}
