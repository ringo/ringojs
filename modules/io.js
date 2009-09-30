include('binary');

defineClass(org.helma.wrappers.IOStream);
export('IOStream', 'TextInputStream', 'TextOutputStream');

module.shared = true;

function TextInputStream(io, charset, buffering) {
    var stream;

    if (charset === undefined)
        stream = new java.io.InputStreamReader(io);
    else
        stream = new java.io.InputStreamReader(io, charset);

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

    this.iterator = function () {
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
        stream = new java.io.OutputStreamWriter(io);
    else
        stream = new java.io.OutputStreamWriter(io, charset);

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
        stream.close();
    };

    return this;
}

