
exports.renderName_filter = function(doc) {
    var name = doc.name;
    var dot = name.lastIndexOf('.') + 1;
    if (dot > 0) {
        name = [
            '<span class="dimmed">',
            name.substring(0, dot),
            '</span>',
            name.substring(dot)
        ].join("");
    }
    var params = doc.getTags("param");
    var returns = doc.getTag("return");
    var isFunction = params.length || returns
            || doc.getTag("function") != null
            || doc.getTag("constructor") != null;
    if (isFunction) {
        name += '(<span class="dimmed">';
        for (var i = 0; i < params.length; i++) {
            var words = params[i].split(" ");
            var type = words[0].match(/^{(\S+)}$/);
            type = type && type[1];
            var pname = type ? words[1] : words[0];
            // var text = words.slice(type ? 2 : 1).join(" ");
            if (i > 0) name += ", ";
            name += pname;
        }
        name += '</span>)';
    }
    return name;
};