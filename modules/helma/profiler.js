var system = loadModule('helma.system');
var logging = loadModule('helma.logging');
var {write, writeln} = loadModule('helma.shell');
var log = logging.getLogger(__name__);

/**
 * Register a request listener that automatically sets rhino optimization
 * level to -1 and adds a profiler.
 * @param maxFrames {Number} maximum number of call frames to display
 */
function enable(maxFrames) {
    maxFrames = maxFrames || 30;
    var profiler;
    system.addCallback('onInvoke', 'profiler-support', function() {
        if (!profiler) {
            profiler = new Profiler();
        }
        system.setRhinoOptimizationLevel(-1);
        system.getRhinoContext().setDebugger(profiler, null);
        // log.info('Initialized Tracer for request ' + req.path);
    });
    system.addCallback('onReturn', 'profiler-support', function() {
        var result = profiler.getResult(maxFrames);
        writeln();
        writeln("   total  average  calls  path");
        for (var i = 1; i < result.maxLength; i++) {
            write("=");
        }
        writeln();
        writeln(result.data);
    })
}

/**
 * Disable profiling
 */
function disable() {
    system.removeCallback('onInvoke', 'profiler-support');
    system.removeCallback('onReturn', 'profiler-support');
}

/**
 * Reset profiler data, starting new profiling session
 * @param maxFrames {Number} maximum number of call frames to display
 */
function reset(maxFrames) {
    disable();
    enable(maxFrames);
}

function Profiler() {

    var frames = new java.util.HashMap();
    var currentFrame = null;

    this.getScriptFrame = function(cx, script) {
        if (!script.isFunction()) {
            return null;
        }
        var name = getScriptName(script);
        log.debug('Getting Frame for ' + name + " - " + frames.size());
        var frame = frames.get(name);
        if (!frame) {
            frame = new Frame(name);
            frames.put(name, frame);
        }
        // frame.addCall(currentFrame);
        currentFrame = name;
        return frame;
    }

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
    }

    this.getResult = function(maxFrames) {
        var list = new java.util.ArrayList(frames.values());
        java.util.Collections.sort(list, new java.util.Comparator({
            compare: function(a, b) {
                return b.getRuntime() - a.getRuntime();
            }
        }));
        var count = 0;
        var buffer = new java.lang.StringBuffer();
        var maxLength = 0;
        for (var item in Iterator(list)) {
            if (count++ > maxFrames) {
                buffer.append("(truncated)");
                break;
            }
            var str = item.toString();
            maxLength = Math.max(maxLength, str.length);
            buffer.append(item.toString());
        }
        return { data: buffer.toString(), maxLength: maxLength };
    };

    function Frame(name) {

        var time = 0, runtime = 0, invocations = 0;
        var lineNumber = 0;

        this.onEnter = function(cx, activation, thisObj, args) {
            // log.debug("Enter: " + name);
            time = java.lang.System.nanoTime();
        }

        this.onExceptionThrown = function(cx, ex) {
            // log.debug("Exception: " + name);
            invocations += 1;
            runtime += (java.lang.System.nanoTime() - time);
        }

        this.onExit = function(cx, byThrow, resultOrException) {
            // log.debug("Exit: " + name);
            invocations += 1;
            runtime += (java.lang.System.nanoTime() - time);
        }

        this.onLineChange = function(cx, line) {
            // log.debug("Line number: " + line);
            lineNumber = line;
        }

        this.getRuntime = function() {
            return runtime;
        }

        this.toString = function() {
            var millis = Math.round(this.runtime / 1000000);
            var formatter = new java.util.Formatter();
            formatter.format("%1$5.0f ms %2$5.0f ms %3$6.0f  %4$s%n", millis,
                    Math.round(millis / invocations), invocations, name);
            return formatter.toString();
        }

        return new org.mozilla.javascript.debug.DebugFrame(this);
    }

    var profiler = new org.helma.util.DebuggerBase(this);
    profiler.debuggerScript = __path__;
    return profiler;
}

