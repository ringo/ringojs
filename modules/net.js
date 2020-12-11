/**
 * @fileoverview This module provides support for networking using
 * TCP and UDP sockets. A socket represents a connection between a
 * client and a server program over a network. The underlying native
 * binding is provided by the `java.net` package.
 *
 * @example // A simple TCP server
 * const io = require('io');
 * const net = require('net');
 *
 * const server = new net.ServerSocket();
 * server.bind('127.0.0.1', 6789);
 *
 * const socket = server.accept();
 * const stream = new io.TextStream(socket.getStream(), {
 *   'charset': 'US-ASCII'
 *});
 *
 * let line;
 * do {
 *   // Read one line from the client
 *   line = stream.readLine();
 *   console.log(line);
 *
 *   // Write back to the client
 *   stream.writeLine("Received: " + line);
 *} while (line.indexOf("END") < 0);
 *
 * stream.close();
 * socket.close();
 * server.close();
 */

const io = require('io');
const binary = require('binary');

const toSocketAddress = function(host, port) {
    host = host || "";
    port = port || 0;
    return new java.net.InetSocketAddress(host, port);
};

/**
 * The Socket class is used to create a TCP socket. Newly created sockets must
 * be connected to a remote address before being able to send and receive data.
 * @constructor
 * @class Socket
 */
const Socket = exports.Socket = function() {
    let stream;
    const arg = arguments[0];

    if(!(this instanceof Socket)) {
        return arg ? new Socket(arg) : new Socket();
    }

    // Either create a new socket or a wrapper around an existing socket
    const socket = arg instanceof java.net.Socket ? arg : new java.net.Socket();

    /**
     * Initiate a connection on a socket. Connect to a remote port on the specified
     * host with a connection timeout. Throws an exception in case of failure.
     *
     * @param {String} host IP address or hostname
     * @param {Number} port port number or service name
     * @param {Number} [timeout] optional timeout value in milliseconds
     */
    this.connect = function(host, port, timeout) {
        const address = toSocketAddress(host, port);
        if (arguments.length < 3) {
            socket.connect(address);
        } else {
            socket.connect(address, timeout);
        }
        return this;
    };

    /**
     * Binds the socket to a local address and port. If address or port are
     * omitted the system will choose a local address and port to bind the socket.
     *
     * @param {String} host address (interface) to which the socket will be bound.
     * @param {Number} port port number to bind the socket to.
     */
    this.bind = function(host, port) {
        const address = toSocketAddress(host, port);
        socket.bind(address);
        return this;
    };

    /**
     * Get the [I/O stream](../io#Stream) for this socket.
     * @return {Stream} a binary stream
     * @see io#Stream
     */
    this.getStream = function() {
        if(!stream) {
            if (!socket.isConnected()) {
                throw new Error("Socket is not connected");
            }
            stream = new io.Stream(socket.inputStream, socket.outputStream);
        }
        return stream;
    };

    /**
     * Returns whether this socket is bound to an address.
     * @return true if the socket has been bound to an address
     */
    this.isBound = function() {
        return socket.isBound();
    };

    /**
     * Returns whether the socket is connected or not.
     * @return true if the socket has been connected to a remote address
     */
    this.isConnected = function() {
        return socket.isConnected();
    };

    /**
     * Returns whether the socket is closed or not.
     * @return true if the socket has been closed
     */
    this.isClosed = function() {
        return socket.isClosed();
    };

    /**
     * Get the local address to which this socket is bound. This returns an
     * object with a property `address` containing the IP address as string
     * and a property `port` containing the port number, e.g.
     * `{address: '127.0.0.1', port: 8080}`.
     * @return {Object} an address descriptor
     */
    this.localAddress = function() {
        return {
            address: socket.getLocalAddress().getHostAddress(),
            port: socket.getLocalPort()
        }
    }

    /**
     * Get the remote address to which this socket is connected. This returns an
     * object with a property `address` containing the IP address as string
     * and a property `port` containing the port number, e.g.
     * `{address: '127.0.0.1', port: 8080}`.
     * @return {Object} an address descriptor
     */
    this.remoteAddress = function() {
        return {
            address: socket.getInetAddress().getHostAddress(),
            port: socket.getPort()
        }
    }

    /**
     * Return the current timeout of this Socket. A value of zero
     * implies that timeout is disabled, i.e. read() will never time out.
     * @return {Number} the current timeout
     */
    this.getTimeout = function() {
        return socket.getSoTimeout();
    };

    /**
     * Enable/disable timeout with the specified timeout, in milliseconds.
     * With this option set to a non-zero timeout, a read() on this socket's
     * stream will block for only this amount of time.
     * @param {Number} timeout timeout in milliseconds
     */
    this.setTimeout = function(timeout) {
        socket.setSoTimeout(timeout);
    };

    /**
     * Close the socket immediately
     */
    this.close = function() {
        socket.close();
    };

    return this;
};

