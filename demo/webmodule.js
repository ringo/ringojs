// a simple web app/module
importFromModule('helma.skin', 'renderSkin');

function main_action() {
    var context = {
        title: 'Module Demo',
        message: message,
        link: '<a href="/">go back!</a>'
    };
    renderSkin('skins/index.html', context);
}

// module scopes automatically support JSAdapter syntax!
function __get__(name) {
    if (name == 'message') {
        return "Hello from the web module mounted at " + req.path + "!";
    } else {
        return this[name];
    }
}