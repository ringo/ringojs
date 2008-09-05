importModule('core.JSON');
importFromModule('helma.file', 'File');
importFromModule('helma.functional', 'partial');
importModule('helma.logging', 'logging');
var log = logging.getLogger(__name__);

var __shared__ = true;

/**
 * The base/wrapper prototype for persistent minibase objects
 *
 * @param obj the raw javascript object to wrap
 * @param properties the persistent object properties (optional)
 */
function makeStorable(obj, properties) {

    if (!(obj instanceof Object) || !(obj.constructor instanceof Function))
        throw new Error("object must be an object, was: " + properties);
    if (!(obj.constructor instanceof Function))
        throw new Error("object must have a constructor property, has: "  + obj.constructor);
    if (properties === undefined)
        properties = {};
    if (!(properties instanceof Object))
        throw new Error("properties must be an object, was: " + properties);

    var ctor = obj.constructor;
    var type = ctor.name;
    var id;

    if (typeof type != "string")
        throw new Error("couldn't get type: " + type);


    obj.__get__ = function(name) {
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

    obj.__set__ = function(name, value) {
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

    obj.__delete__ = function(name) {
        delete properties[name];
    };

    obj.__has__ = function(name) {
        return properties[name] !== undefined ||
               this[name] !== undefined;
    };

    obj.__getIds__ = function() {
        var ids = [];
        for (var id in properties) {
            ids[ids.length] = id
        }
        return ids;
    };

    obj.save = function(txn) {
        ctor.save(txn, this, properties);
    };

    obj.remove = function(txn) {
        ctor.remove(txn, this);
    };

    obj.getKey = function() {
        if (!(typeof id == "string")) {
            throw new Error("getKey() called on non-persistent object");
        }
        return {_id: id, _type: type};
    }

    // only define toString if object doesn't have one already
    if (obj.toString == Object.prototype.toString) {
        obj.toString = function() {
            return type + "[" + id + "]";
        };
    }
}

/**
 * File Store class
 * @param path the database directory
 */
function Store(path) {

    // the class registry
    var typeRegistry = {};

    // map of type to current id tip
    var idMap = {};

    this.registerType = function(ctor) {
        if (typeof ctor != "function") {
           throw new Error("registerType() called with non-function argument: " + ctor);
        }
        if (typeof ctor.name != "string") {
           throw new Error("constructor must not be an anonymous function");
        }
        // add class to registry
        typeRegistry[ctor.name] = ctor;
        // install filter, all, and get methods on constructor
        ctor.list = partial(list, ctor.name);
        ctor.all = partial(getAll, ctor.name);
        ctor.get = partial(get, ctor.name);
        ctor.save = partial(save);
        ctor.remove = partial(remove);
        ctor.store = this;
    };

    this.getRegisteredType = function(name) {
        return typeRegistry[name];
    }

    var list = function(type, options) {
        var array = getAll(type);
        if (options) {
            // first filter out the the items we're not interested in
            var filter = options.filter;
            if (typeof filter == "function") {
                array = array.filter(filter);
            }
            // then put them into order
            var [orderBy, ascDesc] = [options.orderBy, options.order == "desc" ? -1 : 1];
            if (options.orderBy) {
                array = array.sort(function(o1, o2) {
                    var [p1, p2] = [o1[orderBy], o2[orderBy]];
                    if (p1 < p2) return -1 * ascDesc;
                    if (p1 > p2) return  1 * ascDesc;
                    return 0;
                })
            }
            // finally apply pagination/slicing
            var [start, max] = [parseInt(options.start, 10), parseInt(options.max, 10)];
            if (isFinite(start) || isFinite(max)) {
                var start = start || 0;
                array = array.slice(start, start + max || array.length);
            }
        }
        return array;
    };

    var getAll = function(type) {
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

    var get = function(type, id) {
       var dir = new File(base, type);
       var file = new File(dir, id);

       if (!file.exists()) {
           return null;
       } else if (!file.isFile()) {
           throw new Error("Is not a regular file: " + file);
       }
       return persister.retrieve(type, file);
    }

    var save = function(txn, obj, properties) {
        var wrapTransaction = !txn;
        if (wrapTransaction) {
            txn = new Transaction();
        }
        for (var i in properties) {
            var v = properties[i];
            if (isStorable(v)) {
                if (isTransientStorable(v)) {
                    v.save(txn);
                }
                properties[i] = v.getKey();
            }
        }
        var [type, id] = [obj._type, obj._id];
        var dir = new File(base, type);
        if (!dir.exists()) {
            if (!dir.mkdirs()) {
                throw new Error("Can't create directory for type " + type);
            }
        }
        if (id == undefined) {
            obj._id = id = persister.generateId(type, dir);
        }

        var file = new File(dir, id);
        var tempFileName = type + id + ".";
        var tempfile = base.createTempFile(tempFileName, ".tmp");

        persister.store(properties, tempfile);

        if (file.exists() && !file.canWrite()) {
            throw new Error("No write permission for " + file);
        }

        txn.updateResource({ file: file, tempfile: tempfile });

        if (wrapTransaction) {
            txn.commit();
        }
    };

    var remove = function(txn, obj) {
        var wrapTransaction = !txn;
        if (wrapTransaction) {
            txn = new Transaction();
        }
        for (var i in obj) {
            var v = obj[i];
            if (isPersistentStorable(v)) {
                // cascading delete (just to show it works)
                v.remove(txn);
            }
        }
        var [type, id] = [obj._type, obj._id];
        if (!type) {
            throw new Error("type not defined in object " + obj);
        }
        if (!id) {
            throw new Error("id not defined in object " + obj);
        }

        var file = new File(new File(base, type), id);
        txn.deleteResource({ file: file });

        if (wrapTransaction) {
            txn.commit();
        }
    };

    // the persister
    var persister = {

        store: function(object, file) {
            log.debug("Storing object: " + object.toSource());
            file.open({ append: true });
            file.write(object.toJSON());
            file.close();
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

        generateId: function(type, dir) {
            var id = idMap[type] || 1;
            var file = new File(dir, id.toString(36));
            while(file.exists()) {
                id += 1;
                file = new File(dir, id.toString(36));
            }

            idMap[type] = id + 1;
            return file.getName();
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
         if (res.tempfile.renameTo(res.file)) {
             // success - delete tmp file
            res.tempfile.remove();
         } else {
            // error - leave tmp file and print a message
            log.error("Couldn't move file, committed version is in " + res.tempfile);
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
         res.tempfile.remove();
      }
   }
}