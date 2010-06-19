#!/usr/bin/env ringo
/**
 * @fileoverview Script to create static JsDoc documentation.
 *      Use -h or --help to get a list of available options.
 *
 * @see http://code.google.com/p/jsdoc-toolkit/
 */
 
// stdlib
var fileutils = require('ringo/fileutils');
var {makeTree, write, copyTree, join, Path} = require('fs');
var {render} = require('ringo/skin');
var {Parser} = require('ringo/args');
var {isFile, isDirectory} = require('fs-base');
var {ScriptRepository} = require('ringo/jsdoc');

// custom
var {repositoryList, moduleDoc, moduleList, structureModuleDoc, getRepositoryName} = require('./jsdocserializer');
var config = require('./config.js');

// need apps/jsdoc on path for skin extend to work
require.paths.unshift(module.directory);

// for all rendering we will need config.macros in context
var defaultContext = {};
for each (var moduleId in config.macros) {
    defaultContext = Object.merge(defaultContext ,require(fileutils.resolveId(module.directory, moduleId)));
}

/**
 * Write documentation page repository listing to directory. Corresponds to actions:index
 *
 * @param {String} target
 * @param {Array} repositories list of repositories
 * @see {./jsdocserializer.repositoryList}
 */
function writeRepositoryList(target, repositories) {
    var repoListHtml = render('./skins/index.html', 
        Object.merge(defaultContext, {
        repositories: repositories,
        rootPath: './',
        })
    );
    write(join(target, 'index.html'), repoListHtml);
    return;
};

/**
 * Copy static files of this webapp to directory
 *
 * @param {String} target 
 */
function copyStaticFiles(target) {
    makeTree(join(target, 'static'));
    copyTree(join(module.directory, 'static'), join(target, 'static'));
    return;
};

/**
 * Write the module list to directory. Corresponds to actions:repository
 *
 * @param {String} target directory of file to be written
 * @param {String} repository path
 * @param {Boolean} isSingleRepo true if this repo is part of a single repo doc
 */
function writeModuleList(target, repositoryPath, isSingleRepo) {
    isSingleRepo = isSingleRepo || false;
    
    // modulelist's url in multi repo: /repo/module/
    // modulelist's url in single repo: /module/
    var rootPath = isSingleRepo === true ? './' : '../';
    
    var repositoryHtml = render('./skins/repository.html', 
        Object.merge(defaultContext, {
            repositoryName: getRepositoryName(repositoryPath),
            modules: moduleList(repositoryPath),
            rootPath: rootPath,
            // NOTE this context prop is read by macro to determine urls
            isSingleRepo: isSingleRepo,
        })
    );
    write(join(target, 'index.html'), repositoryHtml);
};

/**
 * Write documentation page for a module to directory. corresponds to actions:module
 *
 * @param {String} directory
 * @param {String} repository path
 * @param {String} moduleId
 * @param {Boolean} isSingleModule true if this is the only html page that will be rendered
 * @param {Boolean} isSingleRepo true if this is a html page part of a single repo documentation
 */
var writeModuleDoc = function writeModuleDoc(target, repositoryPath, moduleId, isSingleModule, isSingleRepo){
    isSingleModule = isSingleModule || false;
    isSingleRepo = isSingleRepo || false;
    
    // FIXME use util/* functions instead of core/*... once they landed
    include('core/string');
    
    var moduleDirectory = target;
    var rootPath = './';
    var modules = [];
    // if it's not a single module it lives in its own directory & needs modulelist
    if (!isSingleModule) {
        moduleDirectory = join(target, moduleId);
        makeTree(moduleDirectory);
        var slashCount = moduleId.count('/');
        rootPath = '../../' + '../'.repeat(slashCount);
        // a single repo does not have the 'repo' part of a url
        if (isSingleRepo) {
            rootPath = '../' + '../'.repeat(slashCount);
        }
        modules = moduleList(repositoryPath);
    }
    
    var docs = moduleDoc(repositoryPath, moduleId);
    if (docs == null) {
        throw new Error('Could not parse JsDoc for ' + repositoryPath + moduleId);
    }
    
    var moduleHtml = render('./skins/module.html', 
        Object.merge(defaultContext, {
            rootPath: rootPath,
            repositoryName: getRepositoryName(repositoryPath),
            moduleId: moduleId,
            modules: modules,
            module: structureModuleDoc(docs),
            isSingleRepo: isSingleRepo
        })
    );

    var moduleFile = join(moduleDirectory, 'index.html');
    write(moduleFile, moduleHtml);
    return;
};


