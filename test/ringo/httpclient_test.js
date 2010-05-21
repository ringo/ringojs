include('ringo/unittest');
var {Client, request, post, get, put, del} = require('ringo/httpclient');
var Server = require('ringo/httpserver').Server;

var server;
var host = "127.0.0.1";
var port = "8282";
var baseUri = "http://" + host + ":" + port + "/";

/**
 * tests overwrite getResponse() to control the response they expect back
 */
var getResponse = function(req) {
   return new Response("<h1> This is a basic Response</h1>");
};

/**
 * setUp pre every test
 */
exports.setUp = function() {
    var handleRequest = function(env) {
        include('ringo/webapp/request');
        include('ringo/webapp/response');
        var req = new Request(env);
        req.charset = config.charset || 'utf8';
        req.pathInfo = decodeURI(req.pathInfo);
        var res = getResponse(req, env);
        if (res instanceof Response) {
           return res.close();
        }
        return res;
    };
   
    var config = {
       host: host,
       port: port
    };

    server = new Server(config);
    server.getDefaultContext().serveApplication(handleRequest);
    server.start();
    // FIXME without this the test may hang in some configurations
    java.lang.Thread.currentThread().sleep(1000);
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
   assertTrue(successCalled);
   assertTrue(completeCalled);
   assertUndefined(errorCalled);
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
   assertUndefined(errorCalled);
   assertEqual(myData, '<h1>This is the Response Text</h1>');
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
    var myStatus, myData;
    var callback = function(data, status) {
        myData = data;
        myStatus = status;
    };
    post(baseUri, callback);
    assertEqual(200, myStatus);
    assertEqual('POST', myData);

    post(baseUri, {foo: 'bar'}, callback);
    assertEqual(200, myStatus);
    assertEqual('POST with param', myData);

    get(baseUri, {foo: 'bar'}, callback);
    assertEqual(200, myStatus);
    assertEqual('GET with param', myData);

    del(baseUri, callback);
    assertEqual(200, myStatus);
    assertEqual('DELETE', myData);

    put(baseUri, callback);
    assertEqual(200, myStatus);
    assertEqual('PUT', myData);
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
    assertEqual(200, getExchange.status);
    var receivedData = JSON.parse(getExchange.content);
    assertEqual(data, receivedData);

    var postExchange = request({
        url: baseUri,
        method: 'POST',
        data: data
    });
    assertEqual(200, postExchange.status);
    receivedData = JSON.parse(postExchange.content);
    assertEqual(data, receivedData);
};

/**
 * Callbacks
 */
exports.testCallbacks = function() {
    getResponse = function(req) {
        if (req.pathInfo == '/notfound') {
            return notFoundResponse('error');
        } else if (req.pathInfo == '/success') {
            var res = new Response('success');
            res.contentType = 'text/json';
            return res;
        } else if (req.pathInfo == '/redirect') {
            return redirectResponse('/redirectlocation');
        } else if (req.pathInfo == '/redirectlocation') {
            return new Response('redirect success');
        }
    };
    var myStatus, successCalled, errorCalled, myMessage, myContentType;
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
    assertUndefined(successCalled);
    assertEqual(myStatus, 404);
    assertEqual(getErrorExchange.status, 404);
    assertEqual(myMessage, "Not Found");

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
    assertEqual('text/json; charset=utf-8', myContentType);
    assertEqual(200, myStatus);
    assertUndefined(errorCalled);

    var getRedirectExchange = request({
        url: baseUri + 'redirect',
        method: 'GET',
        complete: function(data, status, contentType, exchange) {
            myStatus = status;
        },
        error: function(message) {
            errorCalled = true;
        }
    });
    assertEqual(303, myStatus);
    assertUndefined(errorCalled);
};

/**
 * Cookie set and read
 */
exports.testCookie = function() {
    var COOKIE_NAME = 'testcookie'
    var COOKIE_VALUE = 'cookie value with s p   a c es';
    
    getResponse = function(req) {

        var res = new Response('cookie set');
        res.setCookie(COOKIE_NAME, req.params.cookievalue, 5);
        // set cookie
        return res;
    };

    // recieve cookie
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
    assertUndefined(errorCalled);
    assertEqual(200, myStatus);
    assertEqual(COOKIE_VALUE, myExchange.cookies[COOKIE_NAME].value);
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
    assertUndefined(errorCalled);
    assertNotNull(myExchange);
    assertEqual (inputByteArray.length, myExchange.contentBytes.length);
    assertEqual (inputByteArray.toArray(), myExchange.contentBytes.toArray());
    assertEqual('image/png', myContentType);
};
