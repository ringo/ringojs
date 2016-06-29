var assert = require('assert');
var strings = require('ringo/utils/strings');

const DATE_FORMAT = 'MM\'/\'dd\'/\'yyyy';
const DATE = '10/10/2010';
const URL = 'http://ringojs.org/';
const HEX_COLOR = 'd3d3d3';
const FOO = 'foo';
const NUM = '123';
const STR = "[]{}()-*+?.\\^$|#, ABC";
const ESC = "\\[\\]\\{\\}\\(\\)\\-\\*\\+\\?\\.\\\\\\^\\$\\|\\#\\,\\ ABC";
const FOO_BASE64 = 'Zm9v';
const NUM_BASE64 = 'MTIz';
const BASE16 = [
    ["pleasure", "706C656173757265"],
    ["leasure", "6C656173757265"],
    ["easure", "656173757265"],
    ["asure", "6173757265"],
    ["sure", "73757265"],
    ["\u2665", "E299A5"]
];

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

    // URLs from http://mathiasbynens.be/demo/url-regex
    assert.isTrue(strings.isUrl("http://✪df.ws"));
    assert.isTrue(strings.isUrl("http://foo.com/blah_blah"));
    assert.isTrue(strings.isUrl("http://foo.com/blah_blah/"));
    assert.isTrue(strings.isUrl("http://foo.com/blah_blah_(wikipedia)"));
    assert.isTrue(strings.isUrl("http://foo.com/blah_blah_(wikipedia)_(again)"));
    assert.isTrue(strings.isUrl("http://www.example.com/wpstyle/?p=364"));
    assert.isTrue(strings.isUrl("https://www.example.com/foo/?bar=baz&inga=42&quux"));
    assert.isTrue(strings.isUrl("http://✪df.ws/123"));
    assert.isTrue(strings.isUrl("http://userid:password@example.com:8080"));
    assert.isTrue(strings.isUrl("http://userid:password@example.com:8080/"));
    assert.isTrue(strings.isUrl("http://userid@example.com"));
    assert.isTrue(strings.isUrl("http://userid@example.com/"));
    assert.isTrue(strings.isUrl("http://userid@example.com:8080"));
    assert.isTrue(strings.isUrl("http://userid@example.com:8080/"));
    assert.isTrue(strings.isUrl("http://userid:password@example.com"));
    assert.isTrue(strings.isUrl("http://userid:password@example.com/"));
    assert.isTrue(strings.isUrl("http://142.42.1.1/"));
    assert.isTrue(strings.isUrl("http://142.42.1.1:8080/"));
    assert.isTrue(strings.isUrl("http://➡.ws/䨹"));
    assert.isTrue(strings.isUrl("http://⌘.ws"));
    assert.isTrue(strings.isUrl("http://⌘.ws/"));
    assert.isTrue(strings.isUrl("http://foo.com/blah_(wikipedia)#cite-1"));
    assert.isTrue(strings.isUrl("http://foo.com/blah_(wikipedia)_blah#cite-1"));
    assert.isTrue(strings.isUrl("http://foo.com/unicode_(✪)_in_parens"));
    assert.isTrue(strings.isUrl("http://foo.com/(something)?after=parens"));
    assert.isTrue(strings.isUrl("http://☺.damowmow.com/"));
    assert.isTrue(strings.isUrl("http://code.google.com/events/#&product=browser"));
    assert.isTrue(strings.isUrl("http://j.mp"));
    assert.isTrue(strings.isUrl("ftp://foo.bar/baz"));
    assert.isTrue(strings.isUrl("http://foo.bar/?q=Test%20URL-encoded%20stuff"));
    assert.isTrue(strings.isUrl("http://مثال.إختبار"));
    assert.isTrue(strings.isUrl("http://例子.测试"));
    assert.isTrue(strings.isUrl("http://उदाहरण.परीक्षा"));
    assert.isTrue(strings.isUrl("http://-.~_!$&'()*+,;=:%40:80%2f::::::@example.com"));
    assert.isTrue(strings.isUrl("http://1337.net"));
    assert.isTrue(strings.isUrl("http://a.b-c.de"));
    assert.isTrue(strings.isUrl("http://223.255.255.254"));
    assert.isFalse(strings.isUrl("http://"));
    assert.isFalse(strings.isUrl("http://."));
    assert.isFalse(strings.isUrl("http://.."));
    assert.isFalse(strings.isUrl("http://../"));
    assert.isFalse(strings.isUrl("http://?"));
    assert.isFalse(strings.isUrl("http://??"));
    assert.isFalse(strings.isUrl("http://??/"));
    assert.isFalse(strings.isUrl("http://#"));
    assert.isFalse(strings.isUrl("http://##"));
    assert.isFalse(strings.isUrl("http://##/"));
    assert.isFalse(strings.isUrl("http://foo.bar?q=Spaces should be encoded"));
    assert.isFalse(strings.isUrl("//"));
    assert.isFalse(strings.isUrl("//a"));
    assert.isFalse(strings.isUrl("///a"));
    assert.isFalse(strings.isUrl("///"));
    assert.isFalse(strings.isUrl("http:///a"));
    assert.isFalse(strings.isUrl("foo.com"));
    assert.isFalse(strings.isUrl("rdar://1234"));
    assert.isFalse(strings.isUrl("h://test"));
    assert.isFalse(strings.isUrl("http:// shouldfail.com"));
    assert.isFalse(strings.isUrl(":// should fail"));
    assert.isFalse(strings.isUrl("http://foo.bar/foo(bar)baz quux"));
    assert.isFalse(strings.isUrl("ftps://foo.bar/"));
    assert.isFalse(strings.isUrl("http://-error-.invalid/"));
    assert.isFalse(strings.isUrl("http://a.b--c.de/"));
    assert.isFalse(strings.isUrl("http://-a.b.co"));
    assert.isFalse(strings.isUrl("http://a.b-.co"));
    assert.isFalse(strings.isUrl("http://0.0.0.0"));
    assert.isFalse(strings.isUrl("http://10.1.1.0"));
    assert.isFalse(strings.isUrl("http://10.1.1.255"));
    assert.isFalse(strings.isUrl("http://224.1.1.1"));
    assert.isFalse(strings.isUrl("http://1.1.1.1.1"));
    assert.isFalse(strings.isUrl("http://123.123.123"));
    assert.isFalse(strings.isUrl("http://3628126748"));
    assert.isFalse(strings.isUrl("http://.www.foo.bar/"));
    assert.isFalse(strings.isUrl("http://www.foo.bar./"));
    assert.isFalse(strings.isUrl("http://.www.foo.bar./"));
    assert.isFalse(strings.isUrl("http://10.1.1.1"));
    assert.isFalse(strings.isUrl("http://10.1.1.254"));
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

