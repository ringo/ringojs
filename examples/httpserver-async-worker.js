const fs = require("fs");

const onmessage = (event) => {
    const {response, file} = event.data;
    const stream = fs.openRaw(file);
    const intervalId = setInterval(() => {
        try {
            const buf = stream.read(4096);
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

