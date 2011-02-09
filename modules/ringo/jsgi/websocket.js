/**
 * @fileOverview adds support for Websockets to Ringo webapps.
 */

var {Session} = require("./request");
var log = require("ringo/logging").getLogger(module.id);
var {WebSocket, WebSocketServlet} = org.eclipse.jetty.websocket;

/**
 * Start accepting WebSocket connections in the given ringo/httpserver context.
 *
 * @param context The ringo/httpserver Server context
 * @param path The URL path on which to accept WebSocket connections
 * @param onconnect a function called for each new WebSocket connection
 *        with the WebSocket object as argument.
 */
exports.addWebSocket = function(context, path, onconnect) {
    log.info("Starting websocket support");
    context.addServlet(path, new WebSocketServlet({
        doWebSocketConnect : function(request, protocol) {
            log.debug("new websocket");
            var socket;

            return new WebSocket({
                onConnect: function(outbound) {
                    log.debug("onconnect");
                    var session;
                    /**
                     * The WebSocket object passed as argument to the `connect` callback.
                     * Assign callbacks to its [onmessage](#WebSocket.prototype.onmessage)
                     * and [onclose](#WebSocket.prototype.onclose) properties.
                     * @name WebSocket
                     * @class
                     */
                    socket = {
                        /**
                         * Closes the WebSocket connection.
                         * @name WebSocket.instance.close
                         * @function
                         */
                        close: function() {
                            outbound.disconnect();
                        },
                        /**
                         * Send a string over the WebSocket.
                         * @param msg a string
                         * @name WebSocket.instance.send
                         * @function
                         */
                        send: function(msg) {
                            outbound.sendMessage(msg);
                        },
                        /**
                         * Check whether the WebSocket is open.
                         * @name WebSocket.instance.isOpen
                         * @function
                         */
                        isOpen: function() {
                            return outbound.isOpen();
                        },
                        /**
                         * Get the HTTP Session object associated with this WebSocket.
                         * @name WebSocket.instance.getSession
                         * @function
                         */
                        getSession: function() {
                            session = session || new Session(request);
                            return session;
                        },
                        /**
                         * Callback slot for receiving messages on this WebSocket. To receive
                         * messages on this WebSocket, assign a function to this property.
                         * The function is called with a single argument containing the message string.
                         * @name WebSocket.instance.onmessage
                         */
                        onmessage: null,
                        /**
                         * Callback slot for getting notified when the WebSocket is closed.
                         * To get called when the WebSocket is closed assign a function to this
                         * property. The function is called without arguments.
                         * @name WebSocket.instance.onclose
                         */
                        onclose: null
                    };
                    if (typeof onconnect === "function") {
                        onconnect(socket)
                    }
                },

                onMessage: function(frame, data) {
                    log.debug("onmessage");
                    if (typeof socket.onmessage === "function") {
                        socket.onmessage(data);
                    }
                },

                onDisconnect: function() {
                    log.debug("ondisconnect");
                    if (typeof socket.onclose === "function") {
                        socket.onclose();
                    }
                }
            });
        }
    }));
};

