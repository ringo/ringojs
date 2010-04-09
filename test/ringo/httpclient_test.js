include('ringo/unittest');
var {Client, request, post, get} = require('ringo/httpclient');
var Server = require('ringo/httpserver').Server;

var server;

/**
 * tests overwrite getResponse() to control the response they expect back
 */
var getResponse = function(req) {
   return new Response("<h1> This is a basic Response</h1>");
}

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
       'host': '127.0.0.1',
       'port': 8080,
    };

    server = new Server(config);
    server.addApplication("/", '', handleRequest);
    server.start();
    return;
};

/**
 * tearDown after each test
 */
exports.tearDown = function() {
    server.stop();
    server.destroy();
    return;
};

/**
 * test basic get
 */
exports.testBasic = function() {
   getResponse = function(req) {
      return new Response('<h1>This is the Response Text</h1>');
   }

   var exchange = request({
      'url': 'http://127.0.0.1:8080/',
      'success': function(data, status, contentType, exchange) {
         assertEqual(data, '<h1>This is the Response Text</h1>');
      },
      'error': function(data) {
         assertEqual(true, false);
      },
   });
   return;
};

/**
 * convinience wrappers
 */
exports.testConvenience = function() {
    getResponse = function(req) {
        if (req.isPost) {
            return new Response('post');
        } else if (req.isGet) {
            if (req.params.foo) {
                return new Response ('get with param');
            }
            return new Response('get');
        }
    }
    
    post('http://127.0.0.1:8080/', function(data, status) {
        assertEqual(200, status);
        assertEqual('post', data);
    });
    
    get('http://127.0.0.1:8080/', {'foo': 'bar'}, function(data, status) {
        assertEqual(200, status);
        assertEqual('get with param', data);
    });
    
    get('http://127.0.0.1:8080/', function(data, status) {
            assertEqual(200, status);
            assertEqual('get', data);
        }, function() {
            assertTrue(false);
        }
    );
    
    
    
};


/**
 * GET, POST params
 */
exports.testParams = function() {
    getResponse = function(req) {
        return new Response(JSON.stringify(req.params));
    }
    var data = {
        "a": "fääßß",
        "b": "fööööbääzz",
        "c": "08083",
        "d": "0x0004"
    };
    var getExchange = request({
        'url': 'http://127.0.0.1:8080/',
        'method': 'GET',
        'data': data,
        'success': function(content) {
             var receivedData = JSON.parse(content);
             assertEqual(data, receivedData);
        },
        'error': function(content) {
            assertTrue(false);
        }
    });
    var postExchange = request({
        'url': 'http://127.0.0.1:8080/',
        'method': 'POST',
        'data': data,
        'success': function(content) {
             var receivedData = JSON.parse(content);
             assertEqual(data, receivedData);
        },
        'error': function(exception, exchange) {
            assertEqual(Exception, exception);
        }
    });
}

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
    }
   // success shouldn't get called
    var getErrorExchange = request({
        'url': 'http://127.0.0.1:8080/notfound',
        'method': 'GET',
        'complete': function(data, status, contentType, exchange) {
            assertEqual(status, 404);
            return;
        },
        'success': function() {
            // should not get called
            assertTrue(false);
        },
        'error': function(exception, exchange) {
            assertEqual(exception, null);
            assertEqual(exchange.status, 404);
        }
    });

    var getSuccessExchange  = request({
        'url': 'http://127.0.0.1:8080/success',
        'method': 'GET',
        'complete': function(data, status, contentType, exchange) {
            assertEqual('text/json; charset=utf-8', contentType);
            assertEqual(200, status);
            return;
        },
        'success': function(data, status, contentType, exchange) {
            assertEqual('text/json; charset=utf-8', contentType);
            assertEqual(200, status);
        },
        
        'error': function() {
            assertTrue(false);
        }
    });
    var getRedirectExchange = request({
        'url': 'http://127.0.0.1:8080/redirect',
        'method': 'GET',
        'complete': function(data, status, contentType, exchange) {
             assertEqual(303, status);
        },
        'error': function(ex) {
            assertTrue(false);
        },
    });
};

/**
 * Streaming Response
 */
exports._testStreamResponse = function() {
    getResponse = function(req){
        include('ringo/scheduler');
        // Sends a message once a second 10 times
        var progress, finished;
        var i = 0;
        var intervalId = setInterval(function(){
           i++;
           progress({
              status: 200,
              headers:{'Content-Type': 'text/json'},
              body: ["msg"+i]
           });
           if(i == 5){
              clearInterval(intervalId);
              finished({})
           }
        }, 1000);
        var promise = {
            then: function(onFinish, onError, onProgress){
                finished = onFinish;
                progress = onProgress;
            }
        };
        return promise;
    };
   
    var j = 0; 
    var getStreamExchange = request({
        'url': 'http://127.0.0.1:8080/',
        'timeout': 10000,
        'method': 'GET',
        'part': function(data, status, contentType, exchange) {
            j++;
            assertEqual("msg"+j, data);
            assertEqual(200, status);
            return;
        },
        'error': function(exception) {
            assertTrue(false);
        }
    });   
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
    }

    // recieve cookie
    request({
        'url': 'http://127.0.0.1:8080/',
        'method': 'GET',
        'data': {'cookievalue': COOKIE_VALUE},
        'complete': function(data, status, contentType, exchange) {
            assertEqual(200, status);
        },
        'success': function(data, status, contentType, exchange) {
            assertEqual(COOKIE_VALUE, exchange.cookies[COOKIE_NAME].value);
        },
        'error': function() {
            assertTrue(false);
        }
    });

    return;
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
                        'Content-Type': 'image/png',
                    },
                    body: {
                        forEach: function(fn) {
                            var read, bufsize = 8192;
                            var buffer = new ByteArray(bufsize);
                            input = env["jsgi.input"];
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
    }

    include('io');
    var resource = getResource('./upload_test.png');
    var inputStream = resource.getInputStream();
    // small <1k file, just read it all in
    var size = inputStream.available();
    var inputByteArray = new ByteArray(size);
    inputStream.read(inputByteArray, 0, size);
    var sendInputStream = resource.getInputStream()
    var streamSender = request({
        'url': 'http://127.0.0.1:8080/',
        'method': 'POST',
        'data': sendInputStream,
        'error': function() {
            assertFalse(true);
        },
        'complete': function(data, status, contentType, exchange) {
            assertEqual (inputByteArray.unwrap(), exchange.contentBytes);
            assertEqual('image/png', contentType);
        }
    });
};

/*
--- high volume, hight latency
exports.testTwitter = function() {
    var getTwitterStream = client.req({
        'url': 'http://stream.twitter.com/1/statuses/sample.json',
        'async': true,
        'timeout': 1000,
        'username': 'oberhamsi',
        'password': 'XXXXXXX',
        'error': function(ex) {
            print ('error ' + ex);
        },
        'part': function(data) {
            print ('part ' + data)
        },
    });
}
*/
