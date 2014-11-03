var response = require('ringo/jsgi/response');

// Just a simple JSGI response
exports.app = function(request) {
   return response.html('Welcome to Ringo on App Engine!');
};