// use google datastore if it is available, else fall back to filestore
var store = require('./config').store;

export('Book', 'Author');

var __shared__ = true;

/**
 * Book class
 * @param properties object containing persistent properties
 */
var Book = store.defineClass('Book');

Book.prototype.getFullTitle = function() {
    return this.author.name + ": " + this.title;
};

/**
 * Author class
 * @param properties object containing persistent properties
 */
var Author = store.defineClass('Author');

