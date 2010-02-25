include('ringo/unittest');
include('ringo/skin');
var filters = require('ringo/skin/filters');

exports.testBasic = function () {
    var skin = createSkin('simple');
    assertEqual('simple', render(skin));
    assertEqual('simple', render(skin, {}));
};

exports.testValue = function () {
    var skin = createSkin('before <% value %> after');
    var context = {value: 'HERE'};
    assertEqual('before HERE after', render(skin, context));
};

exports.testMacro = function () {
    var skin = createSkin('before <% macro %> after');
    var context = {macro_macro: function () 'HERE'};
    assertEqual('before HERE after', render(skin, context));
};

exports.testFilter = function () {
    var skin = createSkin('before <% x | filter %> after');
    var context = {filter_filter: function (str) 'HERE'};
    assertEqual('before HERE after', render(skin, context));
};

exports.testSubskin = function () {
    var skin;
    var context;

    skin = createSkin('a<% subskin sub %>b');
    assertEqual('a', render(skin));

    skin = createSkin('a<% render sub %><% subskin sub %>b');
    assertEqual('ab', render(skin));

    skin = createSkin('a<% s %><% subskin sub %>b');
    context = {s_macro: function(macro, context, skin)
            skin.renderSubskin('sub')};
    assertEqual('ab', render(skin, context));
};

exports.testSubskinWhitespace = function () {
    var skin;

    skin = createSkin('a\n<% subskin sub %>\nb\n');
    assertEqual('a\n', render(skin));

    skin = createSkin('a\n<% render sub %>\n<% subskin sub %>\nb\n');
    assertEqual('a\n\nb\n', render(skin));
};

exports.testLowercaseFilter = function () {
    var string = 'ALL CAPS';
    var skin = createSkin('<% value | lowercase %>');
    var context = {value: string, lowercase_filter: filters.lowercase_filter};
    assertEqual(string.toLowerCase(), render(skin, context));
};

exports.testUppercaseFilter = function () {
    var string = 'wannabe caps';
    var skin = createSkin('<% value | uppercase %>');
    var context = {value: string, uppercase_filter: filters.uppercase_filter};
    assertEqual(string.toUpperCase(), render(skin, context));
};

exports.testCapitalizeFilter = function () {
    var string = 'capitalize me.';
    var skin = createSkin('<% value | capitalize %>');
    var context = {value: string, capitalize_filter: filters.capitalize_filter};
    assertEqual(string.capitalize(), render(skin, context));
};

exports.testTitleizeFilter = function () {
    var string = 'titleize me';
    var skin = createSkin('<% value | titleize %>');
    var context = {value: string, titleize_filter: filters.titleize_filter};
    assertEqual(string.titleize(), render(skin, context));
};

exports.testTrimFilter = function () {
    var string = ' trim me  ';
    var skin = createSkin('<% value | trim %>');
    var context = {value: string, trim_filter: filters.trim_filter};
    assertEqual(string.trim(), render(skin, context));
};

exports.testStripTagsFilter = function () {
    var string = '<tag>content</tag>';
    var skin = createSkin('<% value | stripTags %>');
    var context = {value: string, stripTags_filter: filters.stripTags_filter};
    assertEqual(string.stripTags(), render(skin, context));
};

exports.testEscapeUrlFilter = function () {
    var string = 'http://ringojs.org/Web Framework/';
    var skin = createSkin('<% value | escapeUrl %>');
    var context = {value: string, escapeUrl_filter: filters.escapeUrl_filter};
    assertEqual(java.net.URLEncoder.encode(string, 'utf8'),
            render(skin, context));
};

exports.testEscapeHtmlFilter = function () {
    var string = '<p>Some text.</p>';
    var skin = createSkin('<% value | escapeHtml %>');
    var context = {value: string, escapeHtml_filter: filters.escapeHtml_filter};
    assertEqual(string.escapeHtml(), render(skin, context));
};

exports.testTruncateFilter = function () {
    var string = 'foobarbaz';
    var skin = createSkin('<% value | truncate limit="10" %>');
    var context = {value: string, truncate_filter: filters.truncate_filter};
    // This filter shall leave short enough strings alone.
    assertEqual(string, render(skin, context));
};
