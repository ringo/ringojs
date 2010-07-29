var assert = require('assert');
var STRING = require('ringo/utils/string');

const DATE_FORMAT = 'MM\'/\'dd\'/\'yyyy';
const DATE = '10/10/2010';
const URL = 'http://ringojs.org/';
const HEX_COLOR = 'd3d3d3';
const FOO = 'foo';
const NUM = '123';
const FOO_BASE64 = 'Zm9v';
const NUM_BASE64 = 'MTIz';

exports.testIsDateFormat = function () {
    assert.isTrue(STRING.isDateFormat(DATE_FORMAT));
    assert.isFalse(STRING.isDateFormat(FOO));
};

exports.testToDate = function () {
    var date = STRING.toDate(DATE, DATE_FORMAT);
    assert.isTrue(date instanceof Date);
    assert.deepEqual(new Date(DATE), date);
    assert.throws(function () STRING.toDate(FOO), 
            java.lang.IllegalArgumentException); // Invalid date format.
};

exports.testIsUrl = function () {
    assert.isTrue(STRING.isUrl(URL));
    assert.isFalse(STRING.isUrl(FOO));
};

exports.testIsFileName = function () {
    assert.isTrue(STRING.isFileName('ringo.js'));
    assert.isFalse(STRING.isFileName(URL));
};

exports.testToFileName = function () {
    var fileName = STRING.toFileName(URL);
    assert.isNotNull(fileName);
    assert.isTrue(STRING.isFileName(fileName));
};

exports.testIsHexColor = function () {
    assert.isTrue(STRING.isHexColor('#' + HEX_COLOR));
    assert.isTrue(STRING.isHexColor(HEX_COLOR));
    assert.isFalse(STRING.isHexColor(FOO));
};

exports.testToHexColor = function () {
    assert.strictEqual(HEX_COLOR, STRING.toHexColor('rgb (211, 211, 211)'));
};

exports.testIsAlphanumeric = function () {
    assert.isTrue(STRING.isAlphanumeric(FOO + NUM));
    assert.isTrue(STRING.isAlphanumeric(FOO));
    assert.isFalse(STRING.isAlphanumeric(URL));
};

exports.testToAlphanumeric = function () {
    var alphanumeric = STRING.toAlphanumeric(URL);
    assert.isNotNull(alphanumeric);
    assert.isTrue(STRING.isAlphanumeric(alphanumeric));
};

exports.testIsAlpha = function () {
    assert.isTrue(STRING.isAlpha(FOO));
    assert.isFalse(STRING.isAlpha(NUM));
    assert.isFalse(STRING.isAlpha(NUM + FOO));
};

exports.testIsNumeric = function () {
    assert.isTrue(STRING.isNumeric(NUM));
    assert.isFalse(STRING.isNumeric(FOO));
    assert.isFalse(STRING.isNumeric(FOO + NUM));
};

exports.testToCamelCase = function() {
    assert.strictEqual('fooBarBaz', STRING.toCamelCase('foo-BAR_baz'));
    assert.strictEqual('fooBarBaz', STRING.toCamelCase('foo BAR baz'));
    assert.strictEqual('fooBarBaz', STRING.toCamelCase('foo\nBAR\tbaz'));
    assert.strictEqual('fooBar123baz', STRING.toCamelCase('foo-bar-123baz'));
    assert.strictEqual('fooBar123Baz', STRING.toCamelCase('foo-bar-123BAZ'));
    assert.strictEqual('fooBar123Baz', STRING.toCamelCase('foo-bar-123-BAZ'));
};

exports.testCapitalize = function () {
    assert.strictEqual('Capitalize me.', STRING.capitalize('capitalize me.'));
};

exports.testTitleize = function () {
    assert.strictEqual('Titleize Me', STRING.titleize('titleize me'));
};

exports.testEntitize = function () {
    assert.strictEqual('&#102;&#111;&#111;', STRING.entitize(FOO));
};

exports.testGroup = function () {
    assert.strictEqual(FOO.slice(0, 1) + NUM + FOO.slice(1, 2) + NUM + FOO.slice(2) +
            NUM, STRING.group(FOO, 1, NUM));
};

exports.testUnwrap = function () {
    assert.strictEqual(FOO + FOO + FOO, STRING.unwrap(FOO + '\n' + FOO, true, FOO));
};

exports.testDigest = function () {
    assert.strictEqual('acbd18db4cc2f85cedef654fccc4a4d8', STRING.digest(FOO));
};

exports.testRepeat = function () {
    assert.strictEqual(FOO, STRING.repeat(FOO, 1));
    assert.strictEqual(FOO + FOO, STRING.repeat(FOO, 2));
};

exports.testStartsWith = function () {
    assert.isTrue(STRING.startsWith(FOO + NUM, FOO));
    assert.isFalse(STRING.startsWith(NUM + FOO, FOO));
};

exports.testEndsWith = function () {
    assert.isTrue(STRING.endsWith(NUM + FOO, FOO));
    assert.isFalse(STRING.endsWith(FOO + NUM, FOO));
};

exports.testPad = function () { // TODO: validate behaviour resp. rework this.
    assert.strictEqual(FOO + NUM + NUM, STRING.pad(FOO, NUM, 5, 1));
};

exports.testContains = function () {
    assert.isTrue(STRING.contains(FOO + NUM + FOO, NUM));
    assert.isFalse(STRING.contains(FOO + FOO, NUM));
};

exports.testGetCommonPrefix = function () {
    assert.strictEqual(URL, STRING.getCommonPrefix(URL + FOO, URL + NUM));
};

exports.testIsEmail = function () {
    assert.isTrue(STRING.isEmail('nobody@domain.at'));
    assert.isFalse(STRING.isEmail('nobody[at]domain.at'));
};

exports.testCount = function () {
    assert.strictEqual(3, STRING.count(FOO + FOO + FOO, FOO));
    assert.strictEqual(3, STRING.count(FOO + FOO + NUM + FOO, FOO));
};

exports.testEnbase64 = function () {
    assert.strictEqual(FOO_BASE64, STRING.enbase64(FOO));
    assert.strictEqual(FOO_BASE64 + NUM_BASE64, STRING.enbase64(FOO + NUM));
};

exports.testDebase64 = function () {
    assert.strictEqual(FOO, STRING.debase64(FOO_BASE64));
    assert.strictEqual(FOO + NUM, STRING.debase64(FOO_BASE64 + NUM_BASE64));
};

exports.testStripTags = function () {
    assert.strictEqual('content', STRING.stripTags('<tag>content</tag>'));
};

exports.testEscapeHtml = function () {
    assert.strictEqual('&lt;p&gt;Some text.&lt;/p&gt;',
            STRING.escapeHtml('<p>Some text.</p>'));
};

exports.testSorter = function () {
    // TODO: do we really need/want this?
};

exports.testCompose = function () {
    assert.strictEqual(FOO + NUM + FOO + FOO, STRING.compose(FOO, NUM, FOO, FOO));
};

exports.testRandom = function () {
    assert.isTrue(typeof STRING.random() === 'string');
    assert.strictEqual(5, STRING.random(5).length);
};

exports.testJoin = function () {
    assert.strictEqual(FOO + NUM, STRING.join(FOO, NUM));
    assert.strictEqual(FOO + NUM + FOO, STRING.join(FOO, FOO, NUM));
};
