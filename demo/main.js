// import request handler from simpleweb module
importFromModule('helma.simpleweb', 'handleRequest');
// import renderSkin
importFromModule('helma.skin', 'renderSkin');
// mount web app module on /mount/point/
importModule('webmodule', 'mount.point');
// continuation support
importModule('helma.continuation');

importModule('helma.logging', 'logging');
var log = logging.getLogger('main');

// import macrofilters
importModule('helma.filters', 'filters');

// the main action is invoked for http://localhost:8080/
function main_action() {
    var context = {
        title: 'Welcome to Helma NG',
        message: 'Introductory text goes here'
    };
    renderSkin('skins/index.html', context);
}

// demo for skins, macros, filters
function skins_action() {
    var names = ['Bruno', 'Emma', 'Lisa', 'Mark'];
    var context = {
        title: 'Skin Demo',
        message: function(macrotag, skin, context) {
            for (var i in names) {
                skin.renderSubskin('message', {name: names[i]});
            }
        },
        filters: filters
    };
    renderSkin('skins/index.html', context);
}

// demo for log4j logging
function logging_action() {
    // make sure responselog is enabled
    var hasResponseLog = logging.responseLogEnabled();
    if (!hasResponseLog) {
        logging.enableResponseLog();
        log.debug("enabling response log");
    }
    log.info("Hello world!");
    if (req.data.makeTrouble) {
        try {
            foo.bar.moo;
        } catch (e) {
            log.error(e, e.rhinoException);
        }
    }
    if (!hasResponseLog) {
        log.debug("disabling response log");
        logging.disableResponseLog();
    }
    var context = {
        title: "Logging Demo",
        content: "Response buffer logging with log4j... <a href='?makeTrouble=1'>make troubles</a>"
    };
    renderSkin('skins/plain.html', context);    
    logging.flushResponseLog();
}

// demo for continuation support
function continuation_action() {
    if (req.params.helma_continuation == null) {
        // set query param so helma knows to switch rhino optimization level to -1
        res.redirect(req.path + "?helma_continuation=");
    }
    // render first page
    var context = {
        title: "Continuations Demo",
        content: '<form method="post" action="' + Continuation.nextUrl() + '">' +
                 '<input name="foo"/>' +
                 '<input type="submit"/>' +
                 '</form>'
        };
    renderSkin('skins/plain.html', context);
    Continuation.nextPage();
    // render second page
    var foo = req.data.foo;
    context.content = '<a href="' + Continuation.nextUrl() + '">click here</a>';
    renderSkin('skins/plain.html', context);
    Continuation.nextPage();
    // render third page
    context.content = 'You said: ' + foo; 
    renderSkin('skins/plain.html', context);
}
