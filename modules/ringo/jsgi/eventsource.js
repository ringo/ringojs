var {AsyncResponse} = require('ringo/jsgi/connector');
var objects = require('ringo/utils/objects');

const CRLF = "\r\n".toByteArray('utf-8');
const EVENT_FIELD = "event: ".toByteArray('utf-8');
const DATA_FIELD = "data: ".toByteArray('utf-8');
const COMMENT_FIELD = ": ".toByteArray('utf-8');
/**
 * EventSource (or Server-Sent-Events) is a server push technology utilizing
 * plain HTTP responses. The event stream format defines three types of messages:
 *
 *    * data-only
 *    * named events with data
 *    * comments
 *
 * One method for each message type is available. Data is expected to be in JSON format.
 * EventSource instances are thread-safe.
 *
 * The EventSource wraps an AsyncResponse and is used similarly:
 *
 * @example
 *
 *    var eventSource = new EventSource(request);
 *    // send headers and start heartbeat
 *    eventSource.start({
 *       "X-Additional-Header": "Foo"
 *    });
 *    setInterval(function() {
 *        eventSource.event('foo-field', 'foo-value');
 *    }, 5 * 1000);
 *
 *    // close the response. No more data can be written
 *    // and the hearbeat stops.
 *    eventSource.close();
 *
 *    // Each EventSource instance exposes the wrapped JSGI asynchronous response
 *    eventSource.response
 *
 *
 *
 * @param {JSGIRequest} request
 * @see ringo/jsgi/connector#AsyncResponse
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events
 *
 */
exports.EventSource = function(request) {
   var heartBeat = null;

   /**
    * Send a named event
    * @throws {java.io.IOException}
    */
   this.event = sync(function(name, data) {
      this.response.write(EVENT_FIELD);
      this.response.write(name);
      this.response.write(CRLF);
      this.data(data);
   }, this);

   /**
    * Send data
    * @throws {java.io.IOException}
    */
   this.data = sync(function(data) {
      this.response.write(DATA_FIELD);
      this.response.write(data);
      this.response.write(CRLF);
      this.response.write(CRLF);
      this.response.flush();
   }, this);

   /**
    * Send a comment.
    * @throws {java.io.IOException}
    */
   this.comment = sync(function(comment) {
      this.response.write(COMMENT_FIELD);
      this.response.write(comment);
      this.response.write(CRLF);
      this.response.write(CRLF);
      this.response.flush();
   }, this);

   /**
    * Close the event source.
    * @throws {java.io.IOException}
    */
   this.close = sync(function() {
      clearInterval(heartBeat);
      this.response.close();
   }, this);

   /**
    * Start the async response. Optionally set additional headers here.
    * @param {Object} additional headers (optional)
    */
   this.start = function(headers) {
      heartBeat = setInterval(ping.bind(this), 15 * 1000);
      this.response = new AsyncResponse(request, 0);
      this.response.start(200, objects.merge(headers || {}, {
         'Content-Type': 'text/event-stream; charset=utf-8',
         'Connection': 'close'
      }));
      this.response.flush();
   };

   /**
    * @ignore
    */
   var ping = sync(function() {
      this.response.write('\r');
      this.response.flush();
   }, this);

   return this;
};

/**
 * Static helper to check whether request accepts eventstream.
 *
 * @param {JSGIRequest} request
 * @returns {Boolean} whether the accept header matches 'text/event-stream
 */
exports.isEventSourceRequest = function(request) {
   return request.headers.accept.indexOf('text/event-stream') > -1;
}
