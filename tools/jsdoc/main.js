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
var markdown = require('ringo/markdown');
var mustache = require('ringo/mustache');

var {repositoryList, moduleDoc, moduleList, structureModuleDoc, getRepositoryName}
        = require('./jsdocserializer');
var defaultContext = {};
var templates = {
        module: getResource('./templates/module.html').content,
        repository: getResource('./templates/repository.html').content,
        menu: getResource('./templates/menu.html').content,
        head: getResource('./templates/head.html').content,
        page: getResource('./templates/page.html').content,
        index: getResource('./templates/index_all.html').content
    };

/**
 * Renders jsdoc html files for the given repository into the exportDirectory.
 *
 * @param {Object} repository
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
    if (!quiet) print ('Module index');
    writeRepositoryIndex(exportDirectory, repository);
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
 * Write the html file listing all modules to directory.
 *
 * @param {String} target directory of html file to be written
 * @param {String} repository path
 */
function writeModuleList(target, repository) {
    var context = objects.merge(defaultContext, {
        repositoryName: repository.name,
        title: 'Module overview - ' + repository.name,
        modules: moduleList(repository.path, true),
        rootPath: './',
        markdown: function(text) {
            return markdown.process(text);
        }
    });

    context.head = mustache.to_html(templates.head, context);
    context.menu = mustache.to_html(templates.menu, context);
    context.content = mustache.to_html(templates.repository, context);
    var repositoryHtml = mustache.to_html(templates.page, context);
    write(join(target, 'index.html'), repositoryHtml);
}

/**
 * Write html page documenting one module to the directory.
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

    var context = objects.merge(defaultContext, {
        rootPath: relativeRoot,
        repositoryName: repository.name,
        title: moduleId + ' - ' + repository.name,
        moduleId: moduleId,
        modules: modules,
        item: structureModuleDoc(docs),
        paramList: function() {
            return this.parameters.map(function(p) p.name).join(', ')
        },
        markdown: function(text) {
            return markdown.process(text);
        },
        iterate: function(value) {
            return value && value.length ? {each: value} : null;
        },
        debug: function(value) {
            print(value.toSource());
            return null;
        },
        commaList: function(value) {
            return value && value.length ? value.join(', ') : '';
        },
        newlineList: function(value) {
            return value && value.length ? value.join('<br />') : '';
        }
    });
    context.head = mustache.to_html(templates.head, context);
    context.menu = mustache.to_html(templates.menu, context);
    context.content = mustache.to_html(templates.module, context);
    var moduleHtml = mustache.to_html(templates.page, context);
    var moduleFile = join(moduleDirectory, 'index.html');
    write(moduleFile, moduleHtml);
}

function writeRepositoryIndex(target, repository) {
    var modules = moduleList(repository.path).map(function(module) {
        module.data = structureModuleDoc(moduleDoc(repository.path, module.id));
        module.moduleName = module.name;
        return module;
    });
    var context = objects.merge(defaultContext, {
        rootPath: './',
        repositoryName: repository.name,
        title: 'Index: ' + repository.name,
        modules: modules,
        paramTypeList: function(value) {
            return value && value.length ? [p.type for each (p in value)].join(', ') : '';
        },
        limit: function(value) {
            return value ? value.substr(0, 100) + '...' : '';
        }
    });
    context.head = mustache.to_html(templates.head, context);
    context.menu = mustache.to_html(templates.menu, context);
    context.content = mustache.to_html(templates.index, context);
    var indexHtml = mustache.to_html(templates.page, context);
    var indexFile = join(target, 'index_all.html');
    write(indexFile, indexHtml);
};

/**
 * Create static documentation for a Repository.
 *
 *   ringo-doc -s /home/foo/ringojs/modules/
 *
 * You can specify a human readable name for the module which will
 * be display in the documentation:
 *
 *   ringo-doc -s /home/foo/ringojs/modules -n "Ringojs Modules"
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
    parser.addOption('t', 'template', 'file', 'Master template to use');
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
    if (opts.template) {
        var t = getResource(opts.template);
        if (!t.exists()) {
            throw new Error('Template "' + opts.template + '" not found.');
        }
        templates.page = t.content;
    }

    var exportDirectory = join(opts.directory || './out/');
    var repository = {
        path: opts.source,
        name: opts.name || getRepositoryName(opts.source)
    };
    var quiet = opts.quiet || false;
    defaultContext.indexhtml = opts['fileUrls'] ? 'index.html' : '';

    // check if export dir exists & is empty
    var dest = new Path(exportDirectory);
    if (dest.exists() && !dest.isDirectory()) {
        throw new Error(dest + ' exists but is not a directory.');
    } else if (dest.isDirectory() && dest.list().length > 0) {
        throw new Error('Directory ' + dest + ' exists but is not empty');
    }

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
