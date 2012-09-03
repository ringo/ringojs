#JSGI

RingoJS implements [JSGI 0.3](http://wiki.commonjs.org/wiki/JSGI/Level0/A/Draft2),
a web server interface similar to Rack (Ruby) or WSGI (Python).

JSGI allows web servers to talk to JavaScript applications by mapping HTTP
requests to a function call that takes a request object as argument and returns
a response object. JSGI is a low level interface; it is expected that frameworks will be built on
top of it to ease common app building tasks.

## Application and Middleware

A JSGI Application is a JavaScript function which takes a single argument, the
Request object, and returns a Response object containing three required
properties: `status`, `headers` and `body`.

A simple "hello world" JSGI Application might look like this:

    exports.app = function (env) {
        return {
            status: 200,
            headers: {"Content-Type": "text/plain"},
            body: ["Hello World!"]
        };
    }

JSGI Middleware is a JSGI Application that can call other JSGI Applications.
Middleware can be stacked up into a call chain to provide useful services to
JSGI Applications such as authentication, decoding of requests, encoding or
compression of responses, or support for client side caching.

## The Request object

The Request object is a JavaScript object passed to a JSGI Application
representing a HTTP request.

It contains the following properties:

* `method`: The HTTP request method as an upper-case String, such as "GET" or "POST".

* `scriptName`: The initial portion of the request URL's "path" that
  corresponds to the Application object, so that the Application knows its
  virtual "location". This may be an empty string, if the Application
  corresponds to the "root" of the Server.

* `pathInfo`: The remainder of the request URL's "path", designating the virtual
  "location" of the Request's target within the Application. This may be an
  empty string, if the request URL targets the Application root and does not
  have a trailing slash.

* `queryString`: A string representing the part of the request URL that
follows the first '?'. If the request URL does not contain a query part, this
contains an empty string.

* `host`: A string representing the part of the request URL specifying the host.

* `port`: A number representing the port of the request.

* `scheme`: A string representing the URL scheme such as "http", "https", etc.

* `input`: An input stream representing the request body.

* `headers`: A JavaScript object represenging the client-supplied HTTP request
headers. All keys in the `headers` object are the lower-case equivalent of the
request's HTTP header keys.

* `env`: A JavaScript object that acts as a container for any additional
  Request properties added by JSGI Middleware or Applications.

* `jsgi`: A JavaScript object containing additional information about the JSGI
  environment.

    * `jsgi.version`: The Array [0,3], representing this version of JSGI.
    * `jsgi.errors`: Stream for Application errors, set to `system.stderr`.
    * `jsgi.multithread`: a boolean property to tell whether the Application
      runs in a multi-threaded environment. `true` in RingoJS.
    * `jsgi.multiprocess`: a boolean property to tell whether the Application
      runs in a multi-process environment. `false` in RingoJS.
    * `jsgi.runOnce`: a boolean property to tell whether the Application  will
      only be invoked this one time during the life of its containing process.
      `false` in RingoJS.
    * `jsgi.cgi`: CGI version Array in [major, minor] form if Server is
      implemented atop CGI. `false` in RingoJS.
    * `jsgi.async`: a boolean property specifying that the server supports
      asynchronous operation. `true` in RingoJS if running under Jetty and
      support for [Jetty Continuations](http://wiki.eclipse.org/Jetty/Feature/Continuations)
      is available.

## The Response object

The Response object is a JavaScript object returned by a JSGI Application
representing a HTTP response. The Response object must contain the following
properties:

* `status`: An integer defining the HTTP status code, such as `200` for "OK" or
  `404` for "Not Found".

* `headers`: A JavaScript objects containing key/value pairs of Strings or Arrays.
  If a header value is an Array, Ringo will output multiple headers for each
  value in the Array.

* `body`: A JavaScript object with a `forEach` method which must return objects
  which have a `toByteString` method. Note that this is true for Strings and
  Binary objects such as `ByteString` and `ByteArray`.


## Asynchronous JSGI

By its nature JSGI is a synchronous interface, meaning that the request is
processed on the calling thread. RingoJS provides an extension to JSGI to
support asynchronous request handling, meaning the processing of the request
can be uncoupled from the calling thread.

*TODO*
