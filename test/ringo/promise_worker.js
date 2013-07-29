var log = require( 'ringo/logging' ).getLogger( module.id );
/**
 * The worker module needed by promise_test
 */
function onmessage(e) {

    var source = e.source;
    var result = e.data.result || { success: true };
    var delay = e.data.delay || 2000;

    var success = function() {
        log.info( 'Posting the result: ', JSON.stringify( result ) );
        source.postMessage( result );
    };

    setTimeout( success, delay );
}
