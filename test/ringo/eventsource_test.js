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

exports.mainEvents = function(req) {
   var ev = new EventSource(req);
   ev.start();
   setTimeout(function() {
      ev.data(JSON.stringify('testing foo bar'));
      ev.event('foo', 'zar');
      ev.comment('invisible');
      ev.close();
   }, 100);
   return ev.response;
}

exports.testEvents = function() {
   var server = new Server(objects.merge({
      appName: 'mainEvents'
   }, config));
   server.start();

   var exchange = httpclient.request({
      url: baseUrl,
      headers: acceptHeader
   });

   assert.equal(exchange.status, 200);
   assert.equal(exchange.content, 'data: \"testing foo bar\"\r\n\r\nevent: foo\r\ndata: zar\r\n\r\n: invisible\r\n\r\n');

   server.stop();
   server.destroy();
}
