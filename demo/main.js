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
// this also shows simple skin rendering
function main_action() {
    var names = ['Bruno', 'Emma', 'Lisa', 'Mark'];
    var context = {
        title: 'Welcome to Helma NG',
        message: function(macrotag, skin, context) {
            for (var i in names) {
                skin.renderSubskin('message', {name: names[i]});
            }
        },
        link: '<a href="/mount/point/">check this out!</a>',
        filters: filters
    };
    renderSkin('skins/index.html', context);
}

function responselog_action() {
    // make sure responselog is enabled
    logging.enableResponseLog();
    log.info("Hello world!");
    try {
        foo.bar.moo;
    } catch (e) {
        log.error(e, e.rhinoException);
    }
}

// demo continuation action
function continuation_action() {
    if (req.params.helma_continuation == null) {
        // set query param so helma knows to switch rhino optimization level to -1
        res.redirect(req.path + "?helma_continuation=");
    }
    res.write(<form method="post" action={Continuation.nextUrl()}>
                <input name="foo"/>
                <input type="submit"/>
              </form>);
    Continuation.nextPage();
    var foo = req.data.foo;
    res.write('<a href="' + Continuation.nextUrl() + '">click here</a>');
    Continuation.nextPage();
    res.write('you said: ' + foo);
}
