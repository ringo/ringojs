importModule('core.JSON');
importFromModule('helma.file', 'File');
importFromModule('helma.functional', 'partial');
importModule('helma.logging', 'logging');
var log = logging.getLogger(__name__);

var __shared__ = true;

/**
 * The base/wrapper prototype for persistent minibase objects
 *
 * @param object the raw javascript object to wrap
 * @param properties the persistent object properties (optional)
 */
function Storable(object, properties) {

    if (!(object instanceof Object) || !(object.constructor instanceof Function))
        throw new Error("object must be an object, was: " + properties);
    if (!(object.constructor instanceof Function))
        throw new Error("object must have a constructor property, has: "  + object.constructor);
    if (properties === undefined)
        properties = {};
    if (!(properties instanceof Object))
        throw new Error("properties must be an object, was: " + properties);

    var ctor = object.constructor;
    var type = ctor.name;
    var id;

    if (typeof type != "string")
        throw new Error("couldn't get type: " + type);


    this.__get__ = function(name) {
        if (name == "_id") {
            return id;
        } else if (name == "_type") {
            return type;
        }
        if (this[name]) return this[name];
        var value = properties[name];
        if (isKey(value)) {
            value = ctor.store.get(value._type, value._id);
        }
        return value;
    };

    this.__set__ = function(name, value) {
        if (name == "_id") {
            if (id != undefined) {
                throw new Error("Cannot change _id on storable object");
            }
            id = value;
            return;
        }
        if (typeof value == "function") {
            this[name] = value;
            return;
        } else if (isPersistentStorable(value)) {
            value = value.getKey();
        }
        properties[name] = value;
    };

    this.__delete__ = function(name) {
        delete properties[name];
    };

    this.__has__ = function(name) {
        return properties[name] !== undefined ||
               this[name] !== undefined;
    };

    this.__getIds__ = function() {
        var ids = [];
        for (var id in properties) {
            ids[ids.length] = id
        }
        return ids;
    };

    this.save = function(txn) {
        ctor.save(txn, this, properties);
    };

    this.remove = function(txn) {
        ctor.remove(txn, this);
    };

    this.getKey = function() {
        if (!(typeof id == "string")) {
            throw new Error("getKey() called on non-persistent object");
        }
        return {_id: id, _type: type};
    }

    this.toString = function() {
        return type + "[" + id + "]";
    };

    // trick required to make * instanceof Storable work
    // as we set this.__proto__ to something else than Storable.prototype.
    this.__storable__ = true;
    // make object our prototype and return ourself
    this.__proto__ = object;
    return this;
}

Storable.__hasInstance__ = function(object) {
   return object instanceof Storable || object.__storable__;
}

/**
 * File Store class
 * @param path the database directory
 */
