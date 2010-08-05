var assert = require('assert');
var strings = require('ringo/utils/strings');

const DATE_FORMAT = 'MM\'/\'dd\'/\'yyyy';
const DATE = '10/10/2010';
const URL = 'http://ringojs.org/';
const HEX_COLOR = 'd3d3d3';
const FOO = 'foo';
const NUM = '123';
const FOO_BASE64 = 'Zm9v';
const NUM_BASE64 = 'MTIz';

exports.testIsDateFormat = function () {
    assert.isTrue(strings.isDateFormat(DATE_FORMAT));
    assert.isFalse(strings.isDateFormat(FOO));
};

exports.testToDate = function () {
    var date = strings.toDate(DATE, DATE_FORMAT);
    assert.isTrue(date instanceof Date);
    assert.deepEqual(new Date(DATE), date);
    assert.throws(function () strings.toDate(FOO),
            java.lang.IllegalArgumentException); // Invalid date format.
};

exports.testIsUrl = function () {
    assert.isTrue(strings.isUrl(URL));
    assert.isFalse(strings.isUrl(FOO));
};

exports.testIsFileName = function () {
    assert.isTrue(strings.isFileName('ringo.js'));
    assert.isFalse(strings.isFileName(URL));
};

exports.testToFileName = function () {
    var fileName = strings.toFileName(URL);
    assert.isNotNull(fileName);
    assert.isTrue(strings.isFileName(fileName));
};

exports.testIsHexColor = function () {
    assert.isTrue(strings.isHexColor('#' + HEX_COLOR));
    assert.isTrue(strings.isHexColor(HEX_COLOR));
    assert.isFalse(strings.isHexColor(FOO));
};

exports.testToHexColor = function () {
    assert.strictEqual(HEX_COLOR, strings.toHexColor('rgb (211, 211, 211)'));
};

exports.testIsAlphanumeric = function () {
    assert.isTrue(strings.isAlphanumeric(FOO + NUM));
    assert.isTrue(strings.isAlphanumeric(FOO));
    assert.isFalse(strings.isAlphanumeric(URL));
};

exports.testToAlphanumeric = function () {
    var alphanumeric = strings.toAlphanumeric(URL);
    assert.isNotNull(alphanumeric);
    assert.isTrue(strings.isAlphanumeric(alphanumeric));
};

exports.testIsAlpha = function () {
    assert.isTrue(strings.isAlpha(FOO));
    assert.isFalse(strings.isAlpha(NUM));
    assert.isFalse(strings.isAlpha(NUM + FOO));
};

exports.testIsNumeric = function () {
    assert.isTrue(strings.isNumeric(NUM));
    assert.isFalse(strings.isNumeric(FOO));
    assert.isFalse(strings.isNumeric(FOO + NUM));
};

exports.testToCamelCase = function() {
    assert.strictEqual('fooBarBaz', strings.toCamelCase('foo-BAR_baz'));
    assert.strictEqual('fooBarBaz', strings.toCamelCase('foo BAR baz'));
    assert.strictEqual('fooBarBaz', strings.toCamelCase('foo\nBAR\tbaz'));
    assert.strictEqual('fooBar123baz', strings.toCamelCase('foo-bar-123baz'));
    assert.strictEqual('fooBar123Baz', strings.toCamelCase('foo-bar-123BAZ'));
    assert.strictEqual('fooBar123Baz', strings.toCamelCase('foo-bar-123-BAZ'));
};

exports.testCapitalize = function () {
    assert.strictEqual('Capitalize me.', strings.capitalize('capitalize me.'));
};

exports.testTitleize = function () {
    assert.strictEqual('Titleize Me', strings.titleize('titleize me'));
};

exports.testEntitize = function () {
    assert.strictEqual('&#102;&#111;&#111;', strings.entitize(FOO));
};

exports.testGroup = function () {
    assert.strictEqual(FOO.slice(0, 1) + NUM + FOO.slice(1, 2) + NUM + FOO.slice(2) +
            NUM, strings.group(FOO, 1, NUM));
};

exports.testUnwrap = function () {
    assert.strictEqual(FOO + FOO + FOO, strings.unwrap(FOO + '\n' + FOO, true, FOO));
};

exports.testDigest = function () {
    assert.strictEqual('acbd18db4cc2f85cedef654fccc4a4d8', strings.digest(FOO));
};

exports.testRepeat = function () {
    assert.strictEqual(FOO, strings.repeat(FOO, 1));
    assert.strictEqual(FOO + FOO, strings.repeat(FOO, 2));
};

exports.testStartsWith = function () {
    assert.isTrue(strings.startsWith(FOO + NUM, FOO));
    assert.isFalse(strings.startsWith(NUM + FOO, FOO));
};

exports.testEndsWith = function () {
    assert.isTrue(strings.endsWith(NUM + FOO, FOO));
    assert.isFalse(strings.endsWith(FOO + NUM, FOO));
};

exports.testPad = function () { // TODO: validate behaviour resp. rework this.
    assert.strictEqual(FOO + NUM + NUM, strings.pad(FOO, NUM, 5, 1));
};

exports.testContains = function () {
    assert.isTrue(strings.contains(FOO + NUM + FOO, NUM));
    assert.isFalse(strings.contains(FOO + FOO, NUM));
};

exports.testGetCommonPrefix = function () {
    assert.strictEqual(URL, strings.getCommonPrefix(URL + FOO, URL + NUM));
};

exports.testIsEmail = function () {
    assert.isTrue(strings.isEmail('nobody@domain.at'));
    assert.isFalse(strings.isEmail('nobody[at]domain.at'));
};

exports.testCount = function () {
    assert.strictEqual(3, strings.count(FOO + FOO + FOO, FOO));
    assert.strictEqual(3, strings.count(FOO + FOO + NUM + FOO, FOO));
};

exports.testEnbase64 = function () {
    assert.strictEqual(FOO_BASE64, strings.enbase64(FOO));
    assert.strictEqual(FOO_BASE64 + NUM_BASE64, strings.enbase64(FOO + NUM));
};

exports.testDebase64 = function () {
    assert.strictEqual(FOO, strings.debase64(FOO_BASE64));
    assert.strictEqual(FOO + NUM, strings.debase64(FOO_BASE64 + NUM_BASE64));
};

exports.testStripTags = function () {
    assert.strictEqual('content', strings.stripTags('<tag>content</tag>'));
};

exports.testEscapeHtml = function () {
    assert.strictEqual('&lt;p&gt;Some text.&lt;/p&gt;',
            strings.escapeHtml('<p>Some text.</p>'));
};

exports.testSorter = function () {
    // TODO: do we really need/want this?
};

exports.testCompose = function () {
    assert.strictEqual(FOO + NUM + FOO + FOO, strings.compose(FOO, NUM, FOO, FOO));
};

exports.testRandom = function () {
    assert.isTrue(typeof strings.random() === 'string');
    assert.strictEqual(5, strings.random(5).length);
};

exports.testJoin = function () {
    assert.strictEqual(FOO + NUM, strings.join(FOO, NUM));
    assert.strictEqual(FOO + NUM + FOO, strings.join(FOO, FOO, NUM));
};
