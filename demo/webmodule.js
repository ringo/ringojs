// a simple web app/module
importFromModule('helma.skin', 'render');

function main_action() {
    var context = {
        title: 'Module Demo',
        href: href
    };
    render('skins/modules.html', context);
}

// module scopes automatically support JSAdapter syntax!
function __get__(name) {
    if (name == 'href') {
        return req.path;
    } else {
        return this[name];
    }
}