function Store(path) {

    // the class registry
    var typeRegistry = {};

    this.registerType = function(ctor) {
        // add class to registry
        typeRegistry[ctor.name] = ctor;
        // install filter, all, and get methods on constructor
        ctor.filter = partial(this.filter, ctor.name);
        ctor.all = partial(this.getAll, ctor.name);
        ctor.get = partial(this.get, ctor.name);
        ctor.save = partial(this.save);
        ctor.remove = partial(this.remove);
        ctor.store = this;
    };

    this.getRegisteredType = function(name) {
        return typeRegistry[name];
    }

    this.filter = function(type, term) {
        throw new Error("not implemented");
    };

    this.getAll = function(type) {
       var dir = new File(base, type);
       if (!dir.exists() || !dir.isDirectory()) {
           return [];
       }
       var files = dir.listFiles();
       var list = [];

       for each (var file in files) {
           if (!file.isFile() || file.isHidden()) {
               continue;
           }
           list.push(persister.retrieve(type, new File(file)));
       }
       return list;
    }

    this.get = function(type, id) {
       var dir = new File(base, type);
       var file = new File(dir, id);

       if (!file.exists()) {
           return null;
       } else if (!file.isFile()) {
           throw new Error("Is not a regular file: " + file);
       }
       return persister.retrieve(type, file);
    }

    this.save = function(txn, obj, properties) {
        var wrapTransaction = !txn;
        if (wrapTransaction) {
            txn = base.beginTransaction();
        }
        for (var i in properties) {
            var v = properties[i];
            if (storage.isStorable(v)) {
                if (storage.isTransientStorable(v)) {
                    v.save(txn);
                }
                properties[i] = v.getKey();
            }
        }
        var type = obj._type, id = obj._id;
        if (id == undefined) {
            id = base.insert(txn, type, properties);
            obj._id = id;
        } else {
            base.update(txn, type, id, properties);
        }
        if (wrapTransaction) {
            base.commitTransaction(txn);
        }
    };

    this.remove = function(txn, obj) {
        var wrapTransaction = !txn;
        if (wrapTransaction) {
            txn = base.beginTransaction();
        }
        for (var i in obj) {
            var v = obj[i];
            if (storage.isPersistentStorable(v)) {
                // cascading delete (just to show it works)
                v.remove(txn);
            }
        }
        var type = obj._type, id = obj._id;
        if (!type) {
            throw new Error("type not defined in object " + obj);
        }
        if (!id) {
            throw new Error("id not defined in object " + obj);
        }
        base.remove(txn, type, id);
        if (wrapTransaction) {
            base.commitTransaction(txn);
        }
    };

    this.begin = function() {
        return new Transaction();
    }

    this.commit = function(txn) {
        txn.commit();
    }

    this.abort = function(txn) {
        txn.abort();
    }

    // the persister
    var persister = {

        store: function(object, outputStream) {
            log.debug("Storing object: " + object.toSource());
            var writer = new java.io.OutputStreamWriter(outputStream);
            for (var i in object) {}
            writer.write(object.toJSON());
            writer.close();
        },

        retrieve: function(type, file) {
            var content = file.readAll();
            var properties = content.parseJSON();
            var ctor = typeRegistry[type];
            if (!ctor) {
                throw new Error("constructor not registered for type " + type);
            }
            var obj = new ctor(properties);
            obj._id = file.getName();
            return obj;
        },

        readInputStream: function(inputStream) {
            var reader = new java.io.BufferedReader(java.io.InputStreamReader(inputStream));
            var content = new java.lang.StringBuffer(), line;
            while ((line = reader.readLine()) != null) {
                content.append(line);
            }
            return content.toString()
        }

    };

    var base = new File(path);
    log.debug("Set up new store: " + base);

};

var isKey = function(value) {
    return value instanceof Object
            && typeof value._id == 'string'
            && typeof value._type == 'string';
}

var isStorable = function(value) {
    return value instanceof JSAdapter
            && typeof value._type == 'string';
}

var isPersistentStorable = function(value) {
    return isStorable(value)
            && typeof value._id == 'string';
}

var isTransientStorable = function(value) {
    return isStorable(value)
            && typeof value._id == 'undefined';
}

function Resource(file, tmpfile) {
   this.file = file;
   this.tmpfile = tmpfile;
}

function Transaction() {

   var updateList = [];
   var deleteList = [];

   this.deleteResource = function(res) {
      deleteList.push(res);
   }

   this.updateResource = function(res) {
      updateList.push(res);
   }

   this.commit = function() {
      for each (var res in updateList) {
         // because of a Java/Windows quirk, we have to delete
         // the existing file before trying to overwrite it
         if (res.file.exists()) {
             res.file.remove();
         }
         // move temporary file to permanent name
         if (res.tmpfile.renameTo(res.file)) {
             // success - delete tmp file
            res.tmpfile.remove();
         } else {
            // error - leave tmp file and print a message
            log.error("Couldn't move file, committed version is in " + res.tmpfile);
         }
      }

      for each (var res in deleteList) {
         res.file.remove();
      }

      updateList = [];
      deleteList = [];
   }

   this.abort = function() {
      for each (var res in updateList) {
         res.tmpfile.remove();
      }
   }
}