var strings = require("ringo/utils/strings");

var onmessage = function(event) {
    var {max, response} = event.data;
    response.write("starting...");
    var cnt = 0;
    var intervalId = setInterval(function() {
        try {
            // console.log(java.lang.Thread.currentThread().getName(), "worker writing to response...");
            response.write("\n-------\n");
            response.write(strings.repeat("hello ", 100));
            if (++cnt === max) {
                clearInterval(intervalId);
                response.write("\n-------\n");
                response.write("finished!");
                response.close();
                event.source.postMessage("finished");
            }
        } catch (e) {
            clearInterval(intervalId);
        }
    }, 500);
};

