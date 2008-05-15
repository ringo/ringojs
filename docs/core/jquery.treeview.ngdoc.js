/*
 * Async Treeview 0.1 - Lazy-loading extension for Treeview
 * 
 * http://bassistance.de/jquery-plugins/jquery-plugin-treeview/
 *
 * Copyright (c) 2007 Jörn Zaefferer
 *
 * Dual licensed under the MIT and GPL licenses:
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.gnu.org/licenses/gpl.html
 *
 * Revision: $Id$
 *
 */

;(function($) {

function load(settings, child, container) {
    // $.getJSON(settings.url, function(response) {
        function createNode(parent, name, obj, prefix) {
            var label = obj.type == "method" ? name + "()" : name
            var current = $("<li/>").html("<span>" + label + "</span>").appendTo(parent);
            $(current, ':first-child').click(function() {
                if (obj.type) {
                    var header = prefix + obj.name;
                    if (obj.type == "method") {
                        header = header + "(";
                        for (var p in obj.params) {
                            header += obj.params[p].name;
                            if (p < obj.params.length - 1)
                                header += ", ";
                        }
                        header += ")";
                    }
                    $("#header").html(header);
                    $("#description").html(obj.body || obj.description);
                    if (obj.type == "method" && obj.params.length) {
                        var table =  "<h4>Parameters</h4>";
                        table += "<table border='1' cellpadding='3' cellspacing='0'><tr><th>Name</th><th>Type</th><th>Description</th></tr>";
                        for (var p in obj.params) {
                            var param = obj.params[p];
                            table += "<tr><td>" + param.name + "</td><td>" + param.type + "</td><td>" + param.description + "</td></tr>";
                        }
                        table += "</table>";
                        $("#description").append(table);

                    }
                    if (obj.type == "class") {
                        $(current).expand();
                    }
                    return false;
                }
                return true;
            });
            if (obj.type != "method" && obj.type != "property") {
				var branch = $("<ul/>").appendTo(current);
                if (obj.type == "class") {
                    current.addClass("closed");
                } else {
                    current.addClass("nonCollapsable");
                }
                for (var sub in obj) {
                    if (obj[sub] instanceof Object) {
                        createNode(branch, sub, obj[sub], prefix || obj.name + ".");
                    }
                }
            }
		}
        for (var name in doc) {
            createNode(child, name, doc[name], "");
        }
        $(container).treeview({add: child});
    // });
}

var proxied = $.fn.treeview;
$.fn.treeview = function(settings) {
	if (!settings.url) {
		return proxied.apply(this, arguments);
	}
	var container = this;
	load(settings, this, container);
	return proxied.call(this, settings);
};

})(jQuery);


