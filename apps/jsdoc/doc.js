#!/usr/bin/env ringo
/**
 * @fileoverview Script to create static JsDoc documentation.
 *      Use -h or --help to get a list of available options.
 *
 * @see http://code.google.com/p/jsdoc-toolkit/
 */

// stdlib
var files = require('ringo/utils/files');
var {makeTree, write, copyTree, join, Path} = require('fs');
var {Parser} = require('ringo/args');
var {isFile, isDirectory} = require('fs');
var {ScriptRepository} = require('ringo/jsdoc');
var strings = require('ringo/utils/strings');
var objects = require('ringo/utils/objects');
var {Markdown} = require('ringo/markdown');

// custom
var mustache = require("../shared/mustache-commonjs");
var {repositoryList, moduleDoc, moduleList, structureModuleDoc, getRepositoryName}
        = require('./jsdocserializer');
var defaultContext = {};

/**
 * @param {Object} repostitory
 * @param {String} exportDirectory
 * @param {Boolean} quiet
 */
var renderRepository = exports.renderRepository = function (repository, exportDirectory, quiet) {
    // need apps/jsdoc on path for skin extend to work
    if (require.paths.indexOf(module.directory) == -1) {
        require.paths.push(module.directory);
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
}

/**
 * Copy static files of this webapp to target directory
 *
 * @param {String} target
 */
function copyStaticFiles(target) {
    makeTree(join(target, 'static'));
    copyTree(join(module.directory, 'static'), join(target, 'static'));
    return;
}

/**
 * Write the module list to directory. Corresponds to actions:repository
 *
 * @param {String} target directory of file to be written
 * @param {String} repository path
 */
function writeModuleList(target, repository) {
    var res = getResource("./templates/repository.html");
    var repositoryHtml = mustache.to_html(res.content,
        objects.merge(defaultContext, {
            repositoryName: repository.name,
            modules: moduleList(repository.path, true),
            rootPath: './',
            markdown: function(text) {
                return new Markdown({}).process(text);
            }
        })
    );
    write(join(target, 'index.html'), repositoryHtml);
}

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

    var res = getResource("./templates/module.html");
    var moduleHtml = mustache.to_html(res.content,
        objects.merge(defaultContext, {
            rootPath: relativeRoot,
            repositoryName: repository.name,
            moduleId: moduleId,
            modules: modules,
            item: structureModuleDoc(docs),
            paramList: function() {
                return this.parameters.map(function(p) p.name).join(", ")
            },
            markdown: function(text) {
                return new Markdown({}).process(text);
            },
            iterate: function(value) {
                return value && value.length ? {each: value} : null;
            },
            debug: function(value) {
                print(value.toSource());
                return null;
            },
            withComma: function(value) {
                return value && value.length ? value.join(", ") : "";
            },
            withNewline: function(value) {
                return value && value.length ? value.join("<br />") : "";
            },
            renderFunctionsAndProperties: function() {
                return function(text, render) {
                    return (this.functions.length || this.properties.length) ?
                        render(text) : "";
                }
            }
        })
    );

    var moduleFile = join(moduleDirectory, 'index.html');
    write(moduleFile, moduleHtml);
    return;
}

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
    parser.addOption(null, 'file-urls', null, 'Add "index.html" to all URLs for file:// serving.');
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
    defaultContext.indexhtml = opts['fileUrls'] ? "index.html" : "";

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

    renderRepository(repository, exportDirectory, quiet);
    return;
}

if (require.main == module) {
    try {
        main(system.args);
    } catch (error) {
        print(error);
        print('Use -h or --help to get a list of available options.');
    }
}
