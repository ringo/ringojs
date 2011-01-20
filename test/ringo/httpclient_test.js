var assert = require("assert");
var {Client, request, post, get, put, del} = require('ringo/httpclient');
var {Server} = require('ringo/httpserver');
var {Request} = require('ringo/webapp/request');
var {Response} = require('ringo/webapp/response');

var server;
var host = "127.0.0.1";
var port = "8282";
var baseUri = "http://" + host + ":" + port + "/";

require('ringo/logging').setConfig(getResource('./httpclient_log4j.properties'));

/**
 * tests overwrite getResponse() to control the response they expect back
 */
var getResponse;

/**
 * setUp pre every test
 */
exports.setUp = function() {
    var handleRequest = function(env) {
        var req = new Request(env);
        req.charset = config.charset || 'utf8';
        req.pathInfo = decodeURI(req.pathInfo);
        return getResponse(req, env);
    };

    var config = {
       host: host,
       port: port
    };

    server = new Server(config);
    server.getDefaultContext().serveApplication(handleRequest);
    server.start();
    // test used to hang without this, but seems no longer the case
    // java.lang.Thread.currentThread().sleep(1000);
};

/**
 * tearDown after each test
 */
exports.tearDown = function() {
    server.stop();
    server.destroy();
    server = null;
};

/**
 * test that callbacks get called at all; all other
 * tests rely on that.
 */
exports.testCallbacksGetCalled = function() {
   getResponse = function(req) {
      return new Response('');
   };

   var successCalled, completeCalled, errorCalled;
   var exchange = request({
      url: baseUri,
      success: function() {
         successCalled = true;
      },
      complete: function() {
         completeCalled = true;
      },
      error: function() {
         errorCalled = true;
      }
   });
   assert.isTrue(successCalled);
   assert.isTrue(completeCalled);
   assert.isUndefined(errorCalled);
};

/**
 * test basic get
 */
exports.testBasic = function() {
   getResponse = function(req) {
      return new Response('<h1>This is the Response Text</h1>');
   };

   var errorCalled, myData;
   var exchange = request({
      url: baseUri,
      success: function(data, status, contentType, exchange) {
         myData = data;
      },
      error: function() {
         errorCalled = true;
      }
   });
   assert.isUndefined(errorCalled);
   assert.strictEqual(myData, '<h1>This is the Response Text</h1>');
};


/**
 * test servlet on request env (this is not httpclient specific, but uses same setUp tearDown)
 */
exports.testServlet = function() {
    
    var servlet;
    getResponse = function(req) {
        servlet = req.env.servlet;
        return new Response("servlet set");
    };

    var errorCalled, myData;
    var exchange = request({
        url: baseUri,
        success: function(data, status, contentType, exchange) {
            myData = data;
        },
        error: function() {
            errorCalled = true;
        }
    });
    assert.isUndefined(errorCalled);
    assert.strictEqual(myData, "servlet set");
    assert.ok(servlet instanceof javax.servlet.http.HttpServlet, "servlet instance");
};


/**
 * convinience wrappers
 */
exports.testConvenience = function() {
    getResponse = function(req) {
        if (req.params.foo) {
            return new Response (req.method + ' with param');
        }
        return new Response(req.method);
    };
    var x = post(baseUri);
    assert.strictEqual(200, x.status);
    assert.strictEqual('POST', x.content);

    x = post(baseUri, {foo: 'bar'});
    assert.strictEqual(200, x.status);
    assert.strictEqual('POST with param', x.content);

    x = get(baseUri, {foo: 'bar'});
    assert.strictEqual(200, x.status);
    assert.strictEqual('GET with param', x.content);

    x = del(baseUri);
    assert.strictEqual(200, x.status);
    assert.strictEqual('DELETE', x.content);

    x = put(baseUri);
    assert.strictEqual(200, x.status);
    assert.strictEqual('PUT', x.content);
};


/**
 * GET, POST params
 */
exports.testParams = function() {
    getResponse = function(req) {
        return new Response(JSON.stringify(req.params));
    };
    var data = {
        a: "fääßß",
        b: "fööööbääzz",
        c: "08083",
        d: "0x0004"
    };
    var getExchange = request({
        url: baseUri,
        method: 'GET',
        data: data
    });
    assert.strictEqual(200, getExchange.status);
    var receivedData = JSON.parse(getExchange.content);
    assert.deepEqual(data, receivedData);

    var postExchange = request({
        url: baseUri,
        method: 'POST',
        data: data
    });
    assert.strictEqual(200, postExchange.status);
    receivedData = JSON.parse(postExchange.content);
    assert.deepEqual(data, receivedData);
};

/**
 * Callbacks
 */