exports.testToDashes = function() {
    assert.strictEqual('foo-bar-baz', strings.toDashes('fooBarBaz'));
};

exports.testToUnderscores = function() {
    assert.strictEqual('foo_bar_baz', strings.toUnderscores('fooBarBaz'));
};

exports.testCapitalize = function () {
    assert.strictEqual('Capitalize me.', strings.capitalize('capitalize me.'));
};

exports.testTitleize = function () {
    assert.strictEqual('Titleize Me', strings.titleize('titleize me'));
    assert.strictEqual('TItleize ME', strings.titleize('titleize me', 2));
    assert.strictEqual('TITleize ME', strings.titleize('titleize me', 3));
};

exports.testEntitize = function () {
    assert.strictEqual('&#102;&#111;&#111;', strings.entitize(FOO));
};

exports.testGroup = function () {
    assert.strictEqual(FOO.slice(0, 1) + NUM + FOO.slice(1, 2) + NUM + FOO.slice(2) +
            NUM, strings.group(FOO, 1, NUM));
};

exports.testDigest = function () {
    assert.strictEqual('ACBD18DB4CC2F85CEDEF654FCCC4A4D8', strings.digest(FOO));
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
    assert.strictEqual(strings.pad(FOO, NUM, 6, 1), FOO + NUM);
    assert.strictEqual(strings.pad(NUM, NUM, 4, 1), NUM + NUM.charAt(0));

    assert.strictEqual(strings.pad(FOO, NUM, 6, 0), NUM.charAt(0) + FOO + NUM.substr(0,2));

    assert.strictEqual(strings.pad(FOO, NUM, 6, -1), NUM + FOO);
    assert.strictEqual(strings.pad(NUM, NUM, 4, -1), NUM.charAt(0) + NUM);
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
    assert.isTrue(strings.isEmail('nobody@domain.ac.at'));
    assert.isTrue(strings.isEmail('nobody@some.sub.domain.ac.at'));
    assert.isTrue(strings.isEmail('mister.nobody@domain.at'));
    assert.isTrue(strings.isEmail('mister.nobody@domain.ac.at'));
    assert.isTrue(strings.isEmail('mister.nobody@some.sub.domain.ac.at'));
    assert.isTrue(strings.isEmail('öäü@some.sub.domain.ac.at'));
    assert.isTrue(strings.isEmail('nobody@ümlautdömän.at'));
    assert.isTrue(strings.isEmail('nobody@ümlautdömän.ac.at'));
    assert.isTrue(strings.isEmail('nobody@some.sub.ümlautdömän.ac.at'));
    assert.isTrue(strings.isEmail('nobody|1234567890@domain.at'));
    assert.isTrue(strings.isEmail('nobody+filter@domain.at'));
    assert.isTrue(strings.isEmail('nobody.has.name+filter@domain.at'));

    assert.isFalse(strings.isEmail('nobody[at]domain.at'));
    assert.isFalse(strings.isEmail('domain.at'));
    assert.isFalse(strings.isEmail('@domain.at'));
    assert.isFalse(strings.isEmail('nobody@'));
    assert.isFalse(strings.isEmail('mister.nobody@'));

    // From http://en.wikipedia.org/wiki/Email_address#Invalid_email_addresses
    assert.isFalse(strings.isEmail('Abc.example.com'));
    assert.isFalse(strings.isEmail('A@b@c@example.com'));
    assert.isFalse(strings.isEmail('a"b(c)d,e:f;g<h>i[j\\k]l@example.com'));
    assert.isFalse(strings.isEmail('just"not"right@example.com'));
    assert.isFalse(strings.isEmail('this is"not\\allowed@example.com'));
    assert.isFalse(strings.isEmail('this\\ still\\"not\\\\allowed@example.com'));
};

