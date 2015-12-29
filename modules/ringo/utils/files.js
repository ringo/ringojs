/**
 * @fileOverview A collection of file related utilities not covered by
 * the CommonJS standard <a href="../../../fs/index.html">fs</a> module.
 */

var arrays = require('ringo/utils/arrays');
var fs = require('fs');

export ('resolveUri', 'resolveId', 'isHidden', 'createTempFile', 'roots', 'separator', 'PosixPermissions');

var File = java.io.File;

/**
 * Resolve an arbitrary number of path elements relative to each other.
 * This is an adapted version of the file module's resolve function that always
 * and strictly uses forward slashes as file separators. This makes it
 * usable for resolving URI paths as well as module ids and resource paths.
 * Originally adapted for helma/file from narwhal's file module.
 * @param {...} arbitrary number of path elements
 */
function resolveUri() {
    var root = '';
    var elements = [];
    var leaf = '';
    var path;
    var SEPARATOR = '/';
    var SEPARATOR_RE = /\//;
    for (var i = 0; i < arguments.length; i++) {
        path = String(arguments[i]);
        if (path.trim() == '') {
            continue;
        }
        var parts = path.split(SEPARATOR_RE);
        if (path[0] == '/') {
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

/**
 * Resolve path fragment child relative to parent but only
 * if child is a a relative path according to the CommonJS Modules
 * spec, i.e. starts with "." or "..". Otherwise, the child path
 * is returned unchanged.
 *
 * @param {String} parent the parent path
 * @param {String} child the child path
 */
function resolveId(parent, child) {
    // only paths starting with "." or ".." are relative according to module spec
    var path = child.split("/");
    if (path[0] == "." || path[0] == "..") {
        // we support absolute paths for module ids. Since absolute
        // paths are platform dependent, use the file module's version
        // of resolve() for these instead of resolveUri().
        return fs.isAbsolute(parent) ?
               fs.resolve(parent, child) : resolveUri(parent, child);
    }
    // child is not relative according to module spec, return it as-is
    return child;
}

/**
 * Create a new empty temporary file in the default directory for temporary files.
 * @param {String} prefix the prefix of the temporary file; must be at least three characters long
 * @param {String} suffix the suffix of the temporary file; may be undefined or null
 * @param {String} directory optional directory in which to create the file. Pass undefined
 *                 to use the system's default location for temporary files
 * @returns {File} the temporary file
 */
function createTempFile(prefix, suffix, directory) {
    suffix = suffix || null;
    directory = directory ? new File(directory) : null;
    return File
        .createTempFile(prefix, suffix, directory)
        .getPath();
}

/**
 * Tests whether the file represented by this File object is a hidden file.
 * What constitutes a hidden file may depend on the platform we are running on.
 * @param {String} file
 * @returns {Boolean} true if this File object is hidden
 */
function isHidden(file) {
    return new File(file).isHidden();
}

/**
 * An Array containing the system's file system roots. On UNIX platforms
 * this contains a single "/" directory, while on Windows platforms this
 * contains an element for each mounted drive.
 * @type Array
 */
var roots = File.listRoots().map(String);

/**
 * The system-dependent file system separator character.
 * @type String
 */
var separator = File.separator;


/**
 * Internal use only!
 * Converts a octal digit into a string in symbolic notation.
 * @ignore
 */
var octalDigitToSymbolic = function(octalPart) {
    switch (octalPart) {
        case 0: return "---";
        case 1: return "--x";
        case 2: return "-w-";
        case 3: return "-wx";
        case 4: return "r--";
        case 5: return "r-x";
        case 6: return "rw-";
        case 7: return "rwx";
    }

    throw "Invalid permission number!";
};

/**
 * Internal use only!
 * Converts a symbolic notation string into an octal digit.
 * @ignore
 */
var symbolicToOctalDigit = function(stringPart) {
    switch (stringPart) {
        case "---": return 0;
        case "--x": return 1;
        case "-w-": return 2;
        case "-wx": return 3;
        case "r--": return 4;
        case "r-x": return 5;
        case "rw-": return 6;
        case "rwx": return 7;
    }

    throw "Invalid POSIX string!";
};

/**
 * Internal use only!
 * Converts octal number permissions into the symbolic representation.
 * @ignore
 */
var octalToSymbolicNotation = function(octal) {
    return [
        octalDigitToSymbolic(octal >> 6),
        octalDigitToSymbolic((octal >> 3) & 0007),
        octalDigitToSymbolic(octal & 0007)
    ].join("");
};

/**
 * Internal use only!
 * Converts symbolic represented permissions into the octal notation.
 * @ignore
 */
var symbolicToOctalNotation = function(symbolic) {
    if (symbolic.length !== 9) {
        throw "Invalid POSIX permission string: " + symbolic;
    }

    return (symbolicToOctalDigit(symbolic.substring(0,3)) << 6) +
        (symbolicToOctalDigit(symbolic.substring(3,6)) << 3) +
        symbolicToOctalDigit(symbolic.substring(6,9));
};

/**
 * Internal use only!
 * @ignore
 */
var enumToOctalNotation = function(javaEnumSet) {
    return symbolicToOctalNotation(java.nio.file.attribute.PosixFilePermissions.toString(javaEnumSet));
};

/**
 * This class holds POSIX file permissions and can be used to manipulate permissions on
 * POSIX-compatible systems with the Java NIO.2 API.
 * @param {Number|String|java.util.Set<PosixFilePermission>} permissions the POSIX permissions
 * @returns {PosixPermissions}
 * @constructor
 */
function PosixPermissions(permissions) {
    if (!(this instanceof PosixPermissions)) {
        return new PosixPermissions(permissions);
    }

    // internal holder of the value
    var _octalValue;

    Object.defineProperty(this, "value", {
        configurable: false,
        enumerable: true,
        get: function() { return _octalValue; },
        set: function(newValue) {
            if (typeof newValue === "number") {
                if (newValue < 0 || newValue > 0777) {
                    throw "Invalid numeric octal permission: " + newValue.toString(8);
                }

                _octalValue = newValue;
            } else if (typeof newValue === "string") {
                _octalValue = symbolicToOctalNotation(newValue);
            } else if (newValue instanceof java.util.Set) {
                _octalValue = enumToOctalNotation(newValue);
            } else {
                throw "Permissions need to be of type number or string!";
            }
        }
    });

    this.value = permissions;

    this.toString = function() {
        return "[PosixPermissions " + octalToSymbolicNotation(this.value) + "]";
    };

    return this;
}

/**
 * Returns a Java file attribute representing the POSIX permissions suitable for NIO.2 methods.
 * @returns {java.nio.file.attribute.FileAttribute} an object that encapsulates PosixFilePermissions
 */
PosixPermissions.prototype.toJavaFileAttribute = function() {
    return java.nio.file.attribute.PosixFilePermissions.asFileAttribute(
        java.nio.file.attribute.PosixFilePermissions.fromString(octalToSymbolicNotation(this.value))
    );
};

/**
 * Returns a set of Java POSIX permissions suitable for NIO.2 methods.
 * @returns {java.util.Set<PosixFilePermission>} a set of permissions
 */
PosixPermissions.prototype.toJavaPosixFilePermissionSet = function() {
    return java.nio.file.attribute.PosixFilePermissions.fromString(octalToSymbolicNotation(this.value));
};
