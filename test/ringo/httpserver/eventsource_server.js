require('ringo/logging').setConfig(getResource('../httptest_log4j2.properties'));

const httpServer = require("../../../modules/ringo/httpserver");

const {AbstractLifeCycleListener} = org.eclipse.jetty.util.component.AbstractLifeCycle;

let server = null;

const start = (event) => {
    const {options, message} = event.data;
    const lifeCycleListener = new AbstractLifeCycleListener({
        lifeCycleFailure: (event, error) => {
            event.source.postError(error);
        },
        lifeCycleStarted: () => {
            event.source.postMessage("started");
        },
        lifeCycleStopped: () => {
            event.source.postMessage("stopped");
        }
    });

    server = httpServer
        .build()
        .serveApplication("/", () => {})
        .addEventSource(options.path, (socket) => {
            socket.addListener("open", () => {
                // send messages and close connection immediately after
                socket.comment(message);
                socket.data(message);
                socket.event("test", message);
                socket.close();
            });
        })
        .http({
            host: options.host,
            port: options.port
        })
        .server;
    server.jetty.addEventListener(lifeCycleListener);
    server.start();
};

const stop = (event) => {
    try {
        server && server.stop() && server.destroy();
    } catch (error) {
        event.source.postError(error);
    }
};

const onmessage = (event) => {
    if (event.data.action === "start") {
        start(event);
    } else {
        stop(event);
    }
};
