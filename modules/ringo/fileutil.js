var file = require("file");

/**
 * @fileOverview A collection of file related utilities.
 */

export ('resolveRelative', 'createTempFile');

/**
 * Resolve path fragment child relative to parent but only
 * if child is a a relative path according to the Securable Modules
 * spec, i.e. starts with "." or "..". Otherwise, the child path
 * is returned unchanged.
 *
 * @param {String} parent the parent path
 * @param {String} child the child path
 */
function resolveRelative(parent, child) {
    return child.startsWith(".") ?
           file.resolve(parent, child) : child;
}

/**
 * Create a new empty temporary file in the default directory for temporary files.
 * @param {String} prefix the prefix of the temporary file; must be at least three characters long
 * @param {String} suffix the suffix of the temporary file; may be null
 * @returns {File} the temporary file
 */
function createTempFile(prefix, suffix) {
   return java.io.File.createTempFile(prefix, suffix).getPath();
}