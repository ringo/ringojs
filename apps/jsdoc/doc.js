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
var strings = require('ringo/utils/strings');
var objects = require('ringo/utils/objects');

// custom
var {repositoryList, moduleDoc, moduleList, structureModuleDoc, getRepositoryName} = require('./jsdocserializer');
var config = require('./config.js');

// need apps/jsdoc on path for skin extend to work
require.paths.unshift(module.directory);

// need config.macros in context for skin rendering
var defaultContext = {};
config.macros.forEach(function(moduleId) {
    defaultContext = objects.merge(defaultContext ,require(fileutils.resolveId(module.directory, moduleId)));
});

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
 * Write the module list to directory. Corresponds to actions:repository
 *
 * @param {String} target directory of file to be written
 * @param {String} repository path
 */
function writeModuleList(target, repository) {
    var repositoryHtml = render('./skins/repository.html',
        objects.merge(defaultContext, {
            repositoryName: repository.name,
            modules: moduleList(repository.path, true),
            rootPath: './',
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
 */
function writeModuleDoc(target, repository, moduleId){

    var moduleDirectory = target;
    var modules = [];
    moduleDirectory = join(target, moduleId);
    makeTree(moduleDirectory);
    modules = moduleList(repository.path);

    var docs = moduleDoc(repository.path, moduleId);
    if (docs == null) {
        throw new Error('Could not parse JsDoc for ' + repository.path + moduleId);
    }

    var slashCount = strings.count(moduleId, '/');
    var relativeRoot = '../' + strings.repeat('../', slashCount);

    var moduleHtml = render('./skins/module.html',
        objects.merge(defaultContext, {
            rootPath: relativeRoot,
            repositoryName: repository.name,
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
 * Create static documentation for a Repository.
 *
 *   ringo doc.js -s /home/foo/ringojs/modules/
 *
 * You can specify a human readable name for the module which will
 * be display in the documentation:
 *
 *   ringo doc.js -s /home/foo/ringojs/modules -n "Ringojs Modules"
 *
 * @param args
 */
function main(args) {

    /**
     * Print script help
     */
    function help() {
        print('Create JsDoc documentation for CommonJs modules.');
        print('Usage:');
        print('  ringo ' + script + ' -s [sourcepath]');
        print('Options:');
        print(parser.help());
        return;
    };

    var script = args.shift();
    var parser = new Parser();
    parser.addOption('s', 'source', 'repository', 'Path to repository');
    parser.addOption('d', 'directory', 'directory', 'Directory for output files (default: "out")');
    parser.addOption('n', 'name', 'name', 'Name of the Repository (default: auto generated from path)');
    parser.addOption('q', 'quiet', null, 'Do not output any messages.');
    parser.addOption('h', 'help', null, 'Print help message and exit');
    var opts = parser.parse(args);
    if (opts.help) {
        help();
        return;
    }
    if (!opts.source) {
        throw new Error('No source specified.');
    }

    var exportDirectory = join(opts.directory || './out/');
    var repository = {
        path: opts.source,
        name: opts.name || getRepositoryName(opts.source)
    };
    var quiet = opts.quiet || false;

    // check if export dir exists & is empty
    var dest = new Path(exportDirectory);
    if (dest.exists() && !dest.isDirectory()) {
        throw new Error(dest + ' exists but is not a directory.');
    } else if (dest.isDirectory() && dest.list().length > 0) {
        throw new Error('Directory ' + dest + ' exists but is not empty');
    }

    // figure out what type of doc we write, single module, multi repos
    // or single repo
    if (!isDirectory(repository.path)) {
        throw new Error('Invalid source specified. Must be directory.');
        return;
    }

    if (!quiet) print ('Writing to ' + exportDirectory + '...');

    copyStaticFiles(exportDirectory);
    if (!quiet) print(repository.path);
    writeModuleList(exportDirectory, repository);
    moduleList(repository.path).forEach(function(module) {
        if (!quiet) print('\t' + module.id);
        writeModuleDoc(exportDirectory, repository, module.id);
    });

    if (!quiet) print('Finished writing to ' + exportDirectory);
    return;
};

if (require.main == module) {
    try {
        main(system.args);
    } catch (error) {
        print(error);
        print('Use -h or --help to get a list of available options.');
    }
}
