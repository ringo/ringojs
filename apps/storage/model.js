// use google datastore if it is available, else fall back to filestore
try {
    store = require('helma/storage/googlestore');
} catch (error) {
    print(error);
    include('helma/storage/filestore');
    store = new Store();
}

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

