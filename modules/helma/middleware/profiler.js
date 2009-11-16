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
