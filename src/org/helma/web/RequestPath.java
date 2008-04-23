/*
 * Helma License Notice
 *
 * The contents of this file are subject to the Helma License
 * Version 2.0 (the "License"). You may not use this file except in
 * compliance with the License. A copy of the License is available at
 * http://adele.invoker.org/download/invoker/license.txt
 *
 * Copyright 2006 Hannes Wallnoefer. All Rights Reserved.
 */

 package org.helma.web;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.helma.util.StringUtils;

/**
 * This object wraps the path information for the current request. It is 
 * passed as argument to {@link PathResolver#resolve(RequestPath)} and used to map
 * the path items to path elements and parameters.
 *
 * @author hannes
 */
public class RequestPath {

	String[] path;
	HashMap<String,String> parameters;
	List<Object> elements;

    public RequestPath(String rawPath) {
    	path = StringUtils.split(rawPath, "/");
    	elements = new ArrayList<Object>();
    }
    
    public String[] getPath() {
    	return path;
    }
	
    public void addElement(Object elem) {
    	if (parameters != null) {
    		throw new IllegalStateException(
    				"Remaining path is already mapped to parameters");
    	}
    	elements.add(elem);
    }
    
    public void addElements(List<Object> list) {
    	if (parameters != null) {
    		throw new IllegalStateException(
    				"Remaining path is already mapped to parameters");
    	}
    	elements.addAll(list);
    }
    
    public Object[] getElements() {
    	return elements.toArray();
    }
    
    public void reset() {
    	elements.clear();
    }
    
    public void setParameterNames(String[] names) {
    	parameters = new HashMap<String,String>();
    	int l = path.length - elements.size();
    	for (int i = 0; i < l; i++) {
    		if (i >= names.length)
    			break;
    		parameters.put(names[i], path[i + l]);
    	}
    }
    
    public String getParameter(String name) {
    	return parameters.get(name);
    }
    
    /**
     * 
     * @return an unmodifiable map containing the mapped parameters
     */
    public Map<String, String> getMappedParameters() {
    	return Collections.unmodifiableMap(parameters);
    }
    
    public String[] getUnmappedParameters() {
    	// FIXME
    	return new String[0];
    }
}
