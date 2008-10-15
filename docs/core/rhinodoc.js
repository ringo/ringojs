var doc = {
  "MacroTag": {
    "methods": {
      "getParameter": {
        "body": "Get a named or unnamed parameter from the macro tag. This method takes a variable number of string or integer arguments. It evaluates the arguments as parameter names or parameter indices until a parameter is found and returns it. If the arguments don't match a parameter, the method returns null.", 
        "description": "Get a named or unnamed parameter from the macro tag.", 
        "name": "getParameter", 
        "params": [
          {
            "description": "one or more parameter names or indices. ", 
            "name": "nameOrIndex", 
            "type": "StringOrInteger"
            }
          ], 
        "type": "method"
        }
      }, 
    "body": "A macro tag. Basically a list of unnamed parameters and a map of named parameters.", 
    "description": "A macro tag.", 
    "name": "MacroTag", 
    "properties": {
      "parameterNames": {
        "body": "A Javascript array containing all parameter names in this macro tag.", 
        "description": "A Javascript array containing all parameter names in this macro tag.", 
        "name": "parameterNames", 
        "type": "property"
        }, 
      "startLine": {
        "body": "Get the number of the line where this macro tag starts.", 
        "description": "Get the number of the line where this macro tag starts.", 
        "name": "startLine", 
        "type": "property"
        }, 
      "name": {
        "body": "The name of the macro tag.", 
        "description": "The name of the macro tag.", 
        "name": "name", 
        "type": "property"
        }, 
      "parameters": {
        "body": "A Javascript array containing all unnamed parameters in this macro tag, in the order in which they appear in the tag.", 
        "description": "A Javascript array containing all unnamed parameters in this macro tag, in the order in which they appear in the tag.", 
        "name": "parameters", 
        "type": "property"
        }, 
      "filter": {
        "body": "The next macro tag in the filter chain, or undefined if the macro tag does not contain a filter chain. The filter chain is defined by the pipe character '|' within within macro tags.", 
        "description": "The next macro tag in the filter chain, or undefined if the macro tag does not contain a filter chain.", 
        "name": "filter", 
        "type": "property"
        }
      }, 
    "type": "class"
    }, 
  "Session": {
    "methods": {
      "isNew": {
        "body": "true if the client does not yet know about the session or if the client chooses not to join the session.", 
        "description": "true if the client does not yet know about the session or if the client chooses not to join the session.", 
        "name": "isNew", 
        "params": [
          
          ], 
        "type": "method"
        }, 
      "invalidate": {
        "body": "Invalidates the current user session.", 
        "description": "Invalidates the current user session.", 
        "name": "invalidate", 
        "params": [
          
          ], 
        "type": "method"
        }
      }, 
    "body": "This class represents a HTTP session instance. The implementation is compatible to the Helma 1.* session object, but based on top of the Servlet container's session support.", 
    "description": "This class represents a HTTP session instance.", 
    "name": "Session", 
    "properties": {
      "id": {
        "body": "The id of the current user session.", 
        "description": "The id of the current user session.", 
        "name": "id", 
        "type": "property"
        }, 
      "data": {
        "body": "A generic JavaScript object associated with the current session.", 
        "description": "A generic JavaScript object associated with the current session.", 
        "name": "data", 
        "type": "property"
        }
      }, 
    "type": "class"
    }, 
  "Response": {
    "methods": {
      "writeln": {
        "body": "Convert the arguments to strings and write them to the HTTP response, followed by a newline sequence. This method takes a variable number of arguments and works exactly as write(), except for the trailing newline.", 
        "description": "Convert the arguments to strings and write them to the HTTP response, followed by a newline sequence.", 
        "name": "writeln", 
        "params": [
          {
            "description": "one ore more objects to write to the response buffer ", 
            "name": "arg", 
            "type": "Object"
            }
          ], 
        "type": "method"
        }, 
      "flush": {
        "body": "", 
        "description": "", 
        "name": "flush", 
        "params": [
          
          ], 
        "type": "method"
        }, 
      "setCookie": {
        "body": "Set a HTTP cookie with the given name and value. This function takes at least two arguments, a cookie name and a cookie value. Optionally, the third argument specifies the number of days the cookie is to be stored by the client. The cookie path and domain may be specified as fourth and fifth argument, respectively. \r\n\r\nA negative days value means the cookie should be used only during the current user session and discarded afterwards. A days value of 0 means the cookie should be immediately discarded by the client and can therefore be used to delete a cookie.", 
        "description": "Set a HTTP cookie with the given name and value.", 
        "name": "setCookie", 
        "params": [
          {
            "description": "the cookie name ", 
            "name": "name", 
            "type": "String"
            }, 
          {
            "description": " the cookie value ", 
            "name": "value", 
            "type": "String"
            }, 
          {
            "description": "number of days the cookie should be stored ", 
            "name": "days", 
            "type": "Integer"
            }, 
          {
            "description": "the URL path to apply the cookie to ", 
            "name": "path", 
            "type": "String"
            }, 
          {
            "description": "the domain to apply the cookie to ", 
            "name": "domain", 
            "type": "String"
            }
          ], 
        "type": "method"
        }, 
      "write": {
        "body": "Convert the arguments to strings and write them to the HTTP response. This method takes a variable number of arguments. This is similar to *writeln()*, but does not append a newline sequence to the output.", 
        "description": "Convert the arguments to strings and write them to the HTTP response.", 
        "name": "write", 
        "params": [
          {
            "description": "one ore more objects to write to the response buffer ", 
            "name": "arg", 
            "type": "Object"
            }
          ], 
        "type": "method"
        }, 
      "reset": {
        "body": "", 
        "description": "", 
        "name": "reset", 
        "params": [
          
          ], 
        "type": "method"
        }, 
      "redirect": {
        "body": "Redirect the current request to another URL. Calling this method causes the current request to terminate immediately by throwing an Error. Care should be taken to clean up any resources before doing a redirect.", 
        "description": "Redirect the current request to another URL.", 
        "name": "redirect", 
        "params": [
          {
            "description": "the target URL", 
            "name": "target", 
            "type": "String"
            }
          ], 
        "type": "method"
        }, 
      "resetBuffer": {
        "body": "", 
        "description": "", 
        "name": "resetBuffer", 
        "params": [
          
          ], 
        "type": "method"
        }
      }, 
    "body": "This class represents a HTTP Response. The current Response object can be accessed as global variable res.", 
    "description": "This class represents a HTTP Response.", 
    "name": "Response", 
    "properties": {
      "bufferSize": {
        "body": "", 
        "description": "", 
        "name": "bufferSize", 
        "type": "property"
        }, 
      "servletResponse": {
        "body": "Get the servlet request as a wrapped java object", 
        "description": "Get the servlet request as a wrapped java object", 
        "name": "servletResponse", 
        "type": "property"
        }, 
      "status": {
        "body": "Set the HTTP status code of the response.", 
        "description": "Set the HTTP status code of the response.", 
        "name": "status", 
        "type": "property"
        }, 
      "encoding": {
        "body": "", 
        "description": "", 
        "name": "encoding", 
        "type": "property"
        }, 
      "contentType": {
        "body": "Property to set\/get the Content-Type header of the current HTTP response. \r\n\r\n  res.contentType = \"text\/html\";", 
        "description": "Property to set\/get the Content-Type header of the current HTTP response.", 
        "name": "contentType", 
        "type": "property"
        }
      }, 
    "type": "class"
    }, 
  "Request": {
    "methods": {
      "getParameters": {
        "body": "Returns an array of Strings containing all of the values the given request parameter has, or null if the parameter does not exist.", 
        "description": "Returns an array of Strings containing all of the values the given request parameter has, or null if the parameter does not exist.", 
        "name": "getParameters", 
        "params": [
          {
            "description": "the parameter name", 
            "name": "name", 
            "type": "String"
            }
          ], 
        "type": "method"
        }, 
      "getDateHeader": {
        "body": "Returns the value of the specified request header as Date object.", 
        "description": "Returns the value of the specified request header as Date object.", 
        "name": "getDateHeader", 
        "params": [
          {
            "description": "the header name", 
            "name": "name", 
            "type": "String"
            }
          ], 
        "type": "method"
        }, 
      "getParameter": {
        "body": "Returns the value of a request parameter as a String, or null if the parameter does not exist. You should only use this method when you are sure the parameter has only one value. If the parameter might have more than one value, use *getParameters(String)*. \r\n\r\nRequest parameters are extra information sent with the request either in the query string or posted form data.", 
        "description": "Returns the value of a request parameter as a String, or null if the parameter does not exist.", 
        "name": "getParameter", 
        "params": [
          {
            "description": "the parameter name", 
            "name": "name", 
            "type": "String"
            }
          ], 
        "type": "method"
        }, 
      "getCookies": {
        "body": "Returns a JavaScript array containing the request's cookies as *servlet cookie|http:\/\/java.sun.com\/products\/servlet\/2.5\/docs\/servlet-2_5-mr2\/javax\/servlet\/http\/Cookie.html* instances. This method should be used if there are multiple cookies with the same name, or if access to other cookie properties beyond its name and value are required. Otherwise, it is more convenient to use the *req.cookies|cookies* object.", 
        "description": "Returns a JavaScript array containing the request's cookies as *servlet cookie|http:\/\/java.", 
        "name": "getCookies", 
        "params": [
          
          ], 
        "type": "method"
        }, 
      "getHeaders": {
        "body": "Returns the value of the specified request header as JavaScript array of Strings.", 
        "description": "Returns the value of the specified request header as JavaScript array of Strings.", 
        "name": "getHeaders", 
        "params": [
          {
            "description": "the header name", 
            "name": "name", 
            "type": "String"
            }
          ], 
        "type": "method"
        }, 
      "getIntHeader": {
        "body": "Returns the value of the specified request header as integer number.", 
        "description": "Returns the value of the specified request header as integer number.", 
        "name": "getIntHeader", 
        "params": [
          {
            "description": "the header name", 
            "name": "name", 
            "type": "String"
            }
          ], 
        "type": "method"
        }, 
      "getHeader": {
        "body": "Returns the value of the specified request header as String.", 
        "description": "Returns the value of the specified request header as String.", 
        "name": "getHeader", 
        "params": [
          {
            "description": "the header name", 
            "name": "name", 
            "type": "String"
            }
          ], 
        "type": "method"
        }
      }, 
    "body": "This class represents a HTTP Request. The current Request object can be accessed as global variable req.", 
    "description": "This class represents a HTTP Request.", 
    "name": "Request", 
    "properties": {
      "port": {
        "body": "The port number on which this request was received.", 
        "description": "The port number on which this request was received.", 
        "name": "port", 
        "type": "property"
        }, 
      "headers": {
        "body": "A JavaScript object reflecting the headers of this request.", 
        "description": "A JavaScript object reflecting the headers of this request.", 
        "name": "headers", 
        "type": "property"
        }, 
      "protocol": {
        "body": "The name and version of the protocol the request uses in the form protocol\/majorVersion.minorVersion, for example, HTTP\/1.1.", 
        "description": "The name and version of the protocol the request uses in the form protocol\/majorVersion.", 
        "name": "protocol", 
        "type": "property"
        }, 
      "host": {
        "body": "The host name of the server that received the request.", 
        "description": "The host name of the server that received the request.", 
        "name": "host", 
        "type": "property"
        }, 
      "data": {
        "body": "A JavaScript object reflecting the HTTP parameters of this request. \r\n\r\nNote that both property names and values are always Strings. If there are multiple values for any parameter, all values but the first are discarded. You should only use this object when you are sure the parameter has only one value. If the parameter might have more than one value, use *getParameters(String)*. \r\n\r\nRequest parameters are extra information sent with the request either in the query string or posted form data.", 
        "description": "A JavaScript object reflecting the HTTP parameters of this request.", 
        "name": "data", 
        "type": "property"
        }, 
      "servletRequest": {
        "body": "Get the servlet request as a wrapped java object", 
        "description": "Get the servlet request as a wrapped java object", 
        "name": "servletRequest", 
        "type": "property"
        }, 
      "params": {
        "body": "A JavaScript object reflecting the HTTP parameters of this request. \r\n\r\nNote that both property names and values are always Strings. If there are multiple values for any parameter, all values but the first are discarded. You should only use this object when you are sure the parameter has only one value. If the parameter might have more than one value, use *getParameters(String)*. \r\n\r\nRequest parameters are extra information sent with the request either in the query string or posted form data.", 
        "description": "A JavaScript object reflecting the HTTP parameters of this request.", 
        "name": "params", 
        "type": "property"
        }, 
      "queryString": {
        "body": "The request's unparsed query string, or null if the request contains no query string.", 
        "description": "The request's unparsed query string, or null if the request contains no query string.", 
        "name": "queryString", 
        "type": "property"
        }, 
      "scheme": {
        "body": "The name of the scheme used to make this request, for example, http, https, or ftp.", 
        "description": "The name of the scheme used to make this request, for example, http, https, or ftp.", 
        "name": "scheme", 
        "type": "property"
        }, 
      "session": {
        "body": "Get the session object for this request, creating it if it doesn't exist", 
        "description": "Get the session object for this request, creating it if it doesn't exist", 
        "name": "session", 
        "type": "property"
        }, 
      "path": {
        "body": "The request's URI path, as passed in the first line of the HTTP request.", 
        "description": "The request's URI path, as passed in the first line of the HTTP request.", 
        "name": "path", 
        "type": "property"
        }, 
      "method": {
        "body": "Returns the name of the HTTP method with which this request was made, for example, GET, POST, or PUT.", 
        "description": "Returns the name of the HTTP method with which this request was made, for example, GET, POST, or PUT.", 
        "name": "method", 
        "type": "property"
        }, 
      "pathTranslated": {
        "body": "Returns any extra path information after the servlet name but before the query string, and translates it to a real path. Same as the value of the CGI variable PATH_TRANSLATED. If the URL does not have any extra path information, this method returns null.", 
        "description": "Returns any extra path information after the servlet name but before the query string, and translates it to a real path.", 
        "name": "pathTranslated", 
        "type": "property"
        }, 
      "cookies": {
        "body": "A JavaScript object reflecting the request's HTTP cookies. The object contains the cookie names as property names and the cookie values as property values. To access other cookie properties such as max-age, domain, or cookie path, and to access multiple cookies with the same name, use *req.getCookies()|getCookies()*, which returns a JavaScript arrays containing the raw *cookie objects|http:\/\/java.sun.com\/products\/servlet\/2.5\/docs\/servlet-2_5-mr2\/javax\/servlet\/http\/Cookie.html*.", 
        "description": "A JavaScript object reflecting the request's HTTP cookies.", 
        "name": "cookies", 
        "type": "property"
        }, 
      "pathInfo": {
        "body": "Returns any extra path information associated with the URL the client sent when it made this request. The extra path information follows the servlet path but precedes the query string. This method returns null if there was no extra path information.", 
        "description": "Returns any extra path information associated with the URL the client sent when it made this request.", 
        "name": "pathInfo", 
        "type": "property"
        }
      }, 
    "type": "class"
    }
  };