exports.testCount = function () {
    assert.strictEqual(3, strings.count(FOO + FOO + FOO, FOO));
    assert.strictEqual(3, strings.count(FOO + FOO + NUM + FOO, FOO));
};

exports.testB64Encode = function () {
    assert.strictEqual(FOO_BASE64, strings.b64encode(FOO));
    assert.strictEqual(FOO_BASE64 + NUM_BASE64, strings.b64encode(FOO + NUM));
};

exports.testB64Decode = function () {
    assert.strictEqual(FOO, strings.b64decode(FOO_BASE64));
    assert.strictEqual(FOO + NUM, strings.b64decode(FOO_BASE64 + NUM_BASE64));
};

exports.testB64EncodeDecode = function() {
    for each (var test in BASE16) {
        assert.strictEqual(strings.b16encode(test[0]), test[1]);
        assert.strictEqual(strings.b16decode(strings.b16encode(test[0])), test[0]);
        assert.deepEqual(strings.b16decode(
                strings.b16encode(test[0]), 'raw').toArray(),
                new ByteString(test[0], 'utf8').toArray());
    }
};

exports.testEscapeHtml = function () {
    assert.strictEqual(strings.escapeHtml("<p>\'Some\' \"text\".</p>"), "&lt;p&gt;&#39;Some&#39; &quot;text&quot;.&lt;/p&gt;");
    assert.strictEqual(strings.escapeHtml("nothing to escape"), "nothing to escape");
    assert.strictEqual(strings.escapeHtml("one&two&three&"), "one&amp;two&amp;three&amp;");
    assert.strictEqual(strings.escapeHtml("<tag> <tag> <tag>"), "&lt;tag&gt; &lt;tag&gt; &lt;tag&gt;");
    assert.strictEqual(strings.escapeHtml("attr=\'foo\' attr=\'foo\'"), "attr=&#39;foo&#39; attr=&#39;foo&#39;");
    assert.strictEqual(strings.escapeHtml("attr=\"foo\" attr=\"foo\""), "attr=&quot;foo&quot; attr=&quot;foo&quot;");
    assert.strictEqual(strings.escapeHtml("a mixed <ta'&g\">"), "a mixed &lt;ta&#39;&amp;g&quot;&gt;");

    // see https://github.com/mathiasbynens/he/blob/364b80262c54e7af0c8ff6910b10d872ae0c68c9/src/he.js#L45-L49
    // http://html5sec.org/#102, http://html5sec.org/#108, http://html5sec.org/#133
    assert.strictEqual(strings.escapeHtml("OldIE trick <`>`"), "OldIE trick &lt;&#96;&gt;&#96;")
};

