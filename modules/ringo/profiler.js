
var log = require('ringo/logging').getLogger(module.id);
var Buffer = require('ringo/buffer').Buffer;

export('Profiler');

/**
 * A class for measuring the frequency and runtime of function invocations.
 */
function Profiler() {
    var stack = [];
    var frames = {};
    var nanoTime = java.lang.System.nanoTime;

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
        return frame;
    };

    var getScriptName = function(script) {
        if (script.isFunction()) {
            var name = [script.sourceName,  " #", script.lineNumbers[0]];
            if (script.functionName) {
                name.push(": ", script.functionName);
            }
            return name.join("");
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
        var commonPrefix = list.reduce(function(previous, current) {
            return previous.getCommonPrefix(current.name);
        }, "");
        for each (var item in list) {
            var str = item.renderLine(commonPrefix.length);
            maxLength = Math.max(maxLength, str.length);
            buffer.push(str);
        }
        return { data: buffer.join(''), maxLength: maxLength };
    };

    this.getFormattedResult = function(maxFrames) {
        var result = this.getResult(maxFrames);
        var buffer = new Buffer();
        buffer.writeln();
        buffer.writeln("     total  average  calls    path");
        for (var i = 1; i < result.maxLength; i++) {
            buffer.write("-");
        }
        buffer.writeln();
        buffer.writeln(result.data);
        return buffer.toString();
    };

    function Frame(name) {

        var timer; // current invocation timer
        var timerstack = []; // invocation timer stack
        var invocations = []; // list of finished invocations
        this.name = name;

        this.onEnter = function(cx, activation, thisObj, args) {
            if (timer) {
                timerstack.push(timer);
            }
            var now = nanoTime();
            timer = [];
            timer.name = name;
            timer.start = now;
            if (stack.length > 0) {
                timer.invoker = stack[stack.length - 1].name;
            }
            stack.push(this);
        };

        this.onExceptionThrown = function(cx, ex) {
        };

        this.onExit = function(cx, byThrow, resultOrException) {
            timer.end = nanoTime();
            stack.pop();
            if (stack.length > 0) {
                stack[stack.length - 1].addInvocationChild(timer);
            }
            invocations.push(timer);
            timer = timerstack.pop();
        };

        this.addInvocationChild = function(child) {
            timer.push(child);
        };

        this.getSelftime = function() {
            return invocations.reduce(
                function(prev, e) {
                    return prev + e.end - e.start - e.reduce(function(prev, e) {
                        return prev + e.end - e.start;
                    }, 0);
                }, 0
            );
        };
        
        this.getRuntime = function() {
            return invocations.reduce(
                function(prev, e) {
                    return prev + (e.end - e.start);
                }, 0
            );
        };

        this.getInvocations = function() {
            return invocations.length;
        };

        this.renderLine = function(prefixLength) {
            var runtime = this.getRuntime() / 1000000;
            var count = this.getInvocations();
            var formatter = new java.util.Formatter();
            formatter.format("%1$7.0f ms %2$5.0f ms %3$6.0f    %4$s%n",
                    runtime, Math.round(runtime / count), count, name.slice(prefixLength));
            return formatter.toString();
        };

        return new org.mozilla.javascript.debug.DebugFrame(this);
    }

    var profiler = new org.ringojs.util.DebuggerBase(this);
    profiler.debuggerScript = module.id + ".js";
    return profiler;
}

