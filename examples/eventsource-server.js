// Simple event source server demo
const response = require("ringo/jsgi/response");
const arrays = require("ringo/utils/arrays");
const {EventSource, isEventSourceRequest} = require("ringo/jsgi/eventsource");

const connections = module.singleton('connections', () => []);

exports.app = (req) => {
    if (isEventSourceRequest(req)) {
      const eventSource = new EventSource(req);
      eventSource.start({
         'Access-Control-Allow-Origin': '*'
      });
      connections.push(eventSource);
      return eventSource.response;
    } else {
      return response.static(module.resolve("html/eventsource.html"), "text/html");
    }
};

const doPing = () => {
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
    const server = require("ringo/httpserver").main(module.id);
    setInterval(doPing, 2 * 1000);
}
