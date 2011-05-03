var http = require("ringo/utils/http");
var response = require('ringo/jsgi/response');
var markdown = require('ringo/markdown');
var mustache = require('../shared/mustache-commonjs');

var log = require('ringo/logging').getLogger(module.id);

export('index', 'modules', 'upload', 'testing', 'logging');


// the main action is invoked for http://localhost:8080/
function index(req) {
    return responseHelper('templates/welcome.txt', {title: 'Demo'});
}

function modules(req) {
    return responseHelper('templates/modules.txt', {title: 'Modules'});
}

function upload(req) {
    var params = http.parseFileUpload(req);
    if (req.method === "POST" && params.file) {
        return {
            status: 200,
            headers: {"Content-Type": params.file.contentType || "text/plain"},
            body: [params.file.value]
        };
    }
    return responseHelper('templates/upload.txt', {
        title: "File Upload"
    });
}

function testing(req) {
    var params = http.parseParameters(req.queryString);
    if (params.runtests) {
        var test = require("ringo/engine").getRingoHome().getResource("test/most.js");
        var tests = require(test.path);
        var formatter = new (require("./helpers").HtmlTestFormatter)();
        require("test").run(tests, formatter);
        return response.html(formatter);
    }
    return responseHelper('templates/testing.txt', {
        title: "Unit Testing"
    });
}

// demo for log4j logging
function logging(req) {
    var params = http.parseParameters(req.queryString);
    if (params.info) {
        log.info("Hello world!");
    } else if (params.error) {
        try {
            throw new Error("something went wrong");
        } catch (e) {
            log.error(e);
        }
    } else if (params.profile) {
        // build and run a small profiler middleware stack
        var profiler = require('ringo/middleware/profiler');
        return profiler.middleware(function() {
            return responseHelper('templates/logging.txt', {
                title: "Logging & Profiling"
            });
        })(req);
    }
    return responseHelper('templates/logging.txt', {
        title: "Logging & Profiling"
    });
}

function responseHelper(template, context) {
    var page = getResource('./templates/page.html').content;
    var content = getResource(module.resolve(template)).content;
    context.markdown = function(text) {
        return markdown.Markdown().process(text);
    }
    context.content = mustache.to_html(content, context);
    return response.html(mustache.to_html(page, context));
}


