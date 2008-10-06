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
 * File created on 02.01.2005.
 *
 * $Id$
 */

package org.helma.util;

import org.mozilla.javascript.*;

import java.util.HashMap;

/**
 * @author lehni
 */
public class ExtendedJavaObject extends NativeJavaObject {
	HashMap<String, Object> properties;
	ExtendedJavaClass classWrapper = null;
	
	/**
     *
     * @param scope the current scope
     * @param javaObject the wrapped java object
     * @param staticType the static type
     * @param extClass the extended java wrapper
     */
	public ExtendedJavaObject(Scriptable scope, Object javaObject, Class staticType,
                              ExtendedJavaClass extClass) {
		super(scope, javaObject, staticType);
		properties = new HashMap<String, Object>();
		classWrapper = extClass;
        prototype = extClass.getInstancePrototype();
    }

    public void setPrototype(Scriptable proto) {
        prototype = proto;
    }

    public Scriptable getPrototype() {
	    return prototype;
	}

	public Object get(String name, Scriptable start) {
		// Properties need to come first, as they might override something
		// defined in the underlying Java object
		if (properties != null && properties.containsKey(name)) {
			// See whether this object defines the property.
			return properties.get(name);
		}
        Object res = super.get(name, start);
		if (res != null && res != Scriptable.NOT_FOUND) {
	        return res;
        }
        if (name.equals("prototype")) {
            return prototype;
		}
        return Scriptable.NOT_FOUND;
    }
	
	public void put(String name, Scriptable start, Object value) {
        if (super.has(name, start)) { // members.has(name, false)) {
			super.put(name, start, value); // members.put(this, name, javaObject, value, false);
			return; // done
		}
		if (name.equals("prototype")) {
			if (value instanceof Scriptable) {
				setPrototype((Scriptable) value);
            }
        } else {
			properties.put(name, value);
		}
	}
	
	public boolean has(String name, Scriptable start) {
		return super.has(name, start) || // members.has(name, false) ||
				properties != null && properties.containsKey(name);
	}

	public void delete(String name) {
		if (properties != null)
			properties.remove(name);
	}
	
	public Object[] getIds() {
		// concatenate the super classes ids array with the keySet from
		// properties HashMap:
		Object[] javaIds = super.getIds();
		if (properties != null) {
			int numProps = properties.size();
			if (numProps == 0)
				return javaIds;
			Object[] ids = new Object[javaIds.length + numProps];
			properties.keySet().toArray(ids);
			System.arraycopy(javaIds, 0, ids, numProps, javaIds.length);
			return ids;
		} else {
			return javaIds;
		}
	}

	protected Object toObject(Object obj, Scriptable scope) {
		// Use this instead of Context.toObject, since that one
		// seems to handle Booleans wrongly (wrapping it in objects).
		scope = ScriptableObject.getTopLevelScope(scope);
		Context cx = Context.getCurrentContext();
        return cx.getWrapFactory().wrap(cx, scope, obj, null);
	}
}
