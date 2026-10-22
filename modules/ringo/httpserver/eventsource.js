const log = require("ringo/logging").getLogger(module.id);
const {EventSource} = org.eclipse.jetty.ee10.servlets;
const {JavaEventEmitter} = require("ringo/events");

/**
 * Provides support for EventSource in the HTTP server.
 *
 * EventSource is an event emitter that supports the
 * following events:
 *
 *  * **open**: called when a new eventsource connection is accepted
 *  * **close**: called when an established eventsource connection closes
 * @name EventSource
 */
module.exports = function EventSourceWrapper() {
    let conn = null;

    /**
     * Closes the EventSource connection.
     * @name EventSource.instance.close
     */
    this.close = function() {
        if (conn) {
            conn.close();
            log.debug("Closed connection", conn);
        }
    };

    /**
     * Send a default event to the client
     * @param {String} msg a string
     * @name EventSource.instance.data
     */
    this.data = function(msg) {
        if (conn) {
            try {
                conn.data(msg);
            } catch (e) {
                if (log.isDebugEnabled()) {
                    log.error("Error sending data to {}:", conn, e);
                }
                conn = null;
                this.emit("close");
            }
        }
    };

    /**
     * Send a named event
     * @param {String} name a string
     * @param {String} msg a string
     * @name EventSource.instance.event
     */
    this.event = function(name, msg) {
        if (conn) {
            try {
                conn.event(name, msg);
            } catch (e) {
                if (log.isDebugEnabled()) {
                    log.error("Error sending '{}' event to {}:", name, conn, e);
                }
                conn = null;
                this.emit("close");
            }
        }
    };
    /**
     * Send a comment
     * @param {String} msg a string
     * @name EventSource.instance.comment
     */
    this.comment = function(msg) {
        if (conn) {
            try {
                conn.comment(msg);
            } catch (e) {
                if (log.isDebugEnabled()) {
                    log.error("Error sending comment to {}:", conn, e);
                }
                conn = null;
                this.emit("close");
            }
        }
    };

    /** @ignore **/
    this.setConnection = function(connection) {
        conn = connection;
    };

    JavaEventEmitter.call(this, [EventSource]);
    this.addListener("open", function(connection) {
        conn = connection;
    });

    return this;
};
