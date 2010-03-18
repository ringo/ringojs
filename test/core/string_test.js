include('ringo/unittest');
require('core/string');

const DATE_FORMAT = 'MM\'/\'dd\'/\'yyyy';
const DATE = '10/10/2010';
const URL = 'http://ringojs.org/';
const HEX_COLOR = 'd3d3d3';
const FOO = 'foo';
const NUM = '123';
const FOO_BASE64 = 'Zm9v';
const NUM_BASE64 = 'MTIz';

exports.testIsDateFormat = function () {
    assertTrue(DATE_FORMAT.isDateFormat());
    assertFalse(FOO.isDateFormat());
};

exports.testToDate = function () {
    var date = DATE.toDate(DATE_FORMAT);
    assertTrue(date instanceof Date);
    assertEqual(new Date(DATE), date);
    assertThrows(function () DATE.toDate(FOO), java.lang.
            IllegalArgumentException); // Invalid date format.
};

exports.testIsUrl = function () {
    assertTrue(URL.isUrl());
    assertFalse(FOO.isUrl());
};

exports.testIsFileName = function () {
    assertTrue('ringo.js'.isFileName());
    assertFalse(URL.isFileName());
};

exports.testToFileName = function () {
    var fileName = URL.toFileName();
    assertNotNull(fileName);
    assertTrue(fileName.isFileName());
};

exports.testIsHexColor = function () {
    assertTrue(('#' + HEX_COLOR).isHexColor());
    assertTrue(HEX_COLOR.isHexColor());
    assertFalse(FOO.isHexColor());
};

exports.testToHexColor = function () {
    assertEqual(HEX_COLOR, 'rgb (211, 211, 211)'.toHexColor());
};

exports.testIsAlphanumeric = function () {
    assertTrue((FOO + NUM).isAlphanumeric());
    assertTrue(FOO.isAlphanumeric());
    assertFalse(URL.isAlphanumeric());
};

exports.testToAlphanumeric = function () {
    var alphanumeric = URL.toAlphanumeric();
    assertNotNull(alphanumeric);
    assertTrue(alphanumeric.isAlphanumeric());
};

exports.testIsAlpha = function () {
    assertTrue(FOO.isAlpha());
    assertFalse(NUM.isAlpha());
    assertFalse((NUM + FOO).isAlpha());
};

exports.testIsNumeric = function () {
    assertTrue(NUM.isNumeric());
    assertFalse(FOO.isNumeric());
    assertFalse((FOO + NUM).isNumeric());
};

exports.testToCamelCase = function() {
    assertEqual('fooBarBaz', 'foo-BAR_baz'.toCamelCase());
    assertEqual('fooBarBaz', 'foo BAR baz'.toCamelCase());
    assertEqual('fooBarBaz', 'foo\nBAR\tbaz'.toCamelCase());
    assertEqual('fooBar123baz', 'foo-bar-123baz'.toCamelCase());
    assertEqual('fooBar123Baz', 'foo-bar-123BAZ'.toCamelCase());
    assertEqual('fooBar123Baz', 'foo-bar-123-BAZ'.toCamelCase());
};

exports.testCapitalize = function () {
    assertEqual('Capitalize me.', 'capitalize me.'.capitalize());
};

exports.testTitleize = function () {
    assertEqual('Titleize Me', 'titleize me'.titleize());
};

exports.testEntitize = function () {
    assertEqual('&#102;&#111;&#111;', FOO.entitize());
};

exports.testGroup = function () {
    assertEqual(FOO.slice(0, 1) + NUM + FOO.slice(1, 2) + NUM + FOO.slice(2) +
            NUM, FOO.group(1, NUM));
};

exports.testUnwrap = function () {
    assertEqual(FOO + FOO + FOO, (FOO + '\n' + FOO).unwrap(true, FOO));
};

exports.testDigest = function () {
    assertEqual('acbd18db4cc2f85cedef654fccc4a4d8', FOO.digest());
};

exports.testRepeat = function () {
    assertEqual(FOO, FOO.repeat(1));
    assertEqual(FOO + FOO, FOO.repeat(2));
};

exports.testStartsWith = function () {
    assertTrue((FOO + NUM).startsWith(FOO));
    assertFalse((NUM + FOO).startsWith(FOO));
};

exports.testEndsWith = function () {
    assertTrue((NUM + FOO).endsWith(FOO));
    assertFalse((FOO + NUM).endsWith(FOO));
};

exports.testPad = function () { // TODO: validate behaviour resp. rework this.
    assertEqual(FOO + NUM + NUM, FOO.pad(NUM, 5, 1));
};

exports.testContains = function () {
    assertTrue((FOO + NUM + FOO).contains(NUM));
    assertFalse((FOO + FOO).contains(NUM));
};

exports.testGetCommonPrefix = function () {
    assertEqual(URL, (URL + FOO).getCommonPrefix(URL + NUM));
};

exports.testIsEmail = function () {
    assertTrue('hannes@helma.at'.isEmail());
    assertFalse('hannes[at]helma.at'.isEmail());
};

exports.testCount = function () {
    assertEqual(3, (FOO + FOO + FOO).count(FOO));
    assertEqual(3, (FOO + FOO + NUM + FOO).count(FOO));
};

exports.testEnbase64 = function () {
    assertEqual(FOO_BASE64, FOO.enbase64());
    assertEqual(FOO_BASE64 + NUM_BASE64, (FOO + NUM).enbase64());
};

exports.testDebase64 = function () {
    assertEqual(FOO, FOO_BASE64.debase64());
    assertEqual(FOO + NUM, (FOO_BASE64 + NUM_BASE64).debase64());
};

exports.testStripTags = function () {
    assertEqual('content', '<tag>content</tag>'.stripTags());
};

exports.testEscapeHtml = function () {
    assertEqual('&lt;p&gt;Some text.&lt;/p&gt;', '<p>Some text.</p>'.
            escapeHtml());
};

exports.testSorter = function () {
    // TODO: do we really need/want this?
};

exports.testCompose = function () {
    assertEqual(FOO + NUM + FOO + FOO, String.compose(FOO, NUM, FOO, FOO));
};

exports.testRandom = function () {
    assertTrue(typeof String.random() === 'string');
    assertEqual(5, String.random(5).length);
};

exports.testJoin = function () {
    assertEqual(FOO + NUM, String.join(FOO, NUM));
    assertEqual(FOO + NUM + FOO, String.join(FOO, FOO, NUM));
};
