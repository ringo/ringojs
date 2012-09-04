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

    exports.app = function (request) {
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

By its nature JSGI is a synchronous interface. The request is processed on the
calling thread, meaning that the thread is blocked for whatever time it takes
to return from the function call.

RingoJS provides two extensions to JSGI to uncouple an HTTP request
from the calling thread and process it asynchronously, one based on Promises
and the other using an AsyncResponse helper object.

It's important to note that asynchronous processing is currently only
available when running with Jetty (which is bundled with RingoJS). The Java
Servlet API up to version 3.0 did not support asynchronous operation. RingoJS
does not yet support asynchronous Servlet 3.0 API.

You can check the availability of asynchronous operation using the `jsgi.async`
flag in the JSGI Request object.

### Promise based Asynchronous JSGI

To generate a Promise-based asynchronous simply return a promise instead of
an ordinary JSGI Response object. A promise in RingoJS is any object with a
method named `then` that accepts two callbacks, one to be called if the
promise resolves successfully and the other to be called in case of an error.

If the promise resolves successfully it is expected to invoke the callback
passing a valid JSGI Response object as argument containing `status`, `headers`,
and `body` properties as described above. If the promise fails it is expected
to call the error callback with the cause of the error, which can be a string
or an error object.

You can use package [ringo/promise](http://ringojs.org/api/master/ringo/promise/)
or create your own duck-type Promise object with a `then` method accepting the
callbacks.

Promise based asynchronous JSGI is a good choice if you want to detach request
processing from the calling thread (possibly because it will take some time to
finish) but the response is reasonably small and can be delivered in one step.

### AsyncResponse Helper

Another possibility to create an asynchronous response in RingoJS is to return a
[AsyncResponse](http://ringojs.org/api/master/ringo/jsgi/connector/#AsyncResponse)
object from your JSGI application. This will detach request processing from the
current thread just like returning a Promise, but instead of having to resolve
the request in one step you can use the `start`, `write`, `flush`, and `close`
methods in the `AsyncResponse` object to process.

The AsyncResponse is the way to go when you deal with large responses that are
possibly generated in multiple, unconnected steps.
