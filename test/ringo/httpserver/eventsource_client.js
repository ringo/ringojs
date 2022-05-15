const {AsynchronousSocketChannel, CompletionHandler} = java.nio.channels;
const {ByteBuffer} = java.nio;
const {InetSocketAddress} = java.net;

const {toByteArray} = require("binary");

const BUFFER_SIZE = 768;
const buffer = ByteBuffer.allocate(BUFFER_SIZE);

let channel = null;
const received = new java.lang.StringBuilder();

const SEPARATOR = "\r\n\r\n";

const read = (source, channel) => {
    const completionHandler = new CompletionHandler({
        completed: (bytes) => {
            if (bytes === -1) {
                return;
            }
            const str = new java.lang.String(buffer.array(),
                buffer.arrayOffset(), buffer.arrayOffset() + buffer.position(), "UTF-8");
            received.append(str);
            let index;
            do {
                index = received.indexOf(SEPARATOR);
                if (index > -1) {
                    let chunk = received.substring(0, index);
                    received.delete(0, index + SEPARATOR.length);
                    source.postMessage(chunk.toString());
                }
            } while (index > -1);
            buffer.clear();
            read(source, channel);
        },
        failed: (error) => {
            try {
                channel && channel.close();
            } finally {
                source.postError(error);
            }
        }
    });
    channel.read(buffer, null, completionHandler);
};

const startChannel = (event) => {
    const {host, port, path} = event.data;
    try {
        channel = AsynchronousSocketChannel.open();
        channel.connect(new InetSocketAddress(host, port)).get();
        const request = [
            "GET " + path + " HTTP/1.1",
            "Host: " + host + ":" + port,
            "Accept: text/event-stream",
            "\r\n"
        ].join("\r\n");
        channel.write(ByteBuffer.wrap(toByteArray(request, "utf-8"))).get();
        read(event.source, channel);
    } catch (e) {
        try {
            channel && channel.close();
        } finally {
            event.source.postError(e);
        }
    }
};

const onmessage = (event) => {
    startChannel(event);
};
