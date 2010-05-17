// Use datastore implementation defined in config module
var store = require('./config').store;

export('Book', 'Author');

/**
 * Book class
 * @param properties object containing persistent properties
 */
var Book = store.defineEntity('Book');

Book.prototype.getFullTitle = function() {
    return this.author.name + ": " + this.title;
};

/**
 * Author class
 * @param properties object containing persistent properties
 */
var Author = store.defineEntity('Author');

