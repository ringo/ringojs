const response = require('ringo/jsgi/response');

// Just a simple JSGI response
exports.app = (request) => {
   return response.html('Welcome to Ringo on App Engine!');
};
