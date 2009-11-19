
require('core/string');
var Buffer = require('helma/buffer').Buffer;

exports.fileoverview_filter = function(doc) {
    var buffer = new Buffer('<div class="fileoverview">');
    if (doc.fileoverview) {
        buffer.write(doc.fileoverview.getTag("fileoverview"));
    }
    buffer.writeln('</div>')
            .writeln('<h2 class="section">Overview</h2>')
            .writeln('<ul class="apilist">');
    for (var i = 0; i < doc.length; i++) {
        var name = doc[i].name;
        var id = name.replace(/\./g, "_");
        buffer.write('<li><a onclick="return goto(\'#');
        buffer.writeln(id, '\')" href="#', id, '">', name, '</a></li>');
    }
    buffer.writeln('</ul>').writeln('<h2 class="section">Detail</h2>');
    return buffer;
};

exports.renderName_filter = function(doc) {
    var name = doc.name;
    var id = name.replace(/\./g, "_");
    var buffer = new Buffer('<a name=\"', id, '\"></a>');
    var dot = name.lastIndexOf('.') + 1;
    if (dot > 0) {
        buffer.write(
            '<span class="dimmed">',
            name.substring(0, dot),
            '</span>',
            name.substring(dot)
        );
    } else {
        buffer.write(name);
    }
    var params = doc.getTags("param");
    var returns = doc.getTag("return");
    var isFunction = params.length || returns
            || doc.getTag("function") != null
            || doc.getTag("constructor") != null;
    var processedParams = [];
    if (isFunction) {
        buffer.write('(<span class="dimmed">');
        for (var i = 0; i < params.length; i++) {
            var words = params[i].split(" ");
            var type = words[0].match(/^{(\S+)}$/);
            type = type && type[1];
            if (i > 0) buffer.write(", ");
            var pname = type ? words[1] : words[0];
            buffer.write(pname);
            // add to processed parameter list
            var desc = words.slice(type ? 2 : 1).join(" ");
            processedParams.push({type: type, name: pname, desc: desc});
        }
        buffer.write('</span>)');
        // cache processed parameters
        doc.processedParams = processedParams;
    }
    return buffer;
};

exports.renderDoc_filter = function(doc) {
    var buffer = new Buffer(doc.getTag("desc") || "No description available.");
    if (doc.processedParams && doc.processedParams.length) {
        buffer.writeln('<div class="subheader">Parameters</div>');
        buffer.writeln('<table class="subsection">');
        for each (var param in doc.processedParams) {
            buffer.write('<tr><td>');
            buffer.write([param.type, '<b>'+param.name+'</b>', param.desc].join('</td><td>'));
            buffer.writeln('</td></tr>');
        }
        buffer.writeln('</table>');
    }
    var returns = doc.getTag("return");
    if (returns) {
        buffer.writeln('<div class="subheader">Returns</div>');
        var type = returns.match(/^{(\S+)}/) || "";
        if (type) {
            returns = desc.substring(type[0].length)
            type = type[1]
        }
        buffer.writeln('<table class="subsection">');
        buffer.writeln('<tr><td>', type, '</td><td>', returns, '</td></tr>');
        buffer.writeln('</table>');
    }
    var see = doc.getTags("see");
    if (see.length) {
        buffer.writeln('<div class="subheader">See</div>');
        for each (var link in see) {
            if (link.isUrl()) {
                link = '<a href="' + link + '">' + link + '</a>';
            } else {
                // apply some sanity checks to local targets like removing hashes and parantheses
                link = link.replace(/^#/, '');
                var id = link.replace(/\./g, '_').replace(/[\(\)]/g, '');
                link = '<a onclick="return goto(\'#' + id + '\')" href="#' + id + '">' + link + '</a>';
            }
            buffer.writeln('<div class="subsection">', link, '</div>');
        }
    }
    return buffer;
};
