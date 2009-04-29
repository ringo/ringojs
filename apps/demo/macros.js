include('helma/markdown');
require('core/string');

exports.markdown_filter = function(content) {
    var markdown = new Markdown({

        lookupLink: function(id) {
            if (id.startsWith("ng:")) {
                var path = id.substring(3);
                var title = path ? "Helma NG Wiki: " + path : "Helma NG Wiki";
                return ["http://dev.helma.org/ng/" + path.replace(/ /g, '+'), title];
            }
            return null;
        },

        openTag: function(tag, buffer) {
            if (tag === "pre") {
                buffer.append("<pre class='code'>");
            } else {
                this.super$openTag(tag, buffer);
            }
        }
    });
    return markdown.process(content);
};
