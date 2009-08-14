var Binary = require("./binary").Binary;

export('IO', 'TextInputStream', 'TextOutputStream');

function IO(inputStream, outputStream) {
    this.inputStream = inputStream;
    this.outputStream = outputStream;
}

IO.prototype.read = function(length) {
    var readAll = false,
        buffer  = null,
        bytes   = null,
        total   = 0,
        index   = 0,
        read    = 0;
    
    if (typeof length !== "number") {
        readAll = true;
        length = 1024;
    }

    buffer = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, length);

    do {
        read = this.inputStream.read(buffer, index, length - index);
        
        if (read < 0)
            break;
        
        if (bytes) {
            bytes.write(buffer, index, read);
            index = 0;
        } else {
            index += read;
            if (index === buffer.length && readAll) {
                bytes = new java.io.ByteArrayOutputStream(length * 2);
                bytes.write(buffer, 0, length);
                index = 0;
            }
        }	
        total += read;

    } while ((readAll || total < length) && read > -1);
    
    var resultBuffer, resultLength;
    
    if (bytes) {
        resultBuffer = bytes.toByteArray();
    } else if (total < buffer.length) {
        resultBuffer = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, total);
        java.lang.System.arraycopy(buffer, 0, resultBuffer, 0, total);
    } else {
        resultBuffer = buffer;
    }
    
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
    return this;
}

IO.prototype.flush = function() {
    this.outputStream.flush();
    return this;
};

IO.prototype.close = function() {
    if (this.inputStream)
        this.inputStream.close();
    if (this.outputStream)
        this.outputStream.close();
};

// IO: platform independent

IO.prototype.puts = function() {
    this.write(arguments.length === 0 ? "\n" : Array.prototype.join.apply(arguments, ["\n"]) + "\n");
}

function TextInputStream(io, charset, buffering) {
    var stream;

    if (charset === undefined)
        stream = new java.io.InputStreamReader(io.inputStream);
    else
        stream = new java.io.InputStreamReader(io.inputStream, charset);

    if (buffering === undefined)
        stream = new java.io.BufferedReader(stream);
    else
        stream = new java.io.BufferedReader(stream, buffering);

    this.readLine = function () {
        var line = stream.readLine();
        if (line === null)
            return '';
        return String(line) + "\n";
    };

    this.itertor = function () {
        return this;
    };

    this.next = function () {
        var line = stream.readLine();
        if (line === null)
            throw StopIteration;
        return String(line);
    };

    this.forEach = function (block, context) {
        var line;
        while (true) {
            try {
                line = this.next();
            } catch (exception) {
                break;
            }
            block.call(context, line);
        }
    };

    this.input = function () {
        throw "NYI";
    };

    this.readLines = function () {
        var lines = [];
        do {
            var line = this.readLine();
            if (line.length)
                lines.push(line);
        } while (line.length);
        return lines;
    };

    this.read = function () {
        return this.readLines().join('');
    };

    this.readInto = function (buffer) {
        throw "NYI";
    };

    this.copy = function (output, mode, options) {
        do {
            var line = this.readLine();
            output.write(this);
        } while (line.length);
        output.flush();
        return this;
    };

    this.close = function () {
        io.close();
    };

    return this;
}

function TextOutputStream(io, charset, buffering) {
    var stream;

    if (charset === undefined)
        stream = new java.io.OutputStreamWriter(io.outputStream);
    else
        stream = new java.io.OutputStreamWriter(io.outputStream, charset);

    if (buffering === undefined)
        stream = new java.io.BufferedWriter(stream);
    else
        stream = new java.io.BufferedWriter(stream, buffering);

    this.write = function () {
        stream.write.apply(stream, arguments);
        return this;
    };

    this.writeLine = function (line) {
        this.write(line + "\n"); // todo recordSeparator
        return this;
    };

    this.writeLines = function (lines) {
        lines.forEach(this.writeLine);
        return this;
    };

    this.print = function () {
        this.write(Array.prototype.join.call(arguments, " ") + "\n");
        this.flush();
        // todo recordSeparator, fieldSeparator
        return this;
    };

    this.flush = function () {
        stream.flush();
        return this;
    };

    this.close = function () {
        io.close();
    };

    return this;
}

