var assert = require("assert");
include('ringo/skin');
var filters = require('ringo/skin/filters');

exports.testBasic = function () {
    var skin = createSkin('simple');
    assert.strictEqual('simple', render(skin));
    assert.strictEqual('simple', render(skin, {}));
};

exports.testValue = function () {
    var skin = createSkin('before <% value %> after');
    var context = {value: 'HERE'};
    assert.strictEqual('before HERE after', render(skin, context));
};

exports.testMacro = function () {
    var skin, context;

    skin = createSkin('before <% foo %> after');
    context = {foo_macro: function () 'HERE'};
    assert.strictEqual('before HERE after', render(skin, context));

    skin = createSkin('before <% foo HERE %> after');
    context = {foo_macro: function (macro) macro.parameters[0]};
    assert.strictEqual('before HERE after', render(skin, context));

    skin = createSkin('before <% foo bar=HERE %> after');
    context = {foo_macro: function (macro) macro.getParameter('bar')};
    assert.strictEqual('before HERE after', render(skin, context));
};

exports.testNestedMacro = function () {
    var skin = createSkin('<% echo <% foo %> %>');

    assert.strictEqual('a', render(skin, {foo: 'a'}));

    // ensure that rendering a skin (with nested macros) multiple times in
    // differing contexts works as expected.
    assert.strictEqual('b', render(skin, {foo: 'b'}));
};

exports.testFilter = function () {
    var skin, context;

    skin = createSkin('before <% x | foo %> after');
    context = {foo_filter: function (str) 'HERE'};
    assert.strictEqual('before HERE after', render(skin, context));

    skin = createSkin('before <% x | foo HERE %> after');
    context = {foo_filter: function (str, filter) filter.parameters[0]};
    assert.strictEqual('before HERE after', render(skin, context));

    skin = createSkin('before <% x | foo bar=HERE %> after');
    context = {foo_filter: function (str, filter) filter.getParameter('bar')};
    assert.strictEqual('before HERE after', render(skin, context));
};

exports.testSubskin = function () {
    var skin;
    var context;

    skin = createSkin('a<% subskin sub %>b');
    assert.strictEqual('a', render(skin));

    skin = createSkin('a<% render sub %><% subskin sub %>b');
    assert.strictEqual('ab', render(skin));

    skin = createSkin('a<% s %><% subskin sub %>b');
    context = {
        s_macro: function(macro, context, skin) skin.renderSubskin('sub')
    };
    assert.strictEqual('ab', render(skin, context));
};

exports.testSubskinWhitespace = function () {
    var skin;

    skin = createSkin('a\n<% subskin sub %>\nb\n');
    assert.strictEqual('a\n', render(skin));

    skin = createSkin('a\n<% render sub %>\n<% subskin sub %>\nb\n');
    assert.strictEqual('a\n\nb\n', render(skin));
};

exports.testExtends = function () {
    var skin;

    skin = createSkin(getResource('./skins/child.html'));
    assert.strictEqual('foo\n\nbar', render(skin).trim());
}

exports.testExternalSubskin = function () {
    var skin;

    skin = createSkin(getResource('./skins/foo.html'));
    assert.strictEqual('foo\nbar\nbaz\n', render(skin));
};

// --- builtins ---

exports.testIfBuiltin = function () {
    var skin = createSkin('<% if <% x %> render tt %>' +
                          '<% if not <% x %> render ff %>' +
                          '\n<% x %>' +
                          '<% subskin tt %>tt' +
                          '<% subskin ff %>ff');

    assert.strictEqual('tt\ntrue',     render(skin, {x: true}).trim());
    assert.strictEqual('tt\n42',       render(skin, {x: 42}).trim());
    assert.strictEqual('tt',           render(skin, {x: []}).trim());

    assert.strictEqual('ff\nfalse',    render(skin, {x: false}).trim());
    assert.strictEqual('ff',           render(skin, {x: null}).trim());
    assert.strictEqual('ff',           render(skin, {}).trim());
};

exports.testForBuiltinBasic = function () {
    var skin;

    skin = createSkin('<% for x in <% xs %> render item %>' +
                      '<% subskin item %><% x %>,');
    assert.strictEqual('foo,bar,baz,', render(skin, {xs: ['foo', 'bar', 'baz']}));
    assert.strictEqual('',             render(skin, {xs: []}));

    skin = createSkin('<% for x in ["Foo", "Bar", "Baz"] render item %>' +
                      '<% subskin item %><% x %>');
    assert.strictEqual('FooBarBaz',    render(skin));

    skin = createSkin('<% for x in [Foo, Bar, Baz] render item %>' +
                      '<% subskin item %><% x %>');
    assert.strictEqual('FooBarBaz',    render(skin));
};

