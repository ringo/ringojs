// use google datastore if it is available, else fall back to filestore
try {
    include('helma/storage/googlestore');
} catch (error) {
    print(error);
    include('helma/storage/filestore');
}

export('Book', 'Author');

var __shared__ = true;

/**
 * Book class
 * @param properties object containing persistent properties
 */
var Book = defineClass('Book');

Book.prototype.getFullTitle = function() {
    return this.author.name + ": " + this.title;
};

/**
 * Author class
 * @param properties object containing persistent properties
 */
var Author = defineClass('Author');

