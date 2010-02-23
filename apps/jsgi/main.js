// start the web server. (we'll soon write a dedicated script to do this.)
if (module == require.main) {
    require('ringo/webapp').start();
}
