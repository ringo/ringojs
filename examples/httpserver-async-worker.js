var strings = require("ringo/utils/strings");

var onmessage = function(event) {
    var {max, response} = event.data;
    response.write("starting...\n");
    var cnt = 0;
    var intervalId = setInterval(function() {
        try {
            response.write(strings.repeat("hello ", 100) + "\n-------\n");
            if (++cnt === max) {
                clearInterval(intervalId);
                response.write("finished!");
                response.close();
                event.source.postMessage("finished");
            }
        } catch (e) {
            clearInterval(intervalId);
        }
    }, 1000);
};

