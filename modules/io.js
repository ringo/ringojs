include('binary');

defineClass(org.helma.wrappers.Stream);
export('Stream', 'TextStream');

importClass(java.io.InputStreamReader, 
            java.io.BufferedReader,
            java.io.OutputStreamWriter,
            java.io.BufferedWriter);

module.shared = true;

function TextStream(io, charset, buflen) {
    var reader, writer;

    if (io.readable()) {
        reader = charset == undefined ?
                 new InputStreamReader(io.inputStream) : 
                 new InputStreamReader(io.inputStream, charset);
        reader = new BufferedReader(reader, buflen || 8192);
    }

    if (io.writable()) {
        writer = charset == undefined ?
                 new OutputStreamWriter(io.outputStream):
                 new OutputStreamWriter(io.outputStream, charset);
        writer = new BufferedWriter(writer, buflen || 8192);
    }

    this.readable = function() {
       return io.readable();
    }

    this.writable = function() {
        return io.writable();
    }

    this.seekable = function() {
        return false;
    }

    this.readLine = function () {
        var line = reader.readLine();
        if (line === null)
            return '';
        return String(line) + "\n";
    };

    this.iterator = function () {
        return this;
    };

    this.next = function () {
        var line = reader.readLine();
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

    this.write = function () {
        writer.write.apply(writer, arguments);
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
        writer.flush();
        return this;
    };

    this.close = function () {
        io.close();
    };

    return this;
}

