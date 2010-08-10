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

package org.ringojs.template;

import org.ringojs.repository.Resource;

import java.io.*;
import java.util.*;

/**
 * Scanner for Ringo templates/skins.
 */
public abstract class SkinParser {

    LineNumberReader reader;
    StringBuffer buffer = new StringBuffer();

    public void parse(Resource res, String charset) throws IOException, UnbalancedTagException {
        parse(new InputStreamReader(res.getInputStream(), charset));
    }

    public void parse(String str) throws IOException, UnbalancedTagException {
        parse(new StringReader(str));
    }

    public void parse(Reader r) throws IOException, UnbalancedTagException {
        try {
            if (r instanceof LineNumberReader) {
                reader = (LineNumberReader) r;
            } else {
                reader = new LineNumberReader(r);
            }
            int c;
            boolean escape = false;
            while ((c = reader.read()) > 0) {
                switch (c) {
                    case '\\':
                        if (escape) {
                            buffer.append('\\');
                        }
                        escape = true;
                        break;
                    case '<':
                        reader.mark(1);
                        if (reader.read() == '%' && !escape) {
                            if (buffer.length() > 0) {
                                renderText(buffer.toString());
                                buffer.setLength(0);
                            }
                            renderMacro(readMacro(reader));
                        } else {
                            buffer.append((char) c);
                            reader.reset();
                            escape = false;
                        }
                        break;
                    default:
                        if (escape) {
                            buffer.append('\\');
                            escape = false;
                        }
                        buffer.append((char) c);
                        break;
                }
            }
            if (buffer.length() > 0) {
                renderText(buffer.toString());
            }
        } finally {
            r.close();
        }
    }

    /**
     * Called when a piece of static text has been parsed.
     * @param text the text fragement
     */
    protected abstract void renderText(String text);

    /**
     * Called when a macro has been parsed.
     * @param macro the macro
     */
    protected abstract void renderMacro(MacroTag macro);

    protected MacroTag readMacro(LineNumberReader reader) throws IOException, UnbalancedTagException {
        boolean escape = false;
        int quotechar = 0;
        Stack<ObjectList> stack = new Stack<ObjectList>();
        ObjectList list = new ObjectList(ObjectList.MACRO, reader.getLineNumber());
        int c;

        loop: while ((c = reader.read()) > 0) {
            switch (c) {
                case '|':
                    if (quotechar == 0) {
                        list.macro.addFilter(readMacro(reader));
                        return list.macro;
                    } else {
                        buffer.append((char) c);
                    }
                    break;
                case '<':
                    if (quotechar == 0) {
                        reader.mark(1);
                        if (reader.read() == '%') {
                            if (buffer.length() > 0) {
                                renderText(buffer.toString());
                                buffer.setLength(0);
                            }
                            list.add(readMacro(reader));
                        } else {
                            buffer.append((char) c);
                            reader.reset();
                        }
                    } else {
                        buffer.append((char) c);
                    }
                    break;
                case '%':
                    if (quotechar == 0) {
                        reader.mark(1);
                        if (reader.read() == '>') {
                            list.addPart(buffer, false);
                            break loop;
                        } else {
                            reader.reset();
                        }
                    }
                    buffer.append((char) c);
                    break;
                case '\\':
                    if (escape) {
                        buffer.append((char) c);
                    }
                    escape = !escape;
                    break;
                case '"':
                case '\'':
                    if (!escape) {
                        if (quotechar == c) {
                            list.addPart(buffer, true);
                            quotechar = 0;
                        } else if (quotechar == 0) {
                            quotechar = c;
                            list.addPart(buffer, false);
                        } else {
                            buffer.append((char) c);
                        }
                    } else {
                        buffer.append((char) c);
                    }
                    escape = false;
                    break;
                case '[':
                case '(':
                case '{':
                    if (quotechar == 0) {
                        list.addPart(buffer, false);
                        stack.push(list);
                        list = new ObjectList(c, reader.getLineNumber());
                    } else {
                        buffer.append((char) c);
                    }
                    break;
                case ']':
                case ')':
                case '}':
                    if (quotechar == 0) {
                        if (c == ']' && list.type != ObjectList.ARRAY)
                            throw new UnbalancedTagException("unbalanced square brackets");
                        else if (c == ')' && list.type != ObjectList.PARAMGROUP)
                            throw new UnbalancedTagException("unbalanced parentheses");
                        else if (c == '}' && list.type != ObjectList.OBJECT)
                            throw new UnbalancedTagException("unbalanced curly brackets");
                        list.addPart(buffer, false);
                        ObjectList sublist = list;
                        list = stack.pop();
                        list.addList(sublist);
                    } else {
                        buffer.append((char) c);
                    }
                    break;
                case ' ':
                case '\t':
                case '\n':
                case '\r':
                case '\f':
                    if (quotechar == 0) {
                        list.addPart(buffer, false);
                    } else {
                        buffer.append((char) c);
                    }
                    break;
                case ':':
                    if (quotechar == 0 && list.type == ObjectList.OBJECT) {
                        list.addPart(buffer, false);
                    } else {
                        buffer.append((char) c);
                    }
                    break;
                case ',':
                    if (quotechar == 0 && list.isCommaSeparated()) {
                        list.addPart(buffer, false);
                    } else {
                        buffer.append((char) c);
                    }
                    break;
                case '=':
                    if (quotechar == 0 && list.type == ObjectList.MACRO) {
                        list.pushMacroParameterName(buffer);
                    } else {
                        buffer.append((char) c);
                    }
                    break;
                default:
                    buffer.append((char) c);
                    break;
            }
        }
        if (!stack.isEmpty()) {
            throw new UnbalancedTagException("unbalanced macro");
        }
        return list.macro;
    }

