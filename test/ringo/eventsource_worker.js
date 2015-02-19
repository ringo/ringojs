var {Server} = require('ringo/httpserver');

export('testEvents', 'testMultLineData', 'testEncoding', 'testComments', 'testServerSideClose');

var testEvents = {
    name: 'event1',
    data: 'data1'
};

var testMultLineData = {
    data1: 'data1',
    data2: 'data2',
    data3: 'data3',
    data4: 'data4'
};

var testEncoding = {
    data: "\u20AC"
}

var testComments = {
    data: 'comment'
}

var testServerSideClose = {
    data: 'shutting down'
}

var server = null;
function onmessage(event) {
    if (event.data === 'start') {
        startServer();
        event.source.postMessage('started');
    } else if (event.data === 'stop') {
        server.stop();
        event.source.postMessage('stopped');
    }
}

function startServer() {
    server = new Server({
        port: 8080
    });

    server.getDefaultContext().addEventSource("/testEvents", function(eventSource) {
        eventSource.addListener("open", function() {
            eventSource.event(testEvents.name, testEvents.data);
        });
    });

    server.getDefaultContext().addEventSource("/testMultLineData", function(eventSource) {
        eventSource.addListener("open", function() {
            // intentionally use different line endings
            var data = testMultLineData.data1 + '\r\n' + testMultLineData.data2 + '\r' +
                testMultLineData.data3 + '\n' + testMultLineData.data4;
            eventSource.data(data);
        });
    });

    server.getDefaultContext().addEventSource('/testEncoding', function(eventSource) {
        eventSource.addListener("open", function() {
            eventSource.data(testEncoding.data);
        })
    });

    server.getDefaultContext().addEventSource('/testComments', function(eventSource) {
        eventSource.addListener("open", function() {
            eventSource.comment(testComments.data);
        })
    });

    server.getDefaultContext().addEventSource('/testServerSideClose', function(eventSource) {
        eventSource.addListener('open', function() {
            eventSource.comment(testServerSideClose.data);
            eventSource.close();
        })
    })

    server.start();
}