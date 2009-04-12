
export('Storable');

include('helma/functional');

importPackage(org.mozilla.javascript);
importPackage(com.google.appengine.api.datastore);

var datastore = DatastoreServiceFactory.getDatastoreService();

function Storable(type, arg) {

	// if called with one argument, return a constructor for a concrete type.
	if (arguments.length == 1) {
		return bindArguments(Storable, type);
	}
	
	// if called with two arguments, return an actual instance
    var key, entity, props;

    function ensureEntity() {
    	if (!entity) {
    		if (arg instanceof Key) {
            	entity = datastore.get(arg);
        	} else if (arg instanceof Entity) {
            	entity = arg;
        	} else if (arg instanceof Object) {
            	entity = new Entity(type);
            	for (var key in arg) {
                	storable[key] = arg[key];
            	}
        	}
    	}
        return entity != null;
    }
    
    function ensureKey() {
    	if (!key) {
    		if (arg instanceof Key) {
    			key = arg;
    		} else if (arg instanceof Entity) {
    			key= arg.getKey();
    		}
    	}
    	return key != null
    }
    
    function ensureProps() {
    	if (!props) {
    		if (ensureEntity()) {
    			props = {};
    			for (var i in storable) {
    				props[i] = storable[i];
    			}
    		}
    	}
    	return props != null;
    }

    var storable = new JavaAdapter(NativeObject, {
        get: function(name, start) {
    	    if (this.super$get(name, start) != Scriptable.NOT_FOUND) {
    	    	return this.super$get(name, start);
    	    } else if (ensureEntity()) {
                var value = entity.getProperty(name);
                if (value == null) {
                    return Scriptable.NOT_FOUND;
                } else if (value instanceof Key) {
                    return new Storable(value.getKind(), value);
                } else {
                    return Context.javaToJS(value, global);
                }
            }
        },
        
        put: function(name, start, value) {
        	if (typeof value == "function") {
        		return this.super$put(name, start, value);
        	} else if (ensureEntity()) {
                if (value instanceof Storable) {
                    entity.setProperty(name, value.getKey());
                } else {
                    entity.setProperty(name, value);
                }
            }
        },

        has: function(name, start) {
        	if (ensureEntity()) {
        		return entity.hasProperty(name);
        	} else {
        		return this.super$has(name, start);
        	}
        },
        
        getIds: function() {
        	if (ensureEntity()) {
        		var map = entity.getProperties();
        		return map.keySet().toArray();
        	} else {
        		return this.super$getIds();
        	}
        }
    });

    storable.save = function() {
        if (ensureEntity()) {
            datastore.put(entity);
        }
    }

    storable.remove = function() {
        if (ensureKey()) {
        	datastore['delete'](key);
        }
    }
    
    storable.getKey = function() {
    	if (ensureEntity()) {
    		return entity.getKey();
    	}
    	throw Error("Can't get key from " + arg);
    }

    storable.getId = function() {
    	if (ensureEntity()) {
    		return KeyFactory.keyToString(entity.getKey());
    	}
    	throw Error("Can't get key from " + arg);
    }
    
    storable.toString = function() {
    	if (ensureProps()) {
    		return props.toSource();
    	} else if (ensureEntity()) {
    		return entity.getKey().toString();
    	}
    	return "invalid entity: " + arg;
    }

    storable.__proto__ = Storable.prototype;
    return storable;
}

Storable.all = function(type) {
    var result = [];
    var i = datastore.prepare(new Query(type)).asIterator();
    while (i.hasNext()) {
        result.push(new Storable(type, i.next()));
    }
    return result;
}

Storable.get = function(key) {
	if (typeof key == 'string') {
		key = KeyFactory.stringToKey(key);
	}
	if (!(key instanceof Key)) {
		throw Error("Storable.get() called with non-key argument");
	}
	return new Storable(key.getKind(), datastore.get(key));
}
