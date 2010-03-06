include('ringo/unittest');
var utils = require('ringo/utils');

const TEMPLATE = 'Here\'s {} and {}.';
const RESULT = 'Here\'s foo and bar.';
const FOO = 'foo';
const BAR = 'bar';
const SPACE = ' ';
const NUM = 42;

exports.testFormat = function () {
    assertEqual(RESULT, utils.format(TEMPLATE, FOO, BAR));
    assertEqual(RESULT + SPACE + FOO + SPACE + BAR, utils.format(RESULT, FOO,
            BAR)); // Should simply join strings if 1st arg's no template.
    assertEqual(SPACE + FOO + SPACE + BAR, utils.format(null, FOO, BAR));
    assertEqual(NUM + SPACE + FOO + SPACE + BAR, utils.format(NUM, FOO, BAR));
}
