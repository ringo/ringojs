// a simple web app/module
importFromModule('helma.skin', 'render');

function main_action() {
    var context = {
        title: 'Module Demo',
        href: req.path
    };
    render('skins/modules.html', context);
}
