include('ringo/markdown');
require('core/string');

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
