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

/**
 * Returns url to a repository
 * @param {String} repositoryName
 */
exports.repositoryUrl_macro = function(tag, context) {
    var rootPath = tag.parameters[0];
    var repositoryName = tag.parameters[1];
    if (context.isSingleRepo) {
        return rootPath;
    }
    return rootPath + repositoryName + '/';
};

/**
 * Retruns url to a module
 * @param {String} repositoryName
 * @param {String} moduleId
 */
exports.moduleUrl_macro = function(tag, context) {
    var rootPath = tag.parameters[0];
    var repositoryName = tag.parameters[1];
    var moduleId = tag.parameters[2];
    if (context.isSingleRepo) {
        return rootPath + moduleId;
    }
    return rootPath + repositoryName + '/' + moduleId;
};
