// stdlib
include('ringo/webapp/response');
// custom
var {repositoryList, moduleList, moduleDoc, structureModuleDoc, getRepositoryName} = require('./jsdocserializer');
var config = require('./config');

/** 
 * List of repositories to choose from.
 */
exports.index = function(req) {
    return skinResponse('./skins/index.html', {
        rootPath: require('./config').rootPath,
        repositories: config.scriptRepositories || repositoryList(require.paths),
    });
};

/**
 * A Repository's module list.
 */
exports.repository = function(req, repositoryName) {
    var repositoryPath = config.scriptRepositories && config.scriptRepositories[repositoryName] ||
                    repositoryList(require.paths)[repositoryName];
    return skinResponse('./skins/repository.html', {
        rootPath: require('./config').rootPath,
        repositoryName: repositoryName,
        modules: moduleList(repositoryPath, config.detailedModuleList),
    });
};

/**
 * Module Documentation Page.
 */
exports.module = function(req, repositoryName, moduleId) {
    moduleId = moduleId.slice(-1) === '/' ? moduleId.slice(0,-1) : moduleId;
    var repositoryPath = config.scriptRepositories && config.scriptRepositories[repositoryName] ||
                    repositoryList(require.paths)[repositoryName];
    return skinResponse('./skins/module.html', {
        rootPath: require('./config').rootPath,
        repositoryName: repositoryName,
        moduleId: moduleId,
        modules: moduleList(repositoryPath),
        module: structureModuleDoc(moduleDoc(repositoryPath, moduleId)),
    });
};
