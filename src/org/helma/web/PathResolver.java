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

/**
 * Helma 2 path resolution:
 * 
 * - Pluggable path resolvers
 * - Path resolvers take a string, map it to an object array and a parameters array
 * - Question: what's the pattern? Do we query? Or delegate?
 * 
 * @author hannes
 */
public interface PathResolver {

	public boolean resolve(RequestPath path);
	
}
