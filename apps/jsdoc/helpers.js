
require('core/string');
require('core/array');
var Buffer = require('helma/buffer').Buffer;

exports.fileoverview_filter = function(docs) {
    var buffer = new Buffer('<div class="fileoverview">');
    if (docs.fileoverview) {
        buffer.write(docs.fileoverview.getTag("fileoverview"));
    }
    var topItems = {children: {}};
    for (var i = 0; i < docs.length; i++) {
        var doc = docs[i];
        var name = doc.name;
        // pragmatical class detection
        doc.isClass = doc.isClass || docs[i + 1] && docs[i + 1].name.startsWith(name + ".");
        var path = name.split(".");
        // FIXME: __iterator__ property breaks TOC enumeration
        if (path.peek() == "__iterator__") continue;
        var id = doc.id = path.join("_");
        var parent = topItems;
        for (var p = 0, l = path.length - 1; p < l; p++) {
            var elem = path[p];
            if (elem == "prototype" || elem == "instance") {
                elem = doc.isFunction ? "Instance Methods" : "Instance Properties";
            }
            parent = getGroup(parent, elem, parent == topItems);
        }
        // try to detect static members
        if (parent.isClass) {
            var staticName = doc.isFunction ? "Static Methods" : "Static Properties";
            parent = getGroup(parent, staticName, false);
        } else if (parent == topItems && !doc.isClass) {
            var groupName = doc.isFunction ? "Functions" : "Properties";
            parent = getGroup(parent, groupName, false);
        }
        parent.children[path[p]] = doc.node = {
            item: doc,
            children: {},
            isClass: doc.isClass
        };
    }
    buffer.writeln('</div>')
            .writeln('<h2 class="section">Overview</h2>');
    function render(node, name, prefix) {
        if (name) {
            buffer.write('<li>');
            if (node.item) {
                var item = node.item;
                if (item.isFunction && !item.isClass) name += "()";
                if (node.isClass) name = "Class " + name;
                buffer.write('<a onclick="return goto(\'#')
                        .write(item.id, '\')" href="#')
                        .write(item.id, '">', name, '</a>');
                // if (node.isClass) buffer.write('</b>');
            } else {
                node.isClass ?
                    buffer.write("Class ", name) :
                    buffer.write("<i>", name, "</i>");
            }
            buffer.writeln('</li>');
        }
        buffer.writeln('<ul class="apilist">')
        for (var child in node.children) {
            render(node.children[child], child);
        }
        buffer.writeln('</ul>');
    }
    render(topItems, null, "");
    buffer.writeln('<h2 class="section">Detail</h2>');
    return buffer;
};

exports.renderName_filter = function(doc) {
    var name = doc.name;
    var id = name.replace(/\./g, "_");
    var buffer = new Buffer('<a name=\"', id, '\"></a>');
    var dot1 = name.indexOf('.');
    var dot2 = name.lastIndexOf('.');
    if (dot1 != dot2) {
        buffer.write(
            name.substring(0, dot1),
            '<span class="dimmed">',
            name.substring(dot1, dot2 + 1),
            '</span>',
            name.substring(dot2 + 1)
        );
    } else {
        buffer.write(name);
    }
    var processedParams = [];
    if (doc.isFunction) {
        var params = doc.getTags("param");
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
    // doc header anchor link
    buffer.write('<a onclick="return goto(\'#', doc.id, '\')" href="#', doc.id, '">');
    buffer.write(' &#182; </a>');
    return buffer;
};

exports.renderDoc_filter = function(doc) {
    var buffer = new Buffer(doc.getTag("desc") || "No description available.");
    if (doc.processedParams && doc.processedParams.length) {
        buffer.writeln('<div class="subheader">Parameters</div>');
        buffer.writeln('<table class="subsection">');
        for each (var param in doc.processedParams) {
            buffer.write('<tr><td>');
            var name = '<b>'+param.name+'</b>'; 
            buffer.write([param.type, name, param.desc].join('</td><td>'));
            buffer.writeln('</td></tr>');
        }
        buffer.writeln('</table>');
    }
    var returns = doc.getTag("return");
    if (returns) {
        buffer.writeln('<div class="subheader">Returns</div>');
        var type = returns.match(/^{(\S+)}/) || "";
        if (type) {
            returns = returns.substring(type[0].length)
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
                link = '<a onclick="return goto(\'#' + id
                        + '\')" href="#' + id + '">' + link + '</a>';
            }
            buffer.writeln('<div class="subsection">', link, '</div>');
        }
    }
    return buffer;
};

function getGroup(parent, groupName, isClass) {
    var group = parent.children[groupName];
    if (!group) {
        group = parent.children[groupName] = {
            children: {},
            isClass: isClass
        };
    }
    return group;
}