/**
 * The DatagramSocket class is used to create a UDP socket.
 * @constructor
 */
const DatagramSocket = exports.DatagramSocket = function() {
    const arg = arguments[0];
    if(!(this instanceof DatagramSocket)) {
        return arg ? new DatagramSocket(arg) : new DatagramSocket();
    }

    // Either create a new socket or a wrapper around an existing socket
    const socket = arg instanceof java.net.DatagramSocket ? arg : new java.net.DatagramSocket(null);

    function receiveInternal(length, buffer) {
        length = length || 1024;
        buffer = buffer || new binary.ByteArray(length);
        const packet = new java.net.DatagramPacket(buffer, length);
        socket.receive(packet);
        return packet;
    }

    function toDatagramPacket(arg) {
        if (arg instanceof binary.Binary) {
            return new java.net.DatagramPacket(arg, arg.length);
        } else if (typeof arg === "string") {
            return new java.net.DatagramPacket(binary.toByteString(arg), arg.length);
        } else {
            throw new Error("Unsupported argument to send: " + arg);
        }
    }

    /**
     * Connect the socket to a remote address. If a DatagramSocket is connected,
     * it may only send data to and receive data from the given address. By
     * default DatagramSockets are not connected.
     *
     * @param {String} host IP address or hostname
     * @param {Number} port port number or service name
     */
    this.connect = function(host, port) {
        const address = toSocketAddress(host, port);
        socket.connect(address);
        return this;
    };

    /**
     * Disconnects the socket.
     */
    this.disconnect = function() {
        socket.disconnect();
    }

    /**
     * Binds the socket to a local address and port. If address or port are
     * omitted the system will choose a local address and port to bind the socket.
     *
     * @param {String} host address (interface) to which the socket will be bound.
     * @param {Number} port port number to bind the socket to.
     */
    this.bind = function(host, port) {
        const address = toSocketAddress(host, port);
        socket.bind(address);
        return this;
    };

    /**
     * Returns whether this socket is bound to an address.
     * @return {Boolean} true if the socket has been bound to an address
     */
    this.isBound = function() {
        return socket.isBound();
    };

    /**
     * Returns whether the socket is connected or not.
     * @return {Boolean} true if the socket has been connected to a remote address
     */
    this.isConnected = function() {
        return socket.isConnected();
    };

    /**
     * Returns whether the socket is closed or not.
     * @return {Boolean} true if the socket has been closed
     */
    this.isClosed = function() {
        return socket.isClosed();
    };

    /**
     * Get the local address to which this socket is bound. This returns an
     * object with a property `address` containing the IP address as string
     * and a property `port` containing the port number, e.g.
     * `{address: '127.0.0.1', port: 8080}`.
     * @return {Object} an address descriptor
     */
    this.localAddress = function() {
        return {
            address: socket.getLocalAddress().getHostAddress(),
            port: socket.getLocalPort()
        }
    }

    /**
     * Get the remote address to which this socket is connected. This returns an
     * object with a property `address` containing the IP address as string
     * and a property `port` containing the port number, e.g.
     * `{address: '127.0.0.1', port: 8080}`.
     * @return {Object} an address descriptor
     */
    this.remoteAddress = function() {
        return {
            address: socket.getInetAddress().getHostAddress(),
            port: socket.getPort()
        }
    }

    /**
     * Receive a datagram packet from this socket. This method does not return
     * the sender's IP address, so it is meant to be in conjunction with
     * [connect()](#DatagramSocket.prototype.connect).
     * @param {Number} length the maximum number of bytes to receive
     * @param {ByteArray} buffer optional buffer to store bytes in
     * @return {ByteArray} the received data
     */
    this.receive = function(length, buffer) {
        const packet = receiveInternal(length, buffer);
        buffer = ByteArray.wrap(packet.getData());
        buffer.length = packet.length;
        return buffer;
    };

    /**
     * Receive a datagram packet from this socket. This method returns an object
     * with the following properties:
     *
     *  - address: the sender's IP address as string
     *  - port: the sender's port number
     *  - data: the received data
     *
     * @param {Number} length the maximum number of bytes to receive
     * @param {ByteArray} buffer optional buffer to store bytes in
     * @return {Object} the received packet
     */
    this.receiveFrom = function(length, buffer) {
        const packet = receiveInternal(length, buffer);
        buffer = ByteArray.wrap(packet.getData());
        buffer.length = packet.length;
        return {
            address: packet.getAddress().getHostAddress(),
            port: packet.getPort(),
            data: buffer
        };
    };

    /**
     * Send a datagram packet from this socket. This method does not allow
     * the specify the recipient's IP address, so it is meant to be in
     * conjunction with [connect()](#DatagramSocket.prototype.connect).
     * @param {Binary} data the data to send
     */
    this.send = function(data) {
        socket.send(toDatagramPacket(data));
    };

    /**
     * Send a datagram packet from this socket to the specified address.
     * @param {String} host the IP address of the recipient
     * @param {Number} port the port number
     * @param {Binary} data the data to send
     */
    this.sendTo = function(host, port, data) {
        const packet = toDatagramPacket(data);
        packet.setSocketAddress(toSocketAddress(host, port));
        socket.send(packet);
    }

    /**
     * Return the current timeout of this DatagramSocket. A value of zero
     * implies that timeout is disabled, i.e. receive() will never time out.
     * @return {Number} the current timeout
     */
    this.getTimeout = function() {
        return socket.getSoTimeout();
    };

    /**
     * Enable/disable timeout with the specified timeout, in milliseconds.
     * With this option set to a non-zero timeout, a call to receive() for this
     * DatagramSocket will block for only this amount of time.
     * @param {Number} timeout timeout in milliseconds
     */
    this.setTimeout = function(timeout) {
        socket.setSoTimeout(timeout);
    };

    /**
     * Close the socket immediately
     */
    this.close = function() {
        socket.close();
    };

    return this;
};