/**
 * Create static documentation for a Module, a Repository or multiple Repositories.
 *
 * A single module can be specified as the moduleit of a module in require.paths.
 * Only one html page describing that module will be rendered.
 *    statify -s ringo/skin
 *
 * One ore more repositories can be rendered. If more then one repository is
 * passed, the repository overview page will be rendered
 *
 *   statify -s /home/simon/ringojs/modules/
 *   statify -s /home/simon/ringojs/modules/:/home/simon/ringojs.ringo/modules/
 *
 * @param args
 */
function main(args) {

    /**
     * Print script help
     */
    function help() {
        print("Create javascript documentation for commonjs modules or whole packages.");
        print("Usage:");
        print("  ringo " + script + " -s [sourcepath]");
        print("Options:");
        print(parser.help());
        return;
    };
    
    /**
     * @returns true if the given string is a moduleid on require.paths
     */
    function isModuleId(moduleId) {
        try {
            require(moduleId);
            return true;
        } catch(e) {
            // do not care
        }
        return false;
    };
    
    /**
     * Returns the first repository's path on require.paths which holds the given moduleid.
     * @params {String} moduleId
     * @returns {ScriptRepository}
     */
    function getRepositoryPath(moduleId) {
        var repositoryPath = null;
        require.paths.some(function(path, repoId) {
            var repo = new ScriptRepository(path);
            var res = repo.getScriptResource(moduleId + '.js');
            if (res.exists()) {
                repositoryPath = path;
                return true;
            }
            return false;
        });
        return repositoryPath;
    };

    var script = args.shift();
    var parser = new Parser();
    parser.addOption("s", "source", "module|repository", "Moduleid or list of : seperated paths ");
    parser.addOption("d", "directory", "directory", "Directory for output files (default: 'out')");
    parser.addOption("q", "quiet", null, "Do not output any messages.");
    parser.addOption("h", "help", null, "Print help message and exit");
    var opts = parser.parse(args);
    if (opts.help) {
        help();
        return;
    }
    if (!opts.source) {
        throw new Error('No source specified.');
    }
    
    var exportDirectory = join(opts.directory || './out/');
    var sources = opts.source.split(':');
    var quiet = opts.quiet || false;

    // check if export dir exists & is empty
    var dest = new Path(exportDirectory);
    if (dest.exists() && !dest.isDirectory()) {
        throw new Error(dest + " exists but is not a directory.");
    } else if (dest.isDirectory() && dest.list().length > 0) {
        throw new Error("Directory " + dest + " exists but is not empty");
    }
    
    // figure out what kind of doc we write, single module, multi repos 
    // or single repo
    var sourceIsDirectory = isDirectory(sources[0]);
    var isMultiRepos = sourceIsDirectory && sources.length > 1;
    var isSingleModule = !isMultiRepos && isModuleId(sources[0]);
    if (!isSingleModule && !isMultiRepos && !sourceIsDirectory) {
        throw new Error('Invalid source specified.');
        return;
    }
    
    if (!quiet) print ('Writing to ' + exportDirectory + '...');
    
    // single module is one html file & static dir
    if (isSingleModule) {
        var moduleId = sources[0];
        // find the repository this module is in
        var repositoryPath = getRepositoryPath(moduleId);
        if (!repositoryPath) {
            throw new Error('Can not find ' + moduleId + ' in require.paths: ', require.paths);
            return;
        }
        copyStaticFiles(exportDirectory);
        if (!quiet) print(moduleId);
        writeModuleDoc(exportDirectory, repositoryPath, moduleId, true);
    // multi repos: show everything we got
    } else if (isMultiRepos) {
        var repos = repositoryList(sources);
        writeRepositoryList(exportDirectory, repos);
        copyStaticFiles(exportDirectory);
        for (var repoName in repos) {
            var repoPath = repos[repoName];
            var directory = join(exportDirectory, repoName);
            makeTree(directory);
            if (!quiet) print(repoPath);
            writeModuleList(directory, repoPath);
            // render module view
            moduleList(repoPath).forEach(function(module) {
                if (!quiet) print('\t' + module.id);
                writeModuleDoc(directory, repoPath, module.id);
                return;
            });
        };
    // single repo has no repo list
    } else {
        copyStaticFiles(exportDirectory);
        var repositoryPath = sources[0];
        if (!quiet) print(repositoryPath);
        writeModuleList(exportDirectory, repositoryPath, true);
        moduleList(repositoryPath).forEach(function(module) {
            if (!quiet) print('\t' + module.id);
            writeModuleDoc(exportDirectory, repositoryPath, module.id, false, true);
        });
    
    };
    if (!quiet) print('Finished writing to ' + exportDirectory);
    return;  
};

if (require.main == module) {
    try {
        main(system.args);
    } catch (error) {
        print(error);
        print("Use -h or --help to get a list of available options.");
    }
}
