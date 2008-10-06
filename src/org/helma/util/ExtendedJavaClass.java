/*
 * Scriptographer
 *
 * This file is part of Scriptographer, a Plugin for Adobe Illustrator.
 *
 * Copyright (c) 2002-2008 Juerg Lehni, http://www.scratchdisk.com.
 * All rights reserved.
 *
 * Please visit http://scriptographer.com/ for updates and contact.
 *
 * -- GPL LICENSE NOTICE --
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 675 Mass Ave, Cambridge, MA 02139, USA.
 * -- GPL LICENSE NOTICE --
 *
 * File created on 01.01.2005.
 *
 * $Id$
 */

package org.helma.util;

import org.mozilla.javascript.*;

import java.lang.reflect.Modifier;
import java.util.HashMap;


/**
 * @author lehni
 */
public class ExtendedJavaClass extends NativeJavaClass {
	private String className;
	private HashMap<String, Object> properties;
	private Scriptable instanceProto = null;

    public static final ExtendedJavaClass NONE = new ExtendedJavaClass();

    private ExtendedJavaClass() {
        // used for NONE constant
    }

    public ExtendedJavaClass(Scriptable scope, Class cls) {
		super(scope, cls);
        // Set the function prototype, as basically Java constructors
		// behave like JS constructor functions. Like this, all properties
		// from Function.prototype are inherited.
		setPrototype(ScriptableObject.getFunctionPrototype(scope));
		// Determine short className:
		className = cls.getSimpleName();
		properties = new HashMap<String, Object>();
    }

	public Scriptable construct(Context cx, Scriptable scope, Object[] args) {
		// If the normal constructor failed, try to see if the last
		// argument is a Callable or a NativeObject object. 
		// If it is a NativeObject, use it as a hashtable containing
		// fields to be added to the object. If it is a Callable,
		// call it on the object and again use its return value
		// as a hashtable if it is a NativeObject.
		Class classObject = getClassObject();
		int modifiers = classObject.getModifiers();
		NativeObject properties = null;
		Callable initialize = null;
		if (args.length > 0
				&& !Modifier.isInterface(modifiers)
				&& !Modifier.isAbstract(modifiers)) {
			// Look at the last argument to find out if we need to do something
			// special. Possibilities: a object literal that defines fields to
			// be set, or a function that is executed on the object and of which
			// the result can be fields to be set.
			Object last = args[args.length - 1];
			if (last instanceof Callable)
				initialize = (Callable) last;
			else if (last instanceof NativeObject) {
				// Now see if the constructor takes a Map as the last argument.
				// If so, the NativeObject will be converted to it thought
				// RhinoWrapFactory. Otherwise, the NativeObject is used
				// as the properties to be set on the instance after creation.
		    	properties = (NativeObject) last;
			}
			// remove the last argument from the list, so the right constructor
			// will be found:
			if (initialize != null || properties != null) {
				Object[] newArgs = new Object[args.length - 1];
                System.arraycopy(args, 0, newArgs, 0, newArgs.length);
				args = newArgs;
			}
		}
		Scriptable obj = super.construct(cx, scope, args);
        // If an initialize function was passed as the last argument, execute
		// it now. The fields of the result of the function are then injected
		// into the object, if it is a Scriptable.
		if (initialize != null) {
			Object res = initialize.call(cx, scope, obj, args);
			if (res instanceof NativeObject)
				properties = (NativeObject) res;
		}
		// If properties are to be added, do it now:
		if (properties != null) {
			Object[] ids = properties.getIds();
			for (int i = 0; i < ids.length; i++) {
				Object id = ids[i];
				if (id instanceof String)
					obj.put((String) id, obj, properties.get((String) id, properties));
			}
		}
        return obj;
	}

	public Class<?> getClassObject() {
		// Why calling super.unwrap() when all it does is returning the internal
		// javaObject? That's how it's done in NativeJavaClass...
		return (Class<?>) javaObject;
	}

	public Object get(String name, Scriptable start) {
        if ("prototype".equals(name)) {
            return getInstancePrototype();
        } else if (properties.containsKey(name)) {
		    // see whether this object defines the property.
		    return properties.get(name);
        }
        try {
			return super.get(name, start);
		} catch (RuntimeException e) {
			return Scriptable.NOT_FOUND;
		}
	}

	public void put(String name, Scriptable start, Object value) {
        if (super.has(name, start)) {
            super.put(name, start, value);
		} else if ("prototype".equals(name)) {
            if (value instanceof Scriptable)
				instanceProto = (Scriptable) value;
		} else if (properties != null) {
			properties.put(name, value);
		}
	}

	public boolean has(String name, Scriptable start) {
        return "prototype".equals(name) || properties.containsKey(name) || super.has(name, start);
	}

	public void delete(String name) {
        if ("prototype".equals(name)) {
		    instanceProto = null;
        } else {
            properties.remove(name);
        }
    }

	public Scriptable getInstancePrototype() {
        if (instanceProto == null) {
            Context cx = Context.getCurrentContext();
            instanceProto = cx.newObject(getParentScope());
		}
		return instanceProto;
	}

	public String getClassName() {
		return className;
	}

	public String toString() {
		return "[ExtendedJavaClass " + className + "]";
	}

}