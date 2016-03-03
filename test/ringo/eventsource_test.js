var assert = require('assert');
var {EventSource} = require('ringo/jsgi/eventsource');
var httpclient = require('ringo/httpclient');
var {Server} = require("ringo/httpserver");
var objects = require('ringo/utils/objects');
require('ringo/logging').setConfig(getResource('./httptest_log4j.properties'));

var config = {
   host: '127.0.0.1',
   port: '8282',
   appModule: module.id,
};
var baseUrl = 'http://' + config.host + ':' + config.port + '/';
var acceptHeader = {'Accept': 'text/event-stream'};
var server = null;

exports.tearDown = function() {
   server.stop();
   server.destroy();
}

exports.jsgiAppEvents = function(req) {
   var ev = new EventSource(req);
   ev.start({
      'X-Additional-Header': 'ValueFoo'
   });
   setTimeout(function() {
      ev.data(JSON.stringify('testing foo bar'));
      ev.event('foo', 'zar');
      ev.comment('invisible');
      ev.close();
   }, 100);
   return ev.response;
}

exports.testEvents = function() {
   server = new Server(objects.merge({
      appName: 'jsgiAppEvents'
   }, config));
   server.start();

   var exchange = httpclient.request({
      url: baseUrl,
      headers: acceptHeader
   });

   assert.equal(exchange.status, 200);
   assert.deepEqual(exchange.headers['X-Additional-Header'], ['ValueFoo']);
   assert.equal(exchange.content, 'data: \"testing foo bar\"\r\n\r\nevent: foo\r\ndata: zar\r\n\r\n: invisible\r\n\r\n');

};

exports.jsgiAppExceptions = function(req) {
   var ev = new EventSource(req);
   // can't write before start
   assert.throws(function() {
      ev.data('foo');
   }, Error);
   ev.start();
   ev.data('bar');
   // can't start twice
   assert.throws(function() {
      ev.start('foobar');
   }, Error);
   ev.close();
   // can't write after close
   assert.throws(function() {
      ev.data('zar');
   }, java.lang.IllegalStateException);
   // cant close if already closed
   assert.throws(function() {
      ev.close();
   }, java.lang.IllegalStateException);
   return ev.response;
}

exports.testExceptions = function() {
   server = new Server(objects.merge({
      appName: 'jsgiAppExceptions'
   }, config));
   server.start();
   var exchange = httpclient.request({
      url: baseUrl,
      headers: acceptHeader
   });
}

// start the test runner if we're called directly from command line
if (require.main === module) {
    require("system").exit(require('test').run(exports));
}