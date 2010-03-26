include('ringo/unittest');
var fileutils = require('ringo/fileutils');
var fs = require('fs-base');

const PARENT = '/home/ringo/';
const INVALID_CHILD = 'Projects';
const VALID_CHILD = './' + INVALID_CHILD;
const FOO = 'foo';

exports.testResolveUri = function () {
    assertEqual(PARENT + INVALID_CHILD, fileutils.resolveUri(PARENT,
            INVALID_CHILD)); // Should work for both child notations.
    assertEqual(PARENT + INVALID_CHILD, fileutils.resolveUri(PARENT,
            VALID_CHILD));
    assertEqual(PARENT + FOO, fileutils.resolveUri(PARENT, VALID_CHILD, FOO));
};

exports.testResolveId = function () {
    assertEqual(fs.resolve(PARENT, VALID_CHILD), fileutils.resolveId(
            PARENT, VALID_CHILD)); // Child must start w/ ".".
    assertNotEqual(fs.resolve(PARENT, INVALID_CHILD), fileutils.
            resolveId(PARENT, INVALID_CHILD));
    assertEqual(INVALID_CHILD, fileutils.resolveId(PARENT,
            INVALID_CHILD)); // Otherwise return child (unchanged).
};

exports.testCreateTempFile = function () {
    var tempFile = fileutils.createTempFile('ringo');
    assertNotNull(tempFile); // Creation w/ prefix only.
    assertTrue(/^.*\/ringo.*$/.test(tempFile));
    fs.remove(tempFile);
    tempFile = fileutils.createTempFile('ringo', '.js');
    assertNotNull(tempFile); // Creation incl. suffix.
    assertTrue(/^.*\/ringo.*\.js$/.test(tempFile));
    fs.remove(tempFile);
    assertThrows(function () fileutils.createTempFile('ri'), java.lang.
            IllegalArgumentException); // Prefix must be at least 3 chars long.
};
