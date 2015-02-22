var {AsyncResponse} = require('ringo/jsgi/connector');
var {Worker} = require("ringo/worker");

exports.app = function(request) {
    var response = new AsyncResponse(request, 2000, true);
    response.start(200, {'Content-Type': 'text/plain'});
    var worker = new Worker(module.resolve("./httpserver-async-worker"));
    worker.onmessage = function(event) {
        console.log('Got message from worker:', event.data);
        worker.terminate();
    };
    worker.onerror = function(event) {
        console.error('Got error from worker:', event.data);
    };
    worker.postMessage({
        "response": response,
        "max": 5
    });
    return response;
};

if (require.main === module) {
    require('ringo/httpserver').main(module.id);
}
