var engine = require('ringo/engine');
var Profiler = require('ringo/profiler').Profiler;
var Buffer = require('ringo/buffer').Buffer;
var log = require('ringo/logging').getLogger(module.id);

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
        profiler.attach();

        // get the response passing the request on to the middleware chain
        try {
            return app(env);
        } finally {
            log.info(profiler.getFormattedResult(maxFrames));
        }
    }
}