exports.testForBuiltinSeparator = function () {
    var skin = createSkin('<% for x in <% xs %> separator=: render item %>' +
                          '<% subskin item %><% x %>');
    assert.strictEqual('foo:bar:baz',  render(skin, {xs: ['foo', 'bar', 'baz']}));
    assert.strictEqual('foo',          render(skin, {xs: ['foo']}));
    assert.strictEqual('',             render(skin, {xs: []}));
};

exports.testForBuiltinWrap = function () {
    var skin = createSkin('<% for x in <% xs %> wrap=[A,Z] render item %>' +
                          '<% subskin item %><% x %>');
    assert.strictEqual('AaZAbZAcZ',    render(skin, {xs: ['a', 'b', 'c']}));
    assert.strictEqual('AaZ',          render(skin, {xs: ['a']}));
    assert.strictEqual('',             render(skin, {xs: []}));
};

exports.testForBuiltinIndex = function () {
    var skin = createSkin('<% for x in <% xs %> render item %>' +
                          '<% subskin item %><% index %>');
    assert.strictEqual('012',          render(skin, {xs: ['a', 'b', 'c']}));
    assert.strictEqual('0',            render(skin, {xs: ['a']}));
    assert.strictEqual('',             render(skin, {xs: []}));
};

exports.testForBuiltinNestedFor = function () {
    var skin;

    skin = createSkin('<% for x in <% xs %> and y in <% ys %> render item %>' +
                      '<% subskin item %>(<% x %><% y %>)');
    assert.strictEqual('(14)(15)(24)(25)', render(skin, {xs: [1, 2], ys: [4, 5]}));

    skin = createSkin('<% for x in <% xs %> for y in <% ys %> render item %>' +
                      '<% subskin item %>(<% x %><% y %>)');
    assert.strictEqual('(14)(15)(24)(25)', render(skin, {xs: [1, 2], ys: [4, 5]}));
};

exports.testSetBuiltin = function () {
    var skin;

    skin = createSkin('<% set {x: "foo"} render item %>' +
                      '<% subskin item %><% x %>');
    assert.strictEqual('foo', render(skin));
    assert.strictEqual('foo', render(skin, {x: 'bar'}));

    skin = createSkin('<% render item %>' +
                      '<% set {x: "Override"} render item %>' +
                      '<% render item %>' +
                      '<% subskin item %><% x %>');
    assert.strictEqual('OriginalOverrideOriginal', render(skin, {x: 'Original'}));
};

// --- filters ---

exports.testLowercaseFilter = function () {
    var string = 'ALL CAPS';
    var skin = createSkin('<% value | lowercase %>');
    var context = {value: string, lowercase_filter: filters.lowercase_filter};
    assert.strictEqual(string.toLowerCase(), render(skin, context));
};

exports.testUppercaseFilter = function () {
    var string = 'wannabe caps';
    var skin = createSkin('<% value | uppercase %>');
    var context = {value: string, uppercase_filter: filters.uppercase_filter};
    assert.strictEqual(string.toUpperCase(), render(skin, context));
};

exports.testCapitalizeFilter = function () {
    var string = 'capitalize me.';
    var skin = createSkin('<% value | capitalize %>');
    var context = {value: string, capitalize_filter: filters.capitalize_filter};
    assert.strictEqual(string.capitalize(), render(skin, context));
};

exports.testTitleizeFilter = function () {
    var string = 'titleize me';
    var skin = createSkin('<% value | titleize %>');
    var context = {value: string, titleize_filter: filters.titleize_filter};
    assert.strictEqual(string.titleize(), render(skin, context));
};

exports.testTrimFilter = function () {
    var string = ' trim me  ';
    var skin = createSkin('<% value | trim %>');
    var context = {value: string, trim_filter: filters.trim_filter};
    assert.strictEqual(string.trim(), render(skin, context));
};

exports.testStripTagsFilter = function () {
    var string = '<tag>content</tag>';
    var skin = createSkin('<% value | stripTags %>');
    var context = {value: string, stripTags_filter: filters.stripTags_filter};
    assert.strictEqual(string.stripTags(), render(skin, context));
};

exports.testEscapeUrlFilter = function () {
    var string = 'http://ringojs.org/Web Framework/';
    var skin = createSkin('<% value | escapeUrl %>');
    var context = {value: string, escapeUrl_filter: filters.escapeUrl_filter};
    assert.strictEqual(java.net.URLEncoder.encode(string, 'utf8'),
            render(skin, context));
};

exports.testEscapeHtmlFilter = function () {
    var string = '<p>Some text.</p>';
    var skin = createSkin('<% value | escapeHtml %>');
    var context = {value: string, escapeHtml_filter: filters.escapeHtml_filter};
    assert.strictEqual(string.escapeHtml(), render(skin, context));
};

exports.testTruncateFilter = function () {
    var string = 'foobarbaz';
    var skin = createSkin('<% value | truncate limit="10" %>');
    var context = {value: string, truncate_filter: filters.truncate_filter};
    // This filter shall leave short enough strings alone.
    assert.strictEqual(string, render(skin, context));
};
