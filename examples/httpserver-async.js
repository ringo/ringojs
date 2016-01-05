var {AsyncResponse} = require('ringo/jsgi/connector');
var {Worker} = require("ringo/worker");

var worker = module.singleton("worker", function() {
    var worker = new Worker(module.resolve("./httpserver-async-worker"));
    worker.onmessage = function(event) {
        console.log('Got message from worker:', event.data);
    };
    worker.onerror = function(event) {
        console.error('Got error from worker:', event.data);
    };
    return worker;
});

exports.app = function(request) {
    var response = new AsyncResponse(request, 0, true);
    response.start(200, {'Content-Type': 'image/png'});
    worker.postMessage({
        "response": response,
        "file": module.resolve("./img/ringo-drums.png")
    });
    return response;
};

if (require.main === module) {
    require('ringo/httpserver').main(module.id);
}
