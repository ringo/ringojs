import('helma/logging');
include('helma/webapp/response');
include('helma/webapp/continuation');

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
function continuation(req) {

    // local data - this is the data that is shared between continuations of this function
    var data = {};

    req = ContinuationMark(req, "start");

    // render intro page
    req = ContinuationRequest(req, SkinnedResponse('skins/continuation.html', {
        skin: "start",
        title: "Continuations Demo",
        data: data,
        forward: ContinuationUrl("name")
    }), "name");
    
    req = ContinuationRequest(req, SkinnedResponse('skins/continuation.html', {
        skin: "name",
        title: "Question 1",
        data: data,
        back: ContinuationUrl("start"),
        forward: ContinuationUrl("food")
    }), "food");
    data.name = req.params.name || data.name;

    req = ContinuationRequest(req, SkinnedResponse('skins/continuation.html', {
        skin: "food",
        title: "Question 2",
        data: data,
        back: ContinuationUrl("name"),
        forward: ContinuationUrl("animal")
    }), "animal");
    data.food = req.params.food || data.food;

    req = ContinuationRequest(req, SkinnedResponse('skins/continuation.html', {
        skin: "animal",
        title: "Question 3",
        data: data,
        back: ContinuationUrl("food"),
        forward: ContinuationUrl("result")
    }), "result");
    data.animal = req.params.animal || data.animal;

    return SkinnedResponse('skins/continuation.html', {
        skin: "result",
        title: "Thank you!",
        data: data,
        back: ContinuationUrl("animal")
    });

}