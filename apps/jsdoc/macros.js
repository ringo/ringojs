/**
 * Returns a comma seperated list of the specified property for all items passed.
 * @param {String} property the property to enumerate
 */
exports.listProperty_filter = function(items, tag) {
    var prop = tag.parameters[0] || tag.getParameter('property');
    var params = (items || []).map(function(param) {
        return param[prop];
    });
    return params.join(', ');
};

/**
 * Return the string joined by the specified seperater, default: ','
 * @param {String}
 */
exports.join_filter = function(items, tag) {
    return items.join(tag.parameters[0] || ',');
};
