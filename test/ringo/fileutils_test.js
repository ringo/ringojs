var assert = require("assert");
var fileutils = require('ringo/fileutils');
var fs = require('fs');

const PARENT = '/home/ringo/';
const INVALID_CHILD = 'Projects';
const VALID_CHILD = './' + INVALID_CHILD;
const FOO = 'foo';

exports.testResolveUri = function () {
    assert.strictEqual(PARENT + INVALID_CHILD, fileutils.resolveUri(PARENT,
            INVALID_CHILD)); // Should work for both child notations.
    assert.strictEqual(PARENT + INVALID_CHILD, fileutils.resolveUri(PARENT,
            VALID_CHILD));
    assert.strictEqual(PARENT + FOO, fileutils.resolveUri(PARENT, VALID_CHILD, FOO));
};

exports.testResolveId = function () {
    assert.strictEqual(fs.resolve(PARENT, VALID_CHILD), fileutils.resolveId(
            PARENT, VALID_CHILD)); // Child must start w/ ".".
    assert.notStrictEqual(fs.resolve(PARENT, INVALID_CHILD), fileutils.
            resolveId(PARENT, INVALID_CHILD));
    assert.strictEqual(INVALID_CHILD, fileutils.resolveId(PARENT,
            INVALID_CHILD)); // Otherwise return child (unchanged).
};

exports.testCreateTempFile = function () {
    var tempFile = fileutils.createTempFile('ringo');
    assert.isNotNull(tempFile); // Creation w/ prefix only.
    assert.isTrue(/^.*\/ringo.*$/.test(tempFile));
    fs.remove(tempFile);
    tempFile = fileutils.createTempFile('ringo', '.js');
    assert.isNotNull(tempFile); // Creation incl. suffix.
    assert.isTrue(/^.*\/ringo.*\.js$/.test(tempFile));
    fs.remove(tempFile);
    assert.throws(function () fileutils.createTempFile('ri'), java.lang.
            IllegalArgumentException); // Prefix must be at least 3 chars long.
};
