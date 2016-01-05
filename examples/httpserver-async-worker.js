var fs = require("fs");

var onmessage = function(event) {
    var {response, file} = event.data;
    var stream = fs.openRaw(file);
    var intervalId = setInterval(function() {
        try {
            var buf = stream.read(4096);
            if (buf.length > 0) {
                response.write(buf);
                response.flush();
            } else {
                clearInterval(intervalId);
                response.close();
                stream.close();
                event.source.postMessage("finished");
            }
        } catch (e) {
            clearInterval(intervalId);
        }
    }, 500);
};

