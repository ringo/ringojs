include('ringo/markdown');
require('core/string');

exports.href_macro = function(tag) {
    var req = require('ringo/webapp/env').getRequest();
    return req.rootPath + (tag.parameters[0] || '');
};

exports.matchPath_macro = function(tag) {
    var req = require('ringo/webapp/env').getRequest();
    if (req && req.path &&
        req.path.substring(req.rootPath.length).match(tag.parameters[0])) {
        return tag.parameters[1] || "match";
    }
};

exports.markdown_filter = function(content) {
    var markdown = new Markdown({});
    return markdown.process(content);
};

exports.ifOdd_macro = function(tag, context) {
    var number = context["index"];
    if (isFinite(number) && number % 2 === 1)
        return tag.parameters.join("");
};

exports.ifEven_macro = function(tag, context) {
    var number = context["index"];
    if (isFinite(number) && number % 2 === 0)
        return tag.parameters.join("");
};
