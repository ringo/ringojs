var assert = require("assert");
var {ByteString} = require('binary');
var {Worker} = require('ringo/worker');
var {BufferedReader, InputStreamReader} = java.io;
var {Socket} = java.net;

/**
 * Tests copied from jetty's EventSourceServletTest class
 *
 * @see https://github.com/eclipse/jetty.project/blob/a3201a3c810da37ad892e62c1f04600dc889d14a/jetty-servlets/src/test/java/org/eclipse/jetty/servlets/EventSourceServletTest.java
 */

var serverWorker = null;
exports.setUp = function() {
    serverWorker = new Worker(module.resolve('./eventsource_worker'));
    serverWorker.postMessage('start', true);

    // Worker sends us a message once the httpserver
    // has started. Wait for that message before doing any tests.
    var isStarted = false;
    serverWorker.onmessage = function() {
        isStarted = true;
    }
    while(isStarted == false) {
        java.lang.Thread.sleep(200);
    }
}

exports.tearDown = function() {
    serverWorker.postMessage('stop', true);

    // wait for shutdown
    var isStopped = false;
    serverWorker.onmessage = function() {
        isStopped = true;
    }
    while(isStopped == false) {
        java.lang.Thread.sleep(200);
    }
}

exports.testComments = function() {

    var {testComments} = require('./eventsource_worker');

    var socket = new Socket('localhost', 8080);
    writeHTTPRequest(socket, 'testComments');
    var reader = readAndDiscardHTTPResponse(socket);

    var line = reader.readLine();
    assert.equal(line, ': ' + testComments.data);

    socket.close();
}

exports.testServerSideClose = function() {

    var {testServerSideClose} = require('./eventsource_worker');

    var socket = new Socket('localhost', 8080);
    writeHTTPRequest(socket, 'testServerSideClose');
    var reader = readAndDiscardHTTPResponse(socket);

    // server should send one comment and then close
    // the connection
    var line = null;
    var recieved = "";
    while (line = reader.readLine()) {
        recieved += line;
    }
    assert.equal(recieved, ': ' + testServerSideClose.data);

    line = reader.readLine();
    assert.isNull(line);

    socket.close();
}

exports.testEncoding = function() {
    var {testEncoding} = require('./eventsource_worker');

    var socket = new Socket('localhost', 8080);
    writeHTTPRequest(socket, 'testEncoding');
    var reader = readAndDiscardHTTPResponse(socket);

    var line = reader.readLine();
    assert.equal(line, 'data: ' + testEncoding.data);

    socket.close();
}

exports.testEvents = function() {
    // testEvents holds the data the server will write
    var {testEvents} = require('./eventsource_worker');

    var socket = new Socket('localhost', 8080);
    writeHTTPRequest(socket, 'testEvents');
    var reader = readAndDiscardHTTPResponse(socket);

    var line1 = reader.readLine();
    assert.equal(line1, 'event: ' + testEvents.name);
    var line2 = reader.readLine();
    assert.equal(line2, 'data: ' + testEvents.data);
    var line3 = reader.readLine();
    assert.equal(0, line3.length);

    socket.close();
};

exports.testMultLineData = function() {
    var {testMultLineData} = require('./eventsource_worker');

    var socket = new Socket('localhost', 8080);
    writeHTTPRequest(socket, 'testMultLineData');
    var reader = readAndDiscardHTTPResponse(socket);

    var line1 = reader.readLine();
    assert.equal(line1, 'data: ' + testMultLineData.data1);
    var line2 = reader.readLine();
    assert.equal(line2, 'data: ' + testMultLineData.data2);
    var line3 = reader.readLine();
    assert.equal(line3, 'data: ' + testMultLineData.data3);
    var line4 = reader.readLine();
    assert.equal(line4, 'data: ' + testMultLineData.data4);
    var line5 = reader.readLine();
    assert.equal(line5, line5.length);

    socket.close();
}


/**
 * Write HTTP GET text/event-stream
 */
function writeHTTPRequest(socket, path) {

    var handshake = "GET /" + path + " HTTP/1.1\r\n";
    handshake += "Host: localhost:8080\r\n";
    handshake += "Accept: text/event-stream\r\n";
    handshake += "\r\n";

    var handshakeBytes = (new ByteString(handshake, "UTF-8")).unwrap();
    var output = socket.getOutputStream();
    output.write(handshakeBytes);
    output.flush();
}

/**
 * Read HTTP Response, discard the header and return the reader
 * for actual response reading
 */
function readAndDiscardHTTPResponse(socket) {
    var input = socket.getInputStream();
    var reader = new BufferedReader(new InputStreamReader(input));
    var line = reader.readLine();
    while (line != null) {
        if (line.length === 0) {
            break;
        }
        line = reader.readLine();
    }
    return reader;
}