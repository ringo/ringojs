import('helma/logging');
include('helma/webapp/response');
include('helma/webapp/continuation');

var log = helma.logging.getLogger(__name__);

export('index', 'extra_path', 'skins', 'logging', 'continuation', 'profiler');

// the main action is invoked for http://localhost:8080/
function index(req) {
    return new SkinnedResponse('skins/index.html', { title: 'Welcome to Helma NG' });
}


// additional path elements are passed to the action as arguments,
// e.g. /extra.path/2008/09
function extra_path(req, year, month) {
    return new Response("Extra arguments:", year, month);
}

// demo for skins, macros, filters
function skins(req) {
    return new SkinnedResponse('skins/skins.html', {
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
            foo.bar.moo;
        } catch (e) {
            log.error(e, e.rhinoException);
        }
    }
    return new SkinnedResponse('skins/logging.html', { title: "Logging" });
}

// demo for continuation support
function continuation(req) {

    // local data - this is the data that is shared between continuations of this function
    var data = {};
    var session = new ContinuationSession("welcome", "ask_name", "ask_food", "ask_animal", "result");
    req = session.start();

    // render intro page
    req = session.step(1).render(SkinnedResponse('skins/continuation.html', {
        session: session,
        title: "Continuations",
        data: data
    }));
    
    req = session.step(2).render(SkinnedResponse('skins/continuation.html', {
        session: session,
        title: "Question 1",
        data: data
    }));
    if (req.isPost)
        data.name = req.params.name;

    req = session.step(3).render(SkinnedResponse('skins/continuation.html', {
        session: session,
        title: "Question 2",
        data: data
    }));
    if (req.isPost)
        data.food = req.params.food;

    req = session.step(4).render(SkinnedResponse('skins/continuation.html', {
        session: session,
        title: "Question 3",
        data: data
    }));
    if (req.isPost)
        data.animal = req.params.animal;

    session.step(5).render(SkinnedResponse('skins/continuation.html', {
        session: session,
        title: "Thank you!",
        data: data
    }));
}

function profiler(req) {
    var profiler = require('helma/profiler');
    req.process = function() {
        return SkinnedResponse('skins/profiler.html', {
            title: "Profiler"
        });
    }
    return profiler.handleRequest(req);
}