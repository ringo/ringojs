
var log = require('helma/logging').getLogger(__name__);

export('Profiler');

function Profiler() {
    var frames = {};
    var currentFrame = null;

    this.getScriptFrame = function(cx, script) {
        if (!script.isFunction()) {
            return null;
        }
        var name = getScriptName(script);
        var frame = frames[name];
        if (!frame) {
            frame = new Frame(name);
            frames[name] = frame;
        }
        // frame.addCall(currentFrame);
        currentFrame = name;
        return frame;
    };

    var getScriptName = function(script) {
        if (script.isFunction()) {
            if (script.functionName) {
                return script.sourceName + ": " + script.functionName;
            } else {
                return script.sourceName + ": #" + script.lineNumbers[0];
            }
        } else {
            return script.sourceName;
        }
    };

    this.getResult = function(maxFrames) {
        var list = [];
        for each (var frame in frames) {
            list.push(frame);
        }
        // sort list according to total runtime
        list = list.sort(function(a, b) {
                return b.getRuntime() - a.getRuntime();
        });
        // cut list to maxFrames elements
        list.length = maxFrames;
        var count = 0;
        var buffer = [];
        var maxLength = 0;
        // find common prefix in path names
        var commonPrefix = list.map(function(item) {
            return item.name;
        }).reduce(function(previous, current) {
            return previous.getCommonPrefix(current);
        });
        for each (var item in list) {
            var str = item.renderLine(commonPrefix.length);
            maxLength = Math.max(maxLength, str.length);
            buffer.push(str);
        }
        return { data: buffer.join(''), maxLength: maxLength };
    };

    function Frame(name) {

        var time = 0, runtime = 0, invocations = 0;
        var lineNumber = 0;
        this.name = name;

        this.onEnter = function(cx, activation, thisObj, args) {
            // log.debug("Enter: " + name);
            time = java.lang.System.nanoTime();
        };

        this.onExceptionThrown = function(cx, ex) {
            // log.debug("Exception: " + name);
            invocations += 1;
            runtime += (java.lang.System.nanoTime() - time);
        };

        this.onExit = function(cx, byThrow, resultOrException) {
            // log.debug("Exit: " + name);
            invocations += 1;
            runtime += (java.lang.System.nanoTime() - time);
        };

        this.onLineChange = function(cx, line) {
            // log.debug("Line number: " + line);
            lineNumber = line;
        };

        this.getRuntime = function() {
            return runtime;
        };

        this.renderLine = function(prefixLength) {
            var millis = Math.round(this.runtime / 1000000);
            var formatter = new java.util.Formatter();
            formatter.format("%1$7.0f ms %2$5.0f ms %3$6.0f    %4$s%n", millis,
                    Math.round(millis / invocations), invocations, name.slice(prefixLength));
            return formatter.toString();
        };

        return new org.mozilla.javascript.debug.DebugFrame(this);
    }

    var profiler = new org.helma.util.DebuggerBase(this);
    profiler.debuggerScript = __path__;
    return profiler;
}

