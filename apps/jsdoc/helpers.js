
var STRING = require('ringo/utils/string');
var ARRAY = require('ringo/utils/array');
var {Markdown} = require('ringo/markdown');
var {Buffer} = require('ringo/buffer');

exports.fileoverview_filter = function(docs) {
    var buffer = new Buffer();
    if (docs.fileoverview) {
        buffer.write('<div class="fileoverview">');
        buffer.write(renderMarkdown(docs.fileoverview.getTag("fileoverview")));
        buffer.writeln('</div>');
        renderStandardTags(docs.fileoverview, buffer);
    }
    var topItems = {children: {}};
    for (var i = 0; i < docs.length; i++) {
        var doc = docs[i];
        var name = doc.name;
        // pragmatical class detection
        var next = docs[i + 1];
        doc.isClass = doc.isClass ||
                (isClassName(name) && isClassMember(name, next && next.name));
        var path = name.split(".");
        // FIXME: __iterator__ property breaks TOC enumeration
        if (ARRAY.peek(path) == "__iterator__") continue;
        var id = doc.id = path.join("_");
        var parent = topItems;
        for (var p = 0, l = path.length - 1; p < l; p++) {
            var elem = path[p];
            if (elem == "prototype" || elem == "instance") {
                elem = doc.isFunction ? "Instance Methods" : "Instance Properties";
            }
            parent = getGroup(parent, elem, parent == topItems && isClassName(elem));
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
    buffer.writeln('<h3 class="section">Overview</h3>');
    function render(node, name, prefix) {
        if (name) {
            buffer.write('<li>');
            if (node.item) {
                var item = node.item;
                if (node.isClass) name = "Class " + name;
                buffer.write('<a href="#')
                        .write(item.id, '">', name);
                if (item.isFunction && !item.isClass) {
                    buffer.write('<span class="params">(', item.getParameterNames(), ')</span>');
                }
                buffer.writeln('</a>');
            } else {
                node.isClass ?
                    buffer.write("Class ", name) :
                    buffer.write("<i>", name, "</i>");
            }
        }
        var hasList = false;
        for (var child in node.children) {
            if (!hasList) {
                buffer.writeln('<ul class="apilist">');
                hasList = true;
            }
            render(node.children[child], child);
        }
        if (hasList) {
            buffer.writeln('</ul>');
        }
        if (name) {
            buffer.writeln('</li>');            
        }
    }
    render(topItems, null, "");
    buffer.writeln('<h3 class="section">Detail</h3>');
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
    if (doc.isFunction) {
        buffer.write('(<span class="dimmed">');
        buffer.write(doc.getParameterNames());
        buffer.write('</span>)');
    }
    // doc header anchor link
    buffer.write('<a href="#', doc.id, '">');
    buffer.write(' &#182; </a>');
    return buffer;
};

exports.renderDoc_filter = function(doc) {
    var buffer = new Buffer(renderMarkdown(doc.getTag("desc") || "No description available."));
    renderStandardTags(doc, buffer);
    var paramList = doc.getParameterList();
    if (paramList && paramList.length > 0) {
        buffer.writeln('<div class="subheader">Parameters</div>');
        buffer.writeln('<table class="subsection">');
        for each (var param in paramList) {
            buffer.write('<tr><td>');
            var name = '<b>' + param.name + '</b>';
            buffer.write([param.type, name, param.desc].join('</td><td>'));
            buffer.writeln('</td></tr>');
        }
        buffer.writeln('</table>');
    }
    var returns = doc.getTag("returns") || doc.getTag("return");
    var type = doc.getTag("type");
    if (returns) {
        buffer.writeln('<div class="subheader">Returns</div>');
        if (!type) {
            type = returns.match(/^{(\S+)}/) || "";
            if (type) {
                returns = returns.substring(type[0].length);
                type = type[1];
            }
        }
        buffer.writeln('<table class="subsection">');
        buffer.writeln('<tr><td>', type, '</td><td>', returns, '</td></tr>');
        buffer.writeln('</table>');
    } else if (type) {
        buffer.writeln('<div class="subheader">Type</div>');
        buffer.writeln('<table class="subsection">');
        buffer.writeln('<tr><td>', type, '</td></tr>');
        buffer.writeln('</table>');
    }
    var throws = doc.getTags("throws");
    if (throws.length) {
        buffer.writeln('<div class="subheader">Throws</div>');
        for each (var error in throws) {
            buffer.writeln('<div class="subsection">', error, '</div>');
        }
    }
    var see = doc.getTags("see");
    if (see.length) {
        buffer.writeln('<div class="subheader">See</div>');
        for each (var link in see) {
            if (STRING.isUrl(link)) {
                link = '<a href="' + link + '">' + link + '</a>';
            } else {
                // apply some sanity checks to local targets like removing hashes and parantheses
                link = link.replace(/^#/, '');
                var id = link.replace(/\./g, '_').replace(/[\(\)]/g, '');
                link = '<a href="#' + id + '">' + link + '</a>';
            }
            buffer.writeln('<div class="subsection">', link, '</div>');
        }
    }
    return buffer;
};

function renderStandardTags(doc, buffer) {
    var example = doc.getTag("example");
    if (example) {
        buffer.writeln('<div class="subheader">Example</div>');
        buffer.writeln('<pre class="sh_javascript">', example, '</pre>');
    }
    var since = doc.getTag("since") ||  doc.getTag("version");
    if (since) {
        buffer.writeln('<div class="subheader">Since</div>');
        buffer.writeln('<div class="subsection">', since, '</div>');        
    }
    var deprecated = doc.getTag("deprecated");
    if (deprecated != null) {
        buffer.writeln('<div class="subheader">Deprecated</div>');
        if (deprecated) {
            buffer.writeln('<div class="subsection">', deprecated, '</div>');
        }
    }
}

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

function isClassName(name) {
    // check for capitalized name
    return name && name[0] == name[0].toUpperCase();
}

function isClassMember(name, childName) {
    // check if child name is a property of name
    return childName && STRING.startsWith(childName, name + ".");
}

function renderMarkdown(text) {
    return new Markdown({
        getLink: function(id) {
            return [id.replace(/\./g, "_"), null];
        }
    }).process(text);
}
