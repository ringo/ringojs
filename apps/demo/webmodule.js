// a simple web app/module

function main_action(req, res) {
    var context = {
        title: 'Module Demo',
        href: req.path
    };
    res.render('skins/modules.html', context);
}
