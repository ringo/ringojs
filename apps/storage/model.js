import('helma.filestore', 'filestore');

export('Book', 'Author');

var __shared__ = true;

/**
 * Book class
 * @param properties object containing persistent properties
 */
function Book(properties) {
    this.properties = properties || {};

    this.getFullTitle = function() {
        return this.author.name + ": " + this.title;
    };

    return this;
}

/**
 * Author class
 * @param properties object containing persistent properties
 */
function Author(properties) {
    this.properties = properties || {};
    return this;
}


// init store instance and register persistent classes.
var store = new filestore.Store("db");

/*
 The call to registerType installs getters and setters for the
 persistent data fields in the constructor's prototype property. 

 It also adds the following static methods in the constructor:

   Book.get(id)  - get a persistent object of this type by id
   Book.all()    - get an array containing all objects of this type
   Book.list()   - get filtered, ordered and sliced lists of this type

 The following instance fields and methods are isntalled in
 the constructor's prototype property:

   Book.prototype._type     - the type name as String (e.g. "Book")
   Book.prototype.save()    - save this instance in the database
   Book.prototype.remove()  - remove this instance from the database
   Book.prototype.getKey()  - get a key to refer to this persistent instance

*/
store.registerType(Book, {
    title: filestore.Text(),
    author: filestore.Reference(Author)
});

store.registerType(Author, {
    name: filestore.Text(),
    books: filestore.List(Book, {
        filter: function(obj) this.equals(obj.properties.author),
        orderBy: "title",
        order: "asc"
    })
});
