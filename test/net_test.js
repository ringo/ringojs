const assert = require("assert");
const {Socket, ServerSocket, DatagramSocket} = require("net");
const {TextStream} = require("io");
const {Semaphore} = require("ringo/concurrent");
const {Arrays} = java.util;
const binary = require("binary");

const HOST = "localhost";
const HOST_IP = "127.0.0.1";
const PORT = 65432;

exports.testTCP = () => {
    const semaphores = {
        "server": new Semaphore(),
        "client": new Semaphore()
    };
    const messages = {
        "toServer": null,
        "toClient": null
    };
    const serverSocket = new ServerSocket();
    serverSocket.bind(HOST, PORT);
    spawn(() => {
        const socket = serverSocket.accept();
        const stream = new TextStream(socket.getStream());
        messages.toServer = stream.readLine();
        stream.writeLine("world");
        semaphores.server.signal();
    });

    const socket = new Socket();
    spawn(() => {
        socket.connect(HOST, PORT);
        const stream = new TextStream(socket.getStream());
        stream.writeLine("hello");
        messages.toClient = stream.readLine();
        semaphores.client.signal();
    });
    semaphores.server.tryWait(200);
    semaphores.client.tryWait(200);
    assert.strictEqual(messages.toServer, "hello\n");
    assert.strictEqual(messages.toClient, "world\n");
};

exports.testUDP = () => {
    const semaphores = {
        "server": new Semaphore(),
        "client": new Semaphore()
    };
    const messages = {
        "toServer": null,
        "toClient": null
    };
    const serverSocket = new DatagramSocket();
    serverSocket.bind(HOST, PORT);
    spawn(() => {
        messages.toServer = serverSocket.receiveFrom(5);
        serverSocket.sendTo(HOST_IP, PORT + 1, "world");
        semaphores.server.signal();
    });

    const clientSocket = new DatagramSocket();
    clientSocket.bind(HOST, PORT + 1);
    spawn(() => {
        clientSocket.sendTo(HOST_IP, PORT, "hello");
        semaphores.client.signal();
        messages.toClient = clientSocket.receiveFrom(5);
    });
    semaphores.server.tryWait(200);
    semaphores.client.tryWait(200);
    assert.strictEqual(messages.toServer.address, HOST_IP);
    assert.strictEqual(messages.toServer.port, PORT + 1);
    assert.isTrue(Arrays.equals(messages.toServer.data, binary.toByteArray("hello")));
    assert.strictEqual(messages.toClient.address, HOST_IP);
    assert.strictEqual(messages.toClient.port, PORT);
    assert.isTrue(Arrays.equals(messages.toClient.data, binary.toByteArray("world")));
};
