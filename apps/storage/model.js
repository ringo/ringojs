// simple demo model for helma minibase
var db = loadModule('helma.filestore');

/**
 * Our model class. The only thing to observe is to return a Storable
 * instance, passing this object and an object containing the persistent
 * properties to the Storable constructor.
 * 
 * @param properties persistent properties container
 */
function Book(props) {

    // Define any instance methods you like, accessing persistent
    // properties using the this prefix.
    this.getFullTitle = function() {
        return this.author.name + ": " + this.title;
    }

    /*
      The Storable wrapper handles property access and adds
      the following instance methods and properties:

        book.save()   - save the instance in the associated store
        book.remove() - remove the instance in the associated store
        book._type    - the object type name - readonly
        book._id      - the object id - undefined for transient objects,
                        and only settable on transient objects
     */
    db.makeStorable(this, props);
    return this;
}

function Author(props) {
    db.makeStorable(this, props);
    return this;
}

// init store instance and register persistent classes.
db.store = db.store || new db.Store("db");

/*
 The call to registerType installs the following static
 methods in the constructor:

   Book.get(id)  - get a persistent object of this type by id
   Book.all()    - get an array containing all objects of this type
   Book.list()   - get filtered, ordered and sliced lists of this type
*/
db.store.registerType(Book);
db.store.registerType(Author);
