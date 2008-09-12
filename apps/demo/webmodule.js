// a simple web app/module
var {render} = loadModule('helma.skin');

function main_action() {
    var context = {
        title: 'Module Demo',
        href: req.path
    };
    render('skins/modules.html', context);
}