exports.testEscapeRegExp = function() {
    assert.equal(ESC, strings.escapeRegExp(STR));
    assert.isTrue(new RegExp(strings.escapeRegExp(STR)).test(STR));
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

const TEMPLATE = 'Here\'s {} and {}.';
const BAR = 'bar';
const SPACE = ' ';
const NULL = 'null';
const UNDEFINED = 'undefined';
const FOO_BAR = FOO + SPACE + BAR;
const RESULT_1 = 'Here\'s ' + FOO + ' and ' + BAR + '.';
const RESULT_2 = 'Here\'s ' + SPACE + ' and ' + NUM + '.';
const RESULT_3 = 'Here\'s ' + NULL + ' and ' + UNDEFINED + '.';
const RESULT_4 = RESULT_1 + SPACE + FOO + SPACE + BAR;
const RESULT_5 = RESULT_2 + SPACE + SPACE + SPACE + NUM;
const RESULT_6 = RESULT_3 + SPACE + NULL + SPACE + UNDEFINED;

exports.testFormat = function () {
    // format string replacement
    assert.strictEqual(RESULT_1, strings.format(TEMPLATE, FOO, BAR));
    assert.strictEqual(RESULT_2, strings.format(TEMPLATE, SPACE, NUM));
    assert.strictEqual(RESULT_3, strings.format(TEMPLATE, NULL, UNDEFINED));
    // format string replacement with additional args
    assert.strictEqual(RESULT_4, strings.format(TEMPLATE, FOO, BAR, FOO, BAR));
    assert.strictEqual(RESULT_5, strings.format(TEMPLATE, SPACE, NUM, SPACE, NUM));
    assert.strictEqual(RESULT_6, strings.format(TEMPLATE, NULL, UNDEFINED, NULL, UNDEFINED));
    // no format string
    assert.strictEqual(RESULT_4, strings.format(RESULT_1, FOO, BAR));
    assert.strictEqual(RESULT_5, strings.format(RESULT_2, SPACE, NUM));
    assert.strictEqual(RESULT_6, strings.format(RESULT_3, NULL, UNDEFINED));
    // null/undefined/number as first argument
    assert.strictEqual(NULL + SPACE + FOO_BAR, strings.format(null, FOO, BAR));
    assert.strictEqual(UNDEFINED + SPACE + FOO_BAR, strings.format(undefined, FOO, BAR));
    assert.strictEqual(NUM + SPACE + FOO_BAR, strings.format(NUM, FOO, BAR));
    // null/undefined/number as last argument
    assert.strictEqual(FOO_BAR + SPACE + NULL, strings.format(FOO, BAR, null));
    assert.strictEqual(FOO_BAR + SPACE + UNDEFINED, strings.format(FOO, BAR, undefined));
    assert.strictEqual(FOO_BAR + SPACE + NUM, strings.format(FOO, BAR, NUM));
    //  null/undefined/no argument
    assert.strictEqual(NULL, strings.format(null));
    assert.strictEqual(UNDEFINED, strings.format(undefined));
    assert.strictEqual('', strings.format());
};

exports.testIsUpperCase = function () {
    assert.isTrue(strings.isUpperCase("ASDFJKLÖÄÜ"));
    assert.isFalse(strings.isUpperCase("asdfjklöäü"));
    assert.isTrue(strings.isUpperCase("1234567890"));
};

exports.testIsLowerCase = function () {
    assert.isFalse(strings.isLowerCase("ASDFJKLÖÄÜ"));
    assert.isTrue(strings.isLowerCase("asdfjklöäü"));
    assert.isTrue(strings.isLowerCase("1234567890"));
};

exports.testIsInt = function() {
    assert.isTrue(strings.isInt("123456"));
    assert.isTrue(strings.isInt("+123456"));
    assert.isTrue(strings.isInt("-12345"));
    assert.isTrue(strings.isInt("0"));
    assert.isFalse(strings.isInt("affe"));
    assert.isFalse(strings.isInt("0.0"));
    assert.isFalse(strings.isInt("-0.0"));
    assert.isFalse(strings.isInt(".0"));
    assert.isFalse(strings.isInt("1.0"));
    assert.isFalse(strings.isInt("-1.0"));
    assert.isFalse(strings.isInt("1e10"));
    assert.isFalse(strings.isInt(""));
    assert.isFalse(strings.isInt(" "));
};

exports.testIsFloat = function() {
    assert.isTrue(strings.isFloat("0.0"));
    assert.isTrue(strings.isFloat("-0.0"));
    assert.isTrue(strings.isFloat(".0"));
    assert.isTrue(strings.isFloat("1.0"));
    assert.isTrue(strings.isFloat("-1.0"));
    assert.isTrue(strings.isFloat("+1.0"));
    assert.isTrue(strings.isFloat("1e10"));
    assert.isTrue(strings.isFloat("-1e10"));
    assert.isTrue(strings.isFloat("-.12345"));
    assert.isFalse(strings.isFloat("affe"));
    assert.isFalse(strings.isFloat(""));
    assert.isFalse(strings.isFloat(" "));

    // A floating-point literal must have at least one digit and either a decimal point or "e" (or "E").
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Values,_variables,_and_literals
    assert.isTrue(strings.isFloat("3.1415"));
    assert.isTrue(strings.isFloat("-3.1E12"));
    assert.isTrue(strings.isFloat("+3.1E12"));
    assert.isTrue(strings.isFloat(".1e12"));
    assert.isTrue(strings.isFloat("2E-12"));
    assert.isFalse(strings.isFloat("123456"));
    assert.isFalse(strings.isFloat("-12345"));
    assert.isFalse(strings.isFloat("0"));
};

exports.testY64encode = function() {
    assert.strictEqual("cmluZ29qcw--", strings.y64encode("ringojs", "UTF-8"));
    assert.strictEqual("NDVFRjkxMzUtOEVGOS00NDFELUIxNDMtQTQ0RTkwOEQxREQ0", strings.y64encode("45EF9135-8EF9-441D-B143-A44E908D1DD4"));
    assert.strictEqual("PUB.YXNkZg--", strings.y64encode("=@~asdf", "UTF-8"));
    assert.strictEqual("Pz8_Pw--", strings.y64encode("????", "UTF-8"));
};

exports.testY64decode = function() {
    assert.strictEqual("ringojs", strings.y64decode("cmluZ29qcw--", "UTF-8"));
    assert.strictEqual("45EF9135-8EF9-441D-B143-A44E908D1DD4", strings.y64decode("NDVFRjkxMzUtOEVGOS00NDFELUIxNDMtQTQ0RTkwOEQxREQ0"));
    assert.strictEqual("=@~asdf", strings.y64decode("PUB.YXNkZg--", "UTF-8"));
    assert.strictEqual("????", strings.y64decode("Pz8_Pw--", "UTF-8"));
};

exports.testIsDate = function() {
    assert.isTrue(strings.isDate("1.1.2016", "d.M.yyyy"));
    assert.isTrue(strings.isDate("1.1.16", "d.M.yy"));
    assert.isTrue(strings.isDate("01.01.2016", "dd.MM.yyyy"));
    assert.isTrue(strings.isDate("10.10.2016", "d.M.yyyy"));
    assert.isTrue(strings.isDate("10.10.16", "d.M.yy"));
    assert.isTrue(strings.isDate("29. Juni 2016", "dd. MMM yyyy", "de", "UTC"));
    assert.isTrue(strings.isDate("2016-06-29T12:11:10.001Zasdfasdf", "yyyy-MM-dd'T'HH:mm:ss.SSS", "en", "UTC"));
    assert.isTrue(strings.isDate("31.09.16", "d.M.yy"));
    assert.isTrue(strings.isDate("32.10.16", "d.M.yy"));
    assert.isTrue(strings.isDate("1.13.16", "d.M.yy"));

    assert.isFalse(strings.isDate("31.09.16", "d.M.yy", null, null, false));
    assert.isFalse(strings.isDate("a.b.c", "d.M.yy"));
    assert.isFalse(strings.isDate("32.10.16", "d.M.yy", null, null, false));
    assert.isFalse(strings.isDate("1.13.16", "d.M.yy", null, null, false));
    assert.isFalse(strings.isDate("29. June 2016", "dd. MMM yyyy", "de", "UTC"));
};

if (require.main === module) {
    require('system').exit(require("test").run(module.id));
}