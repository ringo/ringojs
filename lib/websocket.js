var {JavaEventEmitter} = require('ringo/events');
var {WebSocketListener} = org.eclipse.jetty.websocket.api;
var {ByteBuffer} = java.nio;

var WebSocket = module.exports = function() {
    this.session = null;

    // make WebSocket a java event-emitter (mixin)
    JavaEventEmitter.call(this, [WebSocketListener], {
        "onWebSocketConnect": "connect",
        "onWebSocketClose": "close",
        "onWebSocketText": "text",
        "onWebSocketBinary": "binary",
        "onWebSocketError": "error"
    });

    return this;
};

/** @ignore */
WebSocket.prototype.toString = function() {
    return "[WebSocket]";
};

/**
 * Closes the WebSocket connection.
 * @name WebSocket.instance.close
 * @function
 */
WebSocket.prototype.close = function() {
    if (!this.isOpen()) {
        throw new Error("Not connected");
    }
    this.session.close();
    this.session = null;
};

/**
 * Send a string over the WebSocket.
 * @param {String} message a string
 * @name WebSocket.instance.send
 * @deprecated
 * @see #sendString
 * @function
 */
WebSocket.prototype.send = function(message) {
    return this.sendString(message);
};

/**
 * Send a string over the WebSocket. This method
 * blocks until the message has been transmitted
 * @param {String} message a string
 * @name WebSocket.instance.sendString
 * @function
 */
WebSocket.prototype.sendString = function(message) {
    if (!this.isOpen()) {
        throw new Error("Not connected");
    }
    this.session.getRemote().sendString(message);
};

/**
 * Send a string over the WebSocket. This method
 * does not wait until the message as been transmitted.
 * @param {String} message a string
 * @name WebSocket.instance.sendStringAsync
 * @function
 */
WebSocket.prototype.sendStringAsync = function(message) {
    if (!this.isOpen()) {
        throw new Error("Not connected");
    }
    return this.session.getRemote().sendStringByFuture(message);
};

/**
 * Send a byte array over the WebSocket. This method
 * blocks until the message as been transmitted.
 * @param {ByteArray} byteArray The byte array to send
 * @param {Number} offset Optional offset (defaults to zero)
 * @param {Number} length Optional length (defaults to the
 * length of the byte array)
 * @name WebSocket.instance.sendBinary
 * @function
 */
WebSocket.prototype.sendBinary = function(byteArray, offset, length) {
    if (!this.isOpen()) {
        throw new Error("Not connected");
    }
    var buffer = ByteBuffer.wrap(byteArray, parseInt(offset, 10) || 0,
        parseInt(length, 10) || byteArray.length);
    return this.session.getRemote().sendBytes(buffer);
};

/**
 * Send a byte array over the WebSocket. This method
 * does not wait until the message as been transmitted.
 * @param {ByteArray} byteArray The byte array to send
 * @param {Number} offset Optional offset (defaults to zero)
 * @param {Number} length Optional length (defaults to the
 * length of the byte array)
 * @name WebSocket.instance.sendBinaryAsync
 * @returns {java.util.concurrent.Future}
 * @function
 */
WebSocket.prototype.sendBinaryAsync = function(byteArray, offset, length) {
    if (!this.isOpen()) {
        throw new Error("Not connected");
    }
    var buffer = ByteBuffer.wrap(byteArray, parseInt(offset, 10) || 0,
            parseInt(length, 10) || byteArray.length);
    return this.session.getRemote().sendBytesByFuture(buffer);
};

/**
 * Check whether the WebSocket is open.
 * @name WebSocket.instance.isOpen
 * @return {Boolean} true if the connection is open
 * @function
 */
WebSocket.prototype.isOpen = function() {
    return this.session !== null && this.session.isOpen();
};
