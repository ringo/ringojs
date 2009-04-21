// IO: Rhino

var Binary = require("./binary").Binary;

var IO = exports.IO = function(inputStream, outputStream) {
    this.inputStream = inputStream;
    this.outputStream = outputStream;
}

IO.prototype.read = function(length, encoding) {
    var readAll = true,
        buffer  = null,
        bytes   = null,
        read    = 0,
        index   = 0,
        total   = 0;

    if (typeof length === "number") {
        readAll = false;
        buffer = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, length);
    } else {
        bytes = new java.io.ByteArrayOutputStream();
        buffer = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, 1024);
    }

    do {
        read = this.inputStream.read(buffer, index, buffer.length - index);

        if (read < 0)
            break;

        if (readAll) {
            bytes.write(buffer, index, read);
            if (index >= buffer.length)
                index = 0;
        }
        index += read;
        total += read;

        //print("read="+read+" index="+index+" total="+total+" length="+length+" buffers.length="+buffers.length);

    } while ((readAll || total < length) && read > 0);

    var resultBuffer, resultLength;

    if (readAll)
        resultBuffer = bytes.toByteArray();
    else
        resultBuffer = buffer;

    resultLength = resultBuffer.length;

    if (total != resultLength || total !== resultBuffer.length)
        throw new Error("IO.read sanity check failed: total="+total+" resultLength="+resultLength+" resultBuffer.length="+resultBuffer.length);

    return new Binary(resultBuffer);
}

IO.prototype.write = function(object, encoding) {
    if (object === null || object === undefined || typeof object.toBinary !== "function")
        throw new Error("Argument to IO.write must have toBinary() method");

    var binary = object.toBinary(encoding);
    this.outputStream.write(binary.bytes);
}

IO.prototype.flush = function() {
    this.outputStream.flush();
}

IO.prototype.close = function() {
    if (this.inputStream)
        this.inputStream.close();
    if (this.outputStream)
        this.outputStream.close();
}

// IO: platform independent

IO.prototype.puts = function() {
    this.write(arguments.length === 0 ? "\n" : Array.prototype.join.apply(arguments, ["\n"]) + "\n");
}

