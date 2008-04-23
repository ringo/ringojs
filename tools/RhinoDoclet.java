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

import com.sun.javadoc.*;

import java.util.*;
import java.io.*;
import java.text.CharacterIterator;
import java.text.StringCharacterIterator;

/**
 * A doclet that extracts Rhino host object documentation out of javadoc comments
 * to a file called rhinodoc.json in JSON format.
 * See <http://java.sun.com/j2se/1.5.0/docs/guide/javadoc/doclet/overview.html>
 * for information on how to use doclets.
 */
public class RhinoDoclet {
    public static boolean start(RootDoc root) throws IOException {
        HashMap<String,Object> map = new HashMap<String,Object>();
        ClassDoc[] classes = root.classes();
        for (ClassDoc doc: classes) {
            if (implementsScriptable(doc))
                addClassDoc(doc, map);
        }
        Writer writer = new FileWriter("rhinodoc.json");
        writeJson(map, writer);
        writer.close();
        return true;
    }

    static void addClassDoc(ClassDoc doc, Map<String,Object> map) {
        HashMap<String,Object> classMap = new HashMap<String,Object>();
        Tag nametag = getTag(doc, "rhinoclass");
        String name = nametag == null ? doc.name() : nametag.text();
        addGenericDoc(doc, name, "class", classMap);
        MethodDoc[] methods = doc.methods();
        for (MethodDoc method: methods) {
            String methodName = method.name();
            if (methodName.startsWith("jsFunction_")) {
                addMethodDoc(method, classMap);
            } else if (methodName.startsWith("jsGet_")) {
                addPropertyDoc(method, classMap);
            } else if (methodName.startsWith("jsSet_")) {
                addPropertyDoc(method, classMap);
            }
        }
        map.put(name, classMap);
    }

    static void addMethodDoc(MethodDoc doc, Map<String,Object> map) {
        HashMap<String,Object> methMap = new HashMap<String,Object>();
        String name = doc.name().substring(11) + "()";
        Parameter[] params = doc.parameters();
        ParamTag[] paramTags = doc.paramTags();
        List<Object> paramList = new ArrayList<Object>();
        for (Parameter param: params) {
            Map<String, String> paramMap = new HashMap<String, String>();
            paramMap.put("name", param.name());
            paramMap.put("type", param.typeName());
            for (ParamTag tag: paramTags)
                if (param.name().equals(tag.parameterName())) {
                    paramMap.put("desc", tag.parameterComment());
                    break;
                }
            paramList.add(paramMap);
        }
        methMap.put("params", paramList);
        addGenericDoc(doc, name, "method", methMap);
        map.put(name, methMap);
    }

    static void addPropertyDoc(MethodDoc doc, Map<String,Object> map) {
        HashMap<String,Object> propMap = new HashMap<String,Object>();
        String name = doc.name().substring(6);
        addGenericDoc(doc, name, "property", propMap);
        map.put(name, propMap);
    }

    static void addGenericDoc(Doc doc, String name, String type, Map<String,Object> map) {
        String body = processComment(doc.commentText());
        map.put("name", name);
        map.put("type", type);
        map.put("body", body);
        Tag desctag = getTag(doc, "desc");
        String desc = desctag == null ? getFirstSentence(body) : desctag.text();
        map.put("description", desc);
    }

    static boolean implementsScriptable(ClassDoc clazz) {
        Type parent = clazz.superclassType();
        if (parent != null && "org.mozilla.javascript.ScriptableObject".equals(parent.qualifiedTypeName()))
            return true;
        Type[] interfaces = clazz.interfaceTypes();
        for (Type type: interfaces) {
            if ("org.mozilla.javascript.Scriptable".equals(type.qualifiedTypeName()))
                return true;
        }
        return false;
    }

    static Tag getTag(Doc doc, String name) {
        Tag[] tags = doc.tags(name);
        if (tags == null || tags.length == 0)
            return null;
        return tags[0];
    }

    static enum LineType {PLAIN, EMPTY, LIST}

    static String processComment(String cmt) {
        StringBuffer buffer = new StringBuffer(cmt.length());
        String[] lines = cmt.split("\\r\\n|\\r|\\n");
        LineType previousLine = LineType.PLAIN;
        for (String line: lines) {
            LineType thisLine;
            if (line.trim().length() == 0) {
                buffer.append("\r\n\r\n");
                thisLine = LineType.EMPTY;
            } else {
                if (line.length() > 0 && line.charAt(0) == ' ')
                    line = line.substring(1);
                if ((line.startsWith("*") || line.startsWith("#")) &&
                        previousLine != LineType.PLAIN)
                    thisLine = LineType.LIST;
                else
                    thisLine = LineType.PLAIN;
                if (thisLine == LineType.LIST && previousLine == LineType.LIST)
                    buffer.append("\r\n");
                buffer.append(line);
                if (thisLine == LineType.PLAIN && !line.endsWith(" "))
                    buffer.append(' ');
            }
            previousLine = thisLine;
        }
        return buffer.toString().trim();
    }

    static String getFirstSentence(String body) {
        int dot = body.indexOf('.');
        return dot == -1 ? body : body.substring(0, dot + 1);
    }

    static char[] hex = "0123456789ABCDEF".toCharArray();

    // A very primitive JSON writer, only supports objects and strings.
    // The String encoding code is gratefully lifted from the Springtree
    // JSON writer - see <http://blog.stringtree.org/2006/08/12/json/>
    static void writeJson(Object obj, Writer writer) throws IOException {
        if (obj instanceof Map) {
            Map map = (Map) obj;
            writer.write("{");
            Iterator it = map.keySet().iterator();
            while (it.hasNext()) {
                Object key = it.next();
                Object value = map.get(key);
                writeJson(key, writer);
                writer.write(": ");
                writeJson(value, writer);
                if (it.hasNext())
                    writer.write(", ");
            }
            writer.write("}");
        } else if (obj instanceof List) {
            List list = (List) obj;
            Iterator it = list.iterator();
            writer.write("[");
            while (it.hasNext()) {
                writeJson(it.next(), writer);
                if (it.hasNext())
                    writer.write(", ");
            }
            writer.write("]");
        } else if (obj instanceof String) {
            writer.write('"');
            CharacterIterator it = new StringCharacterIterator(obj.toString());
            for (char c = it.first(); c != CharacterIterator.DONE; c = it.next()) {
                if (c == '"') writer.write("\\\"");
                else if (c == '\\') writer.write("\\\\");
                else if (c == '/') writer.write("\\/");
                else if (c == '\b') writer.write("\\b");
                else if (c == '\f') writer.write("\\f");
                else if (c == '\n') writer.write("\\n");
                else if (c == '\r') writer.write("\\r");
                else if (c == '\t') writer.write("\\t");
                else if (Character.isISOControl(c)) {
                    writer.write("\\u");
                    int n = c;
                    for (int i = 0; i < 4; ++i) {
                        int digit = (n & 0xf000) >> 12;
                        writer.write(hex[digit]);
                        n <<= 4;
                    }
                } else {
                    writer.write(c);
                }
            }
            writer.write('"');
        }
    }
}
