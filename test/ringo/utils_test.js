var assert = require("assert");
var utils = require('ringo/utils');

const TEMPLATE = 'Here\'s {} and {}.';
const FOO = 'foo';
const BAR = 'bar';
const SPACE = ' ';
const NULL = 'null';
const UNDEFINED = 'undefined';
const NUM = 42;
const FOO_BAR = FOO + SPACE + BAR;
const RESULT_1 = 'Here\'s ' + FOO + ' and ' + BAR + '.';
const RESULT_2 = 'Here\'s ' + SPACE + ' and ' + NUM + '.';
const RESULT_3 = 'Here\'s ' + NULL + ' and ' + UNDEFINED + '.';
const RESULT_4 = RESULT_1 + SPACE + FOO + SPACE + BAR;
const RESULT_5 = RESULT_2 + SPACE + SPACE + SPACE + NUM;
const RESULT_6 = RESULT_3 + SPACE + NULL + SPACE + UNDEFINED;

exports.testFormat = function () {
    // format string replacement
    assert.strictEqual(RESULT_1, utils.format(TEMPLATE, FOO, BAR));
    assert.strictEqual(RESULT_2, utils.format(TEMPLATE, SPACE, NUM));
    assert.strictEqual(RESULT_3, utils.format(TEMPLATE, NULL, UNDEFINED));
    // format string replacement with additional args
    assert.strictEqual(RESULT_4, utils.format(TEMPLATE, FOO, BAR, FOO, BAR));
    assert.strictEqual(RESULT_5, utils.format(TEMPLATE, SPACE, NUM, SPACE, NUM));
    assert.strictEqual(RESULT_6, utils.format(TEMPLATE, NULL, UNDEFINED, NULL, UNDEFINED));
    // no format string
    assert.strictEqual(RESULT_4, utils.format(RESULT_1, FOO, BAR));
    assert.strictEqual(RESULT_5, utils.format(RESULT_2, SPACE, NUM));
    assert.strictEqual(RESULT_6, utils.format(RESULT_3, NULL, UNDEFINED));
    // null/undefined/number as first argument
    assert.strictEqual(NULL + SPACE + FOO_BAR, utils.format(null, FOO, BAR));
    assert.strictEqual(UNDEFINED + SPACE + FOO_BAR, utils.format(undefined, FOO, BAR));
    assert.strictEqual(NUM + SPACE + FOO_BAR, utils.format(NUM, FOO, BAR));
    // null/undefined/number as last argument
    assert.strictEqual(FOO_BAR + SPACE + NULL, utils.format(FOO, BAR, null));
    assert.strictEqual(FOO_BAR + SPACE + UNDEFINED, utils.format(FOO, BAR, undefined));
    assert.strictEqual(FOO_BAR + SPACE + NUM, utils.format(FOO, BAR, NUM));
    //  null/undefined/no argument
    assert.strictEqual(NULL, utils.format(null));
    assert.strictEqual(UNDEFINED, utils.format(undefined));
    assert.strictEqual('', utils.format());
};
