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

// need config.macros in context for skin rendering
var defaultContext = {};
config.macros.forEach(function(moduleId) {
    defaultContext = Object.merge(defaultContext ,require(fileutils.resolveId(module.directory, moduleId)));
});

// documentation source types 
const SOURCE_MULTIREPOSITORY = 0
const SOURCE_REPOSITORY = 1;
const SOURCE_MODULE = 2;

// page types
const PAGE_REPOSITORYLIST = 0;
const PAGE_MODULELIST = 1;
const PAGE_MODULE = 2;

/**
 * Get relative root path for one of the following pages:
 *   * repositoryList
 *     * moduleList
 *       * moduleDoc
 *
 * The difficulty is that the depth for moduleDoc & moduleList varies depending
 * on the kind of documentation we render (single vs multi module vs multi repository).
 *
 * @param {Number} pageType the type of page we need relative root path for; see PAGE_* consts
 * @param {Number} docSourceType the type of documentation; see RENDER_* consts
 * @param {String} moduleId optional moduleId of module to be rendered if the pageType is module
 */
function getRelativeRootPath(pageType, docSourceType, moduleId) {
    if (pageType == PAGE_REPOSITORYLIST) {
        return './';
    } else if (pageType == PAGE_MODULELIST) {
        return docSourceType === SOURCE_MULTIREPOSITORY ? '../' : './';
    } else if (pageType == PAGE_MODULE) {
        if (docSourceType == SOURCE_MODULE) {
            return './';
        } else {
            var slashCount = moduleId.count('/');
            if (docSourceType == SOURCE_REPOSITORY) {
                return '../' + '../'.repeat(slashCount);
            } else if (docSourceType == SOURCE_MULTIREPOSITORY) {
                return '../../' + '../'.repeat(slashCount);
            }
        }
    }
};

/**
 * Copy static files of this webapp to target directory
 *
 * @param {String} target 
 */
function copyStaticFiles(target) {
    makeTree(join(target, 'static'));
    copyTree(join(module.directory, 'static'), join(target, 'static'));
    return;
};

/**
 * Write documentation page repository listing to directory. Corresponds to actions:index
 *
 * @param {String} target path to write to
 * @param {Array} repositories list of repositories
 * @see {./jsdocserializer.repositoryList}
 */
function writeRepositoryList(target, repositories) {
    var repoListHtml = render('./skins/index.html', 
        Object.merge(defaultContext, {
        repositories: repositories,
        rootPath: getRelativeRootPath(PAGE_REPOSITORYLIST),
        })
    );
    write(join(target, 'index.html'), repoListHtml);
    return;
};

/**
 * Write the module list to directory. Corresponds to actions:repository
 *
 * @param {String} target directory of file to be written
 * @param {String} repository path
 * @param {Number} docSourceType one of RENDER_* consts
 */
function writeModuleList(target, repositoryPath, docSourceType) {
    var repositoryHtml = render('./skins/repository.html', 
        Object.merge(defaultContext, {
            repositoryName: getRepositoryName(repositoryPath),
            modules: moduleList(repositoryPath, true),
            rootPath: getRelativeRootPath(PAGE_MODULELIST, docSourceType),
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
 * @param {Number} docSourceType one of RENDER_* consts
 */
function writeModuleDoc(target, repositoryPath, moduleId, docSourceType){    
    // FIXME use util/* functions instead of core/*... once they landed
    include('core/string');
    
    var moduleDirectory = target;
    var modules = [];
    // not a single module doc?
    if (docSourceType != SOURCE_MODULE) {
        moduleDirectory = join(target, moduleId);
        makeTree(moduleDirectory);
        modules = moduleList(repositoryPath);
    }
    
    var docs = moduleDoc(repositoryPath, moduleId);
    if (docs == null) {
        throw new Error('Could not parse JsDoc for ' + repositoryPath + moduleId);
    }
    
    var moduleHtml = render('./skins/module.html', 
        Object.merge(defaultContext, {
            rootPath: getRelativeRootPath(PAGE_MODULE, docSourceType, moduleId),
            repositoryName: getRepositoryName(repositoryPath),
            moduleId: moduleId,
            modules: modules,
            module: structureModuleDoc(docs),
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
 *    ringo doc.js -s ringo/skin
 *
 * One ore more repositories can be rendered. If more then one repository is
 * passed, the repository overview page will be rendered
 *
 *   ringo doc.js -s /home/simon/ringojs/modules/
 *   ringo doc.js -s /home/simon/ringojs/modules/:/home/simon/ringojs.ringo/modules/
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
    parser.addOption("s", "source", "module|repository", "Module id or list of : seperated paths ");
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
    
    // figure out what type of doc we write, single module, multi repos 
    // or single repo
    var sourceIsDirectory = isDirectory(sources[0]);
    var sourceIsDirectories = sourceIsDirectory && sources.length > 1;
    var sourceIsModule = !sourceIsDirectories && isModuleId(sources[0]);
    if (!sourceIsModule && !sourceIsDirectories && !sourceIsDirectory) {
        throw new Error('Invalid source specified.');
        return;
    }
    var docSourceType = sourceIsModule ? SOURCE_MODULE :
                    sourceIsDirectories ? SOURCE_MULTIREPOSITORY : SOURCE_REPOSITORY;

    // if it's a single repo the macros return different urls
    defaultContext.isSingleRepo = (docSourceType != SOURCE_MULTIREPOSITORY)

    if (!quiet) print ('Writing to ' + exportDirectory + '...');
    
    // single module is one html file & static dir
    if (docSourceType === SOURCE_MODULE) {
        var moduleId = sources[0];
        // find the repository this module is in
        var repositoryPath = getRepositoryPath(moduleId);
        if (!repositoryPath) {
            throw new Error('Can not find ' + moduleId + ' in require.paths: ', require.paths);
            return;
        }
        copyStaticFiles(exportDirectory);
        if (!quiet) print(moduleId);
        writeModuleDoc(exportDirectory, repositoryPath, moduleId, docSourceType);
    // multi repos: show everything we got
    } else if (docSourceType == SOURCE_MULTIREPOSITORY) {
        var repos = repositoryList(sources);
        writeRepositoryList(exportDirectory, repos);
        copyStaticFiles(exportDirectory);
        for (var repoName in repos) {
            var repoPath = repos[repoName];
            var directory = join(exportDirectory, repoName);
            makeTree(directory);
            if (!quiet) print(repoPath);
            writeModuleList(directory, repoPath, docSourceType);
            // render module view
            moduleList(repoPath).forEach(function(module) {
                if (!quiet) print('\t' + module.id);
                writeModuleDoc(directory, repoPath, module.id, docSourceType);
                return;
            });
        };
    // single repo has no repo list
    } else if (docSourceType == SOURCE_REPOSITORY) {
        copyStaticFiles(exportDirectory);
        var repositoryPath = sources[0];
        if (!quiet) print(repositoryPath);
        writeModuleList(exportDirectory, repositoryPath, docSourceType);
        moduleList(repositoryPath).forEach(function(module) {
            if (!quiet) print('\t' + module.id);
            writeModuleDoc(exportDirectory, repositoryPath, module.id, docSourceType);
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
