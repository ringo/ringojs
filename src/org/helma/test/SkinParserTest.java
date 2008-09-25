/*
 *  Copyright 2006 Hannes Wallnoefer <hannes@helma.at>
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package org.helma.test;

import junit.framework.AssertionFailedError;
import junit.framework.TestCase;
import org.helma.template.MacroTag;
import org.helma.template.SkinParser;
import org.helma.template.UnbalancedTagException;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class SkinParserTest extends TestCase {

    public void testComplexDataTypes() throws IOException, UnbalancedTagException {
        SkinParser parser = new SkinParser() {
            int i = 0;
            Object[] parts = new Object[] {
                    "start ",
                    "XXX",
                    " end"
            };

            public void renderMacro(MacroTag macro) {
                List<Object> list = new ArrayList<Object>();
                // list.add("name");
                List<Object> sublist = new ArrayList<Object>();
                sublist.add(1.0);
                sublist.add(-2.3);
                sublist.add("3");
                list.add(sublist);
                Map<String,Object> map = new HashMap<String,Object>();
                map.put("foo", true);
                list.add(map);
                assertEquals(i++, 1);
                assertEquals(macro.getArgs(), list);
                assertEquals(macro.getNamedArgs(), new HashMap());
            }

            public void renderText(String text) {
                assertEquals(text, parts[i++]);
            }

        };
        parser.parse("start <% name [1, -2.3, \"3\"] {foo: true} %> end");
    }

    public void testQuotedMacro() throws IOException, UnbalancedTagException {
        SkinParser parser = new SkinParser() {
            public void renderMacro(MacroTag macro) {
                Map<String,Object> map = new HashMap<String,Object>();
                map.put("foo", "<%bar%>");
                assertEquals(macro.getArgs().size(), 1);
                assertEquals(macro.getArgs().get(0), map);
            }

            public void renderText(String text) {
                throw new AssertionFailedError("renderText called on textless macro: " + text);
            }

        };
        parser.parse("<% name {foo: \"<%bar%>\"} %>");
    }

    public void testMacroList() throws IOException, UnbalancedTagException {
        SkinParser parser = new SkinParser() {
            int count = 1;
            public void renderMacro(MacroTag macro) {
                assertEquals(macro.getArgs().size(), 1);
                assertEquals(macro.getArgs().get(0), (double) count++);
            }
            public void renderText(String text) {
                throw new AssertionFailedError("renderText called on textless macro");
            }
        };
        parser.parse("<% name 1 %><% name 2 %><% name 3 %>");
    }
}