    /**
     * A unified representation for various types of things being collected during parsing.
     */
    class ObjectList {
        final List<Object> list;
        final MacroTag macro;
        final int type;
        final int startLine;

        static final int NONE = 0;
        static final int MACRO = 1;
        static final int OBJECT = '{';
        static final int ARRAY = '[';
        static final int PARAMGROUP = '(';

        String parameterName = null;

        ObjectList(int type, int startLine) {
            this.type = type;
            this.startLine = startLine;
            if (type == MACRO) {
                macro = new MacroTag(startLine);
                list = null;
            } else {
                list = new ArrayList<Object>();
                macro = null;
            }
        }

        public int getStartLine() {
            return startLine;
        }

        boolean isCommaSeparated() {
            return type == ARRAY || type == OBJECT;
        }

        void addList(ObjectList sublist) {
            if (sublist.type == MACRO) {
                add(sublist.macro);
            } else if (sublist.type == OBJECT) {
                Map<Object,Object> map = new HashMap<Object,Object>();
                Iterator it = sublist.list.iterator();
                while (it.hasNext()) {
                    map.put(it.next(), it.next());
                }
                add(map);
            } else {
                add(sublist.list);
            }
        }

        void addPart(StringBuffer buffer, boolean quoted) {
            String str = buffer.toString();
            buffer.setLength(0);
            if (!quoted) {
                str = str.trim();
                if (str.length() == 0) {
                    return;
                }
            }
            // always treat first macro argument as name
            if (type == MACRO && macro.getName() == null) {
                macro.setName(str);
            } else if (!quoted) {
                if ("true".equals(str)) {
                    add(Boolean.TRUE);
                } else if ("false".equals(str)) {
                    add(Boolean.FALSE);
                } else if ("null".equals(str)) {
                    add(null);
                } else if (Character.isDigit(str.charAt(0)) || str.startsWith("-")) {
                    try {
                        Double d = Double.valueOf(str);
                        add(d);
                    } catch (NumberFormatException nfx) {
                        add(str);
                    }
                } else {
                    add(str);
                }
            } else {
                add(str);
            }
        }

        void add(Object obj) {
            if (type == MACRO){
                if (parameterName != null) {
                    macro.addNamedParameter(parameterName, obj);
                } else {
                    macro.addParameter(obj);
                }
            } else {
                list.add(obj);
            }
            parameterName = null;
        }

        void pushMacroParameterName(StringBuffer buffer) {
            String str = buffer.toString().trim();
            buffer.setLength(0);
            // if parameter key is empty string there was whitespace between the
            // name and the '=', so the real name was already added to our
            // unnamed parameter list
            LinkedList args = macro.args;
            if (str.length() == 0 && !args.isEmpty() &&
                    args.getLast() instanceof String) {
                parameterName = (String) args.removeLast();
            } else {
                parameterName = str;
            }
        }

    }
}