/**
 * This class implements a server socket. Server sockets wait for requests
 * coming in over the network.
 * @constructor
 */
const ServerSocket = exports.ServerSocket = function() {
    const arg = arguments[0];
    if(!(this instanceof ServerSocket)) {
        return arg ? new ServerSocket(arg) : new ServerSocket();
    }

    // Either create a new socket or a wrapper around an existing socket
    const socket = arg instanceof java.net.ServerSocket ? arg : new java.net.ServerSocket();

    /**
     * Listens for a connection to be made to this socket and returns a new
     * [Socket](#Socket) object. The method blocks until a connection is made.
     * @return {Socket} a newly connected socket object
     */
    this.accept = function() {
        return new Socket(socket.accept());
    };

    /**
     * Binds the socket to a local address and port. If address or port are
     * omitted the system will choose a local address and port to bind the socket.
     *
     * @param {String} host address (interface) to which the socket will be bound.
     * @param {Number} port port number to bind the socket to.
     */
    this.bind = function(host, port, backlog) {
        const address = toSocketAddress(host, port);
        if (arguments.length < 3) {
            socket.bind(address);
        } else {
            socket.bind(address, backlog);
        }
        return this;
    };

    /**
     * Returns whether this socket is bound to an address.
     * @return {Boolean} true if the socket has been bound to an address
     */
    this.isBound = function() {
        return socket.isBound();
    };

    /**
     * Returns whether the socket is closed or not.
     * @return {Boolean} true if the socket has been closed
     */
    this.isClosed = function() {
        return socket.isClosed();
    };

    /**
     * Get the local address to which this socket is bound. This returns an
     * object with a property `address` containing the IP address as string
     * and a property `port` containing the port number, e.g.
     * `{address: '127.0.0.1', port: 8080}`
     * @return {Object} an address descriptor
     */
    this.localAddress = function() {
        return {
            address: socket.getInetAddress().getHostAddress(),
            port: socket.getLocalPort()
        }
    }

    /**
     * Return the current timeout of this ServerSocket. A value of zero implies
     * that timeout is disabled, i.e. accept() will never time out.
     * @return {Number} the current timeout
     */
    this.getTimeout = function() {
        return socket.getSoTimeout();
    };

    /**
     * Enable/disable timeout with the specified timeout, in milliseconds.
     * With this option set to a non-zero timeout, a call to accept() for this
     * ServerSocket will block for only this amount of time.
     * @param {Number} timeout timeout in milliseconds
     */
    this.setTimeout = function(timeout) {
        socket.setSoTimeout(timeout);
    };

    /**
     * Close the socket immediately
     */
    this.close = function() {
        socket.close();
    };
}
