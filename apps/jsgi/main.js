// start the web server. (we'll soon write a dedicated script to do this.)
if (module.id === require.main) {
    require('helma/httpserver').start();
}
