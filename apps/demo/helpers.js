var {Buffer} = require('ringo/buffer');

/**
 * A test output formatter for displaying ringo/unittest results in a web page
 */
exports.HtmlTestFormatter = function() {
    var buffer = new Buffer();
    var result = "";
    var path = [];

    this.writeHeader = function() {
    };

    this.enterScope = function(name) {
        path.push(name)
        buffer.writeln("<h3>Running \"", path.join("/"), "\"</h3>");
    };

    this.exitScope = function(name) {
        path.pop();
    };

    this.writeTestStart = function(name) {
        buffer.write("<div style='clear: both;'>Running ", name, "...");
    };

    this.writeTestPassed = function(time) {
        buffer.writeln(" <div style='float: right; background: #2b2; color: white; padding: 2px;'>PASSED</div>",
                " (" + time + " ms)</div>");
    };

    this.writeTestFailed = function(exception) {
        buffer.write(" <div style='float: right; background: red; color: white; padding: 2px;'>FAILED</div> ");
        buffer.write("<pre style='font-weight: bold;'>");
        exception.message.split(/\n/).forEach(function(line) {
            buffer.writeln("  ", line);
        });
        if (exception.stackTrace != null) {
            exception.stackTrace.forEach(function(line) {
                buffer.writeln("  ", line);
            });
        }
        buffer.write("</pre></div>");
    };

    this.writeSummary = function(summary) {
        if (summary.testsRun > 0) {
            result = new Buffer();
            result.writeln("<h2>Executed ", summary.testsRun, " tests in ", summary.time, " ms</h2>");
            result.writeln("<h3>Passed ", summary.passed + "; ", "Failed ", summary.failures + "; ", "Errors ", summary.errors + ";</h3>");
        } else {
            result = "<h2>No tests found</h2>";
        }
    };

    this.toString = function() {
        return result  + buffer.toString();
    }

    this.toByteString = function(charset) {
        return this.toString().toByteString(charset);
    }
};
