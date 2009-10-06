var engine = require('helma/engine');
var Profiler = require('helma/profiler').Profiler;
var Buffer = require('helma/buffer').Buffer;
var log = require('helma/logging').getLogger(module.id);

// limit frames shown in the profiler
var maxFrames = 30;

/**
 * Register a request listener that automatically sets rhino optimization
 * level to -1 and adds a profiler.
 */
exports.middleware = function(app) {
    return function(env) {
        if (engine.getOptimizationLevel() > -1) {
            engine.setOptimizationLevel(-1);
            throw {retry: true};
        }
        var profiler = new Profiler();
        engine.getRhinoContext().setDebugger(profiler, null);

        // get the response passing the request on to the middleware chain
        var res = app(env);

        var result = profiler.getResult(maxFrames);
        var buffer = new Buffer();
        buffer.writeln();
        buffer.writeln("     total  average  calls    path");
        for (var i = 1; i < result.maxLength; i++) {
            // b.write("—");
            buffer.write("-");
        }
        buffer.writeln();
        buffer.writeln(result.data);
        log.info(buffer.toString());

        return res;
    }
}
