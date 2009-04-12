include('helma/googlestore');

export('Book', 'Author');

var __shared__ = true;

/**
 * Book class
 * @param properties object containing persistent properties
 */
var Book = Storable('Book');

Book.prototype.getFullTitle = function() {
    return this.author.name + ": " + this.title;
};

/**
 * Author class
 * @param properties object containing persistent properties
 */
exports.Author = Storable('Author');

