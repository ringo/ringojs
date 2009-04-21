import('helma/logging');
include('helma/webapp/response');

var log = helma.logging.getLogger(__name__);

export('index', 'extra_path', 'skins', 'logging', 'continuation');

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
        title: 'Skin Demo',
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
    return new SkinnedResponse('skins/logging.html', { title: "Logging Demo" });
}

// demo for continuation support
function continuation(req, res) {

    return new SkinnedResponse('skins/continuation.html', {
        title: "Continuations",
        skin: "start",
        note: "NOTE: Continuation support is currently broken, so I have disabled this demo for the time being."
    });

    // local data - this is the data that is shared between resuming and suspension
    var data = {};
    var pages = ["start", "name", "favorite food", "favorite animal", "result"];
    // to have only one continuation per user just give the pages fixed ids
    // var pageIds = [0, 1, 2, 3, 4];
    // to have continuations created dynamically start with empty page ids
    var pageIds = [];

    // mark start of continuation code. We never step back earlier than this
    // otherwise local data would be re-initialized
    pageIds[0] = Continuation.startId(req);
    [req, res] = Continuation.markStart(req, res, pageIds[0]);
    // render intro page
    renderPage(0);
    // render first page
    renderPage(1)
    // render second page
    renderPage(2);
    // render third page
    renderPage(3);
    // render overview page
    if (!data.name) renderPage(1);
    renderPage(4);

    // the local function to do the actual work
    function renderPage(id) {
        var previous = pages[id - 1]
        if (req.isPost && previous) {
           data[previous] = req.params[previous];
        }
        if (id < pages.length - 1) {
            pageIds[id + 1] = Continuation.nextId(req, pageIds[id + 1]);
            if (id < 1) {
                res.render('skins/continuation.html', {
                    title: "Welcome",
                    skin: "start",
                    data: data,
                    forward: Continuation.getUrl(req, pageIds[id + 1])
                });
            } else {
                res.render('skins/continuation.html', {
                    title: "Question " + id,
                    skin: "mask",
                    input: pages[id],
                    data: data,
                    value: data[pages[id]],
                    back: Continuation.getUrl(req, pageIds[id - 1]),
                    forward: Continuation.getUrl(req, pageIds[id + 1])
                });
            }
            [req, res] = Continuation.nextPage(req, pageIds[id + 1]);
        } else {
            res.render('skins/continuation.html', {
                title: "Thanks!",
                skin: "result",
                data: data,
                back: Continuation.getUrl(req, pageIds[id - 1])
            });
        }
    }
}