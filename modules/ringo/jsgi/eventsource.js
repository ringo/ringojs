/**
 * @fileOverview This module provides the constructor for EventSource
 * response objects, which allow pushing messages to connected clients.
 */
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
   this.response = null;

   /**
    * Send a named event
    * @param {String} name The event name
    * @param {String} data The event data
    * @throws {Error}
    */
   this.event = sync(function(name, data) {
      if (this.response === null) throw new Error('Connection not open');

      this.response.write(EVENT_FIELD);
      this.response.write(name);
      this.response.write(CRLF);
      this.data(data);
   }, this);

   /**
    * Send data
    * @param {String} data The event data
    * @throws {Error}
    */
   this.data = sync(function(data) {
      if (this.response === null) throw new Error('Connection not open');

      this.response.write(DATA_FIELD);
      this.response.write(data);
      this.response.write(CRLF);
      this.response.write(CRLF);
      this.response.flush();
   }, this);

   /**
    * Send a comment.
    * @param {String} comment The comment
    * @throws {Error}
    */
   this.comment = sync(function(comment) {
      if (this.response === null) throw new Error('Connection not open');

      this.response.write(COMMENT_FIELD);
      this.response.write(comment);
      this.response.write(CRLF);
      this.response.write(CRLF);
      this.response.flush();
   }, this);

   /**
    * Close the event source.
    * @throws {Error}
    */
   this.close = sync(function() {
      clearInterval(heartBeat);
      this.response.close();
   }, this);

   /**
    * Start the async response. Optionally set additional headers here.
    * @param {Object} headers Additional headers (optional)
    * @param {Number} heartBeatInterval in seconds (optional. default: 15)
    */
   this.start = function(headers, heartBeatInterval) {
      if (this.response !== null) throw new Error('Connection already open');

      if (heartBeatInterval === undefined || isNaN(heartBeatInterval)) {
         heartBeatInterval = 15;
      }
      heartBeat = setInterval((function() {
            try {
               this.ping();
            } catch (e) {
               clearInterval(heartBeat);
            }
         }).bind(this), heartBeatInterval * 1000);
      this.response = new AsyncResponse(request, 0);
      this.response.start(200, objects.merge(headers || {}, {
         'Content-Type': 'text/event-stream; charset=utf-8',
         'Connection': 'close'
      }));
      this.response.flush();
   };

   /**
    * Sends a ping to the client
    * @throws {Error}
    */
   this.ping = sync(function() {
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
};
