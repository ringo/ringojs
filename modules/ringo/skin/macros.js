var {Markdown} = require('ringo/markdown');
var files = require('ringo/utils/files');
var webenv = require('ringo/webapp/env');

exports.href_macro = function(tag) {
    var req = webenv.getRequest();
    var path = tag.parameters[0] || '';
    return req.rootPath + files.resolveUri('/', req.appPath, path).slice(1);
};

exports.matchPath_macro = function(tag) {
    var req = webenv.getRequest();
    var path = tag.parameters[0];
    if (req && ('/' + req.appPath).match(path)) {
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
