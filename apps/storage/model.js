// simple demo model for helma minibase
importModule('helma.storage', 'db');

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
        return this.author + ": " + this.title;
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
    return new db.Storable(this, props);
}

function Author(props) {
    return new db.Storable(this, props);
}

// init store instance and register persistent classes.
db.store = db.store || new db.Store("db");
/*
 The call to registerType installs the following static
 methods in the constructor:

   Book.get(id)  - get a persistent object of this type by id
   Book.all()    - get an array containing all objects of this type
   Book.filter() - not yet implemented
*/
db.store.registerType(Book);
