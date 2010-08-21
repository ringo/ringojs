var {Response} = require('ringo/webapp/response');
var {ContinuationSession} = require('ringo/webapp/continuation');

var log = require('ringo/logging').getLogger(module.id);

export('index', 'extra_path', 'upload', 'testing', 'skins', 'logging', 'continuation');


// the main action is invoked for http://localhost:8080/
function index(req) {
    return Response.skin('./skins/welcome.txt', {title: 'Demo'});
}

// additional path elements are passed to the action as arguments,
// e.g. /extra.path/2008/09
function extra_path(req, year, month) {
    return new Response("Extra arguments:", year, month);
}

function upload(req) {
    if (req.isPost && req.params.file) {
        return {
            status: 200,
            headers: {"Content-Type": req.params.file.contentType || "text/plain"},
            body: [req.params.file.value]
        };
    }
    return Response.skin('./skins/upload.txt', {
        title: "File Upload"
    });
}

function testing(req) {
    if (req.params.runtests) {
        var test = require("ringo/engine").getRingoHome().getResource("test/all")
        var tests = require(test.path);
        var formatter = new (require("./helpers").HtmlTestFormatter)();
        require("test").run(tests, formatter);
        return new Response(formatter);
    }
    return Response.skin('./skins/testing.txt', {
        title: "Unit Testing"
    });
}

exports.params = function(req) {
   // if (req.isPost) {
        return new Response(JSON.stringify(req.params));
   // }
    return Response.skin('skins/form.html');
}

// demo for skins, macros, filters
function skins(req) {
    return Response.skin('./skins/skins.txt', {
        title: 'Skins',
        name: 'Luisa',
        names: ['Benni', 'Emma', 'Luca', 'Selma']
    });
}

// demo for log4j logging
function logging(req) {
    if (req.params.info) {
        log.info("Hello world!");
    } else if (req.params.error) {
        try {
            throw new Error("something went wrong");
        } catch (e) {
            log.error(e);
        }
    } else if (req.params.profile) {
        // build and run a small profiler middleware stack
        var profiler = require('ringo/middleware/profiler');
        return profiler.middleware(function() {
            return Response.skin('./skins/logging.txt', {
                title: "Logging &amp; Profiling"
            });
        })(req);
    }
    return Response.skin('./skins/logging.txt', { title: "Logging &amp; Profiling" });
}

// demo for continuation support
function continuation(req, cont_id, cont_step) {

    var session = new ContinuationSession(req, cont_id, cont_step);

    if (!session.isActive()) {
        // render welcome page
        return Response.skin('./skins/continuation.txt', {
            session: session,
            page: "welcome",
            title: "Continuations"
        });
    }

    session.addPage("ask_name", function(req) {
        return Response.skin('./skins/continuation.txt', {
            session: session,
            page: session.page,
            title: "Question 1"
        })
    });

    session.addPage("ask_food", function(req) {
        if (req.isPost)
            session.data.name = req.params.name;
        return Response.skin('./skins/continuation.txt', {
            session: session,
            page: session.page,
            title: "Question 2"
        });
    });

    session.addPage("ask_animal", function(req) {
        if (req.isPost)
            session.data.food = req.params.food;
        return Response.skin('./skins/continuation.txt', {
            session: session,
            page: session.page,
            title: "Question 3"
        });
    });

    session.addPage("result", function(req) {
        if (req.isPost)
            session.data.animal = req.params.animal;
        return Response.skin('./skins/continuation.txt', {
            session: session,
            page: session.page,
            title: "Thank you!"
        });
    });

    return session.run();
}
