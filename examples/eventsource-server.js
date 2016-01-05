// Simple event source server demo
var response = require("ringo/jsgi/response");
var arrays = require("ringo/utils/arrays");
var {EventSource, isEventSourceRequest} = require("ringo/jsgi/eventsource");

var connections = module.singleton('connections', function() {
   return [];
});

exports.app = function(req) {
    if (isEventSourceRequest(req)) {
      var eventSource = new EventSource(req);
      eventSource.start({
         'Access-Control-Allow-Origin': '*'
      });
      connections.push(eventSource);
      return eventSource.response;
    } else {
      return response.static(module.resolve("html/eventsource.html"), "text/html");
    }
};

function doPing() {
    console.info("Sending ping to all ", connections.length ,"connections");
    connections.forEach(function(eventSource) {
        try {
           eventSource.data('Ping ' + new Date());
        } catch (e) {
           console.error(e);
           arrays.remove(connections, eventSource);
        }
    });
}

if (require.main == module) {
    var server = require("ringo/httpserver").main(module.id);
    setInterval(doPing, 2 * 1000);
}