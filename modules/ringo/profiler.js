/**
 * @fileOverview A profiler for measuring execution time of JavaScript functions. Note that
 * you need to run with optimization level -1 for profiling to work. Running
 * the profiler on optimized code will produce no data.
 */

const strings = require('ringo/utils/strings');
const log = require('ringo/logging').getLogger(module.id);
const Buffer = require('ringo/buffer').Buffer;
const {nanoTime} = java.lang.System;
const engine = require("ringo/engine");

/**
 * @param {Function} script
 */
const getScriptName = (script) => {
    if (script.isFunction()) {
        const name = [script.sourceName,  " #", script.lineNumbers[0]];
        if (script.functionName) {
            name.push(": ", script.functionName);
        }
        return name.join("");
    }
    return script.sourceName;
};

/**
 * Convenience function for profiling the invocation of a function.
 * @param {Function} func the function to profile
 * @param {Number} maxFrames optional maximal number of frames to include
 * @returns {Object} an object with the following properties:
 *  <ul><li>result: the value returned by the function, if any</li>
 *  <li>error: the error thrown by the function, if any</li>
 *  <li>profiler: the Profiler instance used to profile the invocation</li></ul>
 */
exports.profile = (func, maxFrames) => {
    if (engine.getOptimizationLevel() > -1) {
        log.warn("Profiling with optimization enabled will not produce any results.",
                 "Please set the optimization level to -1 when using the profiler.");
    }
    const profiler = new Profiler();
    profiler.attach();
    let result, error;
    try {
        result = func();
    } catch (e) {
        error = e;
    } finally {
        profiler.detach();
    }
    return {
        result: result,
        error: error,
        profiler: profiler
    };
};

/**
 * @param {String} name
 * @param {Array} stack
 */
const Frame = function(name, stack) {

    // The timer for the current invocation of this frame.
    // This is an object containing start and end timestamp properties and
    // a subTimers array property containing timers for functions directly
    // invoked from this frame.
    let currentTimer;
    const timerStack = [];     // Timer stack for other currently active invocations of this frame
    const finishedTimers = []; // Timer list of finished invocations of this frame

    Object.defineProperty(this, "name", {
        "value": name,
        "enumerable": true
    });

    /**
     * @param {Object} cx
     * @param {Object} activation
     * @param {Object} thisObj
     * @param {*...} args...
     */
    this.onEnter = function(cx, activation, thisObj, args) {
        if (currentTimer) {
            timerStack.push(currentTimer);
        }
        const now = nanoTime();
        currentTimer = {
            name: name,
            start: now,
            subTimers: []
            // invoker: stack.length ? stack[stack.length - 1].name : null
        };
        stack.push(this);
    };

    /**
     * @param {Object} cx
     * @param {Object} ex
     */
    this.onExceptionThrown = function(cx, ex) {};

    this.onExit = function(cx, byThrow, resultOrException) {
        currentTimer.end = nanoTime();
        stack.pop();
        if (stack.length > 0) {
            stack[stack.length - 1].addSubTimer(currentTimer);
        }
        finishedTimers.push(currentTimer);
        currentTimer = timerStack.pop();
    };

    this.addSubTimer = function(subTimer) {
        currentTimer.subTimers.push(subTimer);
    };

    this.getSelftime = function() {
        return finishedTimers.reduce((prev, e) => {
            // add this timer's runtime minus the accumulated sub-timers
            return (prev + e.end - e.start) - e.subTimers.reduce((prev, e) => {
                return prev + e.end - e.start;
            }, 0);
        }, 0);
    };

    this.getRuntime = function() {
        return finishedTimers.reduce((prev, e) => {
            return prev + (e.end - e.start);
        }, 0);
    };

    this.countInvocations = function() {
        return finishedTimers.length;
    };

    this.renderLine = function(prefixLength) {
        const runtime = this.getSelftime() / 1000000;
        const count = this.countInvocations();
        const formatter = new java.util.Formatter();
        formatter.format("%1$7.0f ms %2$5.0f ms %3$6.0f    %4$s",
            runtime, Math.round(runtime / count), count, name.slice(prefixLength));
        return formatter.toString();
    };

    return new org.mozilla.javascript.debug.DebugFrame(this);
};

/**
 * A class for measuring the frequency and runtime of function invocations.
 */
const Profiler = exports.Profiler = function() {
    const stack = [];
    const frames = {};

    /**
     * @param {Object} cx
     * @param {Function} script
     */
    this.getScriptFrame = function(cx, script) {
        if (!script.isFunction()) {
            return null;
        }
        const name = getScriptName(script);
        let frame = frames[name];
        if (!frame) {
            frame = new Frame(name, stack);
            frames[name] = frame;
        }
        return frame;
    };

    this.getFrames = function() {
        // sort list according to total runtime
        return Object.keys(frames)
            .map(key => frames[key])
            .sort((a, b) => b.getSelftime() - a.getSelftime());
    };

    /**
     * @param {Number} maxFrames optional maximal number of frames to include
     */
    this.formatResult = function(maxFrames) {
        const list = this.getFrames();
        // cut list to maxFrames elements
        if (typeof maxFrames == "number") {
            list.length = maxFrames;
        }
        // find common prefix in path names
        const commonPrefix = list.reduce((previous, current) => {
            return strings.getCommonPrefix(previous, current.name);
        }, "");
        var lines = [];
        let maxLength = 0;
        list.forEach(item => {
            const str = item.renderLine(commonPrefix.length);
            maxLength = Math.max(maxLength, str.length);
            lines.push(str);
        })
        const buffer = new Buffer();
        buffer.writeln("     total  average  calls    path");
        for (let i = 1; i < maxLength; i++) {
            buffer.write("-");
        }
        buffer.writeln();
        buffer.write(lines.join("\n"));
        return buffer.toString();
    };

    this.toString = function() {
        return this.formatResult(null);
    };

    var profiler = new org.ringojs.util.DebuggerBase(this);
    profiler.debuggerScript = module.id + ".js";
    return profiler;
}