exports.testCallbacks = function() {
    getResponse = function(req) {
        if (req.pathInfo == '/notfound') {
            return Response.notFound('error');
        } else if (req.pathInfo == '/success') {
            var res = new Response('success');
            res.contentType = 'text/json';
            return res;
        } else if (req.pathInfo == '/redirect') {
            return {
                status: 302,
                headers: {Location: '/redirectlocation'},
                body: ["Found: " + '/redirectlocation']
            };
        } else if (req.pathInfo == '/redirectlocation') {
            return new Response('redirect success');
        }
    };
    var myStatus, successCalled, errorCalled, myMessage, myContentType, myData;
    // success shouldn't get called
    var getErrorExchange = request({
        url: baseUri + 'notfound',
        method: 'GET',
        complete: function(data, status, contentType, exchange) {
            myStatus = status;
        },
        success: function() {
            successCalled = true
        },
        error: function(message, status, exchange) {
            myMessage = message;
        }
    });
    assert.isUndefined(successCalled);
    assert.strictEqual(myStatus, 404);
    assert.strictEqual(getErrorExchange.status, 404);
    assert.strictEqual(myMessage, "Not Found");

    var getSuccessExchange = request({
        url: baseUri + 'success',
        method: 'GET',
        complete: function(data, status, contentType, exchange) {
            myStatus = status;
        },
        success: function(data, status, contentType, exchange) {
            myContentType = contentType;
        },
        error: function() {
            errorCalled = true;
        }
    });
    assert.strictEqual('text/json; charset=utf-8', myContentType);
    assert.strictEqual(200, myStatus);
    assert.isUndefined(errorCalled);

    var getRedirectExchange = request({
        url: baseUri + 'redirect',
        method: 'GET',
        complete: function(data, status, contentType, exchange) {
            myStatus = status;
            myData = data;
        },
        error: function(message) {
            errorCalled = true;
        }
    });
    assert.strictEqual(200, myStatus);
    assert.strictEqual('redirect success', myData);
    assert.isUndefined(errorCalled);
};

/**
 * Cookie set and read
 */
exports.testCookie = function() {
    var COOKIE_NAME = 'testcookie'
    var COOKIE_VALUE = 'cookie value with s p   a c es';

    getResponse = function(req) {
        // set cookie
        var res = new Response('cookie set');
        res.setCookie(COOKIE_NAME, req.params.cookievalue, 5);
        return res;
    };

    // receive cookie
    var myStatus, myExchange, errorCalled;
    request({
        url: baseUri,
        method: 'GET',
        data: {'cookievalue': COOKIE_VALUE},
        complete: function(data, status, contentType, exchange) {
            myStatus = status;
        },
        success: function(data, status, contentType, exchange) {
            myExchange = exchange;
        },
        error: function() {
            errorCalled = true;
        }
    });
    assert.isUndefined(errorCalled);
    assert.strictEqual(200, myStatus);
    assert.strictEqual(COOKIE_VALUE, myExchange.cookies[COOKIE_NAME].value);
};


/**
 * send stream and get the same stream back
 */
exports.testStreamRequest = function() {

    getResponse = function(req, env) {
        if (req.isPost) {
            var input;
            return {
                    status: 200,
                    headers: {
                        'Content-Type': 'image/png'
                    },
                    body: {
                        forEach: function(fn) {
                            var read, bufsize = 8192;
                            var buffer = new ByteArray(bufsize);
                            input = env.input;
                            while ((read = input.readInto(buffer)) > -1) {
                                buffer.length = read;
                                fn(buffer);
                                buffer.length = bufsize;
                            }
                        },
                        close: function() {
                            if (input) {
                                input.close();
                            }
                        }
                    }
                };

        }
    };

    var resource = getResource('./upload_test.png');
    var ByteArray = require('binary').ByteArray;
    var inputStream = resource.getInputStream();
    // small <1k file, just read it all in
    var size = resource.getLength();
    var inputByteArray = new ByteArray(size);
    inputStream.read(inputByteArray, 0, size);
    var sendInputStream = resource.getInputStream();
    var myExchange, myContentType, errorCalled;
    request({
        url: baseUri,
        method: 'POST',
        data: sendInputStream,
        error: function() {
            errorCalled = true;
        },
        complete: function(data, status, contentType, exchange) {
            myExchange = exchange;
            myContentType = contentType;
        }
    });
    assert.isUndefined(errorCalled);
    assert.isNotNull(myExchange);
    assert.strictEqual (inputByteArray.length, myExchange.contentBytes.length);
    assert.deepEqual (inputByteArray.toArray(), myExchange.contentBytes.toArray());
    assert.strictEqual('image/png', myContentType);
};

// start the test runner if we're called directly from command line
if (require.main == module.id) {
    system.exit(require("test").run(exports));
}
