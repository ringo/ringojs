include('ringo/unittest');
var fileutils = require('ringo/fileutils');
import('file');

const PARENT = '/home/ringo/';
const INVALID_CHILD = 'Projects';
const VALID_CHILD = './' + INVALID_CHILD;

exports.testResolveRelative = function () {
    assertEqual(file.resolve(PARENT, VALID_CHILD), fileutils.resolveRelative(
            PARENT, VALID_CHILD)); // Child must start w/ ".".
    assertNotEqual(file.resolve(PARENT, INVALID_CHILD), fileutils.
            resolveRelative(PARENT, INVALID_CHILD));
    assertEqual(INVALID_CHILD, fileutils.resolveRelative(PARENT,
            INVALID_CHILD)); // Otherwise return child (unchanged).
};

exports.testCreateTempFile = function () {
    var tempFile = fileutils.createTempFile('ringo');
    assertNotNull(tempFile); // Creation w/ prefix only.
    assertTrue(/^.*\/ringo.*$/.test(tempFile));
    tempFile = fileutils.createTempFile('ringo', '.js');
    assertNotNull(tempFile); // Creation incl. suffix.
    assertTrue(/^.*\/ringo.*\.js$/.test(tempFile));
    assertThrows(function () fileutils.createTempFile('ri'), java.lang.
            IllegalArgumentException); // Prefix must be at least 3 chars long.
};
