// stdlib
var {Response} = require('ringo/webapp/response');

// custom
var {repositoryList, moduleList, moduleDoc, structureModuleDoc, getRepositoryName} = require('./jsdocserializer');
var config = require('./config');

/**
 * A Repository's module list.
 */
exports.repository = function(req) {
    var repositoryPath = config.repository.path;
    var repositoryName = config.repository.name;
    return Response.skin('./skins/repository.html', {
        rootPath: require('./config').rootPath,
        repositoryName: repositoryName,
        modules: moduleList(repositoryPath, config.detailedModuleList),
    });
};

/**
 * Module Documentation Page.
 */
exports.module = function(req, moduleId) {
    var repositoryPath = config.repository.path;
    var repositoryName = config.repository.name;
    moduleId = moduleId.slice(-1) === '/' ? moduleId.slice(0,-1) : moduleId;
    return Response.skin('./skins/module.html', {
        rootPath: require('./config').rootPath,
        repositoryName: repositoryName,
        moduleId: moduleId,
        modules: moduleList(repositoryPath),
        module: structureModuleDoc(moduleDoc(repositoryPath, moduleId)),
    });
};
