var assert = require('assert');
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
    assert.isTrue(DATE_FORMAT.isDateFormat());
    assert.isFalse(FOO.isDateFormat());
};

exports.testToDate = function () {
    var date = DATE.toDate(DATE_FORMAT);
    assert.isTrue(date instanceof Date);
    assert.deepEqual(new Date(DATE), date);
    assert.throws(function () DATE.toDate(FOO), java.lang.
            IllegalArgumentException); // Invalid date format.
};

exports.testIsUrl = function () {
    assert.isTrue(URL.isUrl());
    assert.isFalse(FOO.isUrl());
};

exports.testIsFileName = function () {
    assert.isTrue('ringo.js'.isFileName());
    assert.isFalse(URL.isFileName());
};

exports.testToFileName = function () {
    var fileName = URL.toFileName();
    assert.isNotNull(fileName);
    assert.isTrue(fileName.isFileName());
};

exports.testIsHexColor = function () {
    assert.isTrue(('#' + HEX_COLOR).isHexColor());
    assert.isTrue(HEX_COLOR.isHexColor());
    assert.isFalse(FOO.isHexColor());
};

exports.testToHexColor = function () {
    assert.strictEqual(HEX_COLOR, 'rgb (211, 211, 211)'.toHexColor());
};

exports.testIsAlphanumeric = function () {
    assert.isTrue((FOO + NUM).isAlphanumeric());
    assert.isTrue(FOO.isAlphanumeric());
    assert.isFalse(URL.isAlphanumeric());
};

exports.testToAlphanumeric = function () {
    var alphanumeric = URL.toAlphanumeric();
    assert.isNotNull(alphanumeric);
    assert.isTrue(alphanumeric.isAlphanumeric());
};

exports.testIsAlpha = function () {
    assert.isTrue(FOO.isAlpha());
    assert.isFalse(NUM.isAlpha());
    assert.isFalse((NUM + FOO).isAlpha());
};

exports.testIsNumeric = function () {
    assert.isTrue(NUM.isNumeric());
    assert.isFalse(FOO.isNumeric());
    assert.isFalse((FOO + NUM).isNumeric());
};

exports.testToCamelCase = function() {
    assert.strictEqual('fooBarBaz', 'foo-BAR_baz'.toCamelCase());
    assert.strictEqual('fooBarBaz', 'foo BAR baz'.toCamelCase());
    assert.strictEqual('fooBarBaz', 'foo\nBAR\tbaz'.toCamelCase());
    assert.strictEqual('fooBar123baz', 'foo-bar-123baz'.toCamelCase());
    assert.strictEqual('fooBar123Baz', 'foo-bar-123BAZ'.toCamelCase());
    assert.strictEqual('fooBar123Baz', 'foo-bar-123-BAZ'.toCamelCase());
};

exports.testCapitalize = function () {
    assert.strictEqual('Capitalize me.', 'capitalize me.'.capitalize());
};

exports.testTitleize = function () {
    assert.strictEqual('Titleize Me', 'titleize me'.titleize());
};

exports.testEntitize = function () {
    assert.strictEqual('&#102;&#111;&#111;', FOO.entitize());
};

exports.testGroup = function () {
    assert.strictEqual(FOO.slice(0, 1) + NUM + FOO.slice(1, 2) + NUM + FOO.slice(2) +
            NUM, FOO.group(1, NUM));
};

exports.testUnwrap = function () {
    assert.strictEqual(FOO + FOO + FOO, (FOO + '\n' + FOO).unwrap(true, FOO));
};

exports.testDigest = function () {
    assert.strictEqual('acbd18db4cc2f85cedef654fccc4a4d8', FOO.digest());
};

exports.testRepeat = function () {
    assert.strictEqual(FOO, FOO.repeat(1));
    assert.strictEqual(FOO + FOO, FOO.repeat(2));
};

exports.testStartsWith = function () {
    assert.isTrue((FOO + NUM).startsWith(FOO));
    assert.isFalse((NUM + FOO).startsWith(FOO));
};

exports.testEndsWith = function () {
    assert.isTrue((NUM + FOO).endsWith(FOO));
    assert.isFalse((FOO + NUM).endsWith(FOO));
};

exports.testPad = function () { // TODO: validate behaviour resp. rework this.
    assert.strictEqual(FOO + NUM + NUM, FOO.pad(NUM, 5, 1));
};

exports.testContains = function () {
    assert.isTrue((FOO + NUM + FOO).contains(NUM));
    assert.isFalse((FOO + FOO).contains(NUM));
};

exports.testGetCommonPrefix = function () {
    assert.strictEqual(URL, (URL + FOO).getCommonPrefix(URL + NUM));
};

exports.testIsEmail = function () {
    assert.isTrue('hannes@helma.at'.isEmail());
    assert.isFalse('hannes[at]helma.at'.isEmail());
};

exports.testCount = function () {
    assert.strictEqual(3, (FOO + FOO + FOO).count(FOO));
    assert.strictEqual(3, (FOO + FOO + NUM + FOO).count(FOO));
};

exports.testEnbase64 = function () {
    assert.strictEqual(FOO_BASE64, FOO.enbase64());
    assert.strictEqual(FOO_BASE64 + NUM_BASE64, (FOO + NUM).enbase64());
};

exports.testDebase64 = function () {
    assert.strictEqual(FOO, FOO_BASE64.debase64());
    assert.strictEqual(FOO + NUM, (FOO_BASE64 + NUM_BASE64).debase64());
};

exports.testStripTags = function () {
    assert.strictEqual('content', '<tag>content</tag>'.stripTags());
};

exports.testEscapeHtml = function () {
    assert.strictEqual('&lt;p&gt;Some text.&lt;/p&gt;', '<p>Some text.</p>'.
            escapeHtml());
};

exports.testSorter = function () {
    // TODO: do we really need/want this?
};

exports.testCompose = function () {
    assert.strictEqual(FOO + NUM + FOO + FOO, String.compose(FOO, NUM, FOO, FOO));
};

exports.testRandom = function () {
    assert.isTrue(typeof String.random() === 'string');
    assert.strictEqual(5, String.random(5).length);
};

exports.testJoin = function () {
    assert.strictEqual(FOO + NUM, String.join(FOO, NUM));
    assert.strictEqual(FOO + NUM + FOO, String.join(FOO, FOO, NUM));
};
