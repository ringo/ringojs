package org.helma.util;

import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Stack;

public class MarkdownProcessor {

    private HashMap<String,String> links = new HashMap<String,String>();
    private State state;
    private int length;
    private char[] chars;
    private StringBuffer buffer;
    private int lineMarker = 0;
    private int paragraphMarker = 0;
    private boolean listParagraphs = false;
    private int listEndMarker = 0;
    private int codeEndMarker = 0;
    private boolean strong, em;
    private ElementStack stack = new ElementStack();

    private String result = null;

    enum State {
        NONE, NEWLINE, LINK_ID, LINK_URL, LINK_TITLE,
        HEADER, PARAGRAPH, LIST, HTML_BLOCK, CODE, BLOCKQUOTE
    }

    public MarkdownProcessor(String text) {
        length = text.length();
        chars = new char[length + 2];
        text.getChars(0, length, chars, 0);
        chars[length] = chars[length + 1] = '\n';
    }

    public MarkdownProcessor(File file) throws IOException {
        length = (int) file.length();
        chars = new char[length + 2];
        FileReader reader = new FileReader(file);
        if (reader.read(chars) != length) {
            throw new IOException("Couldn't read file");
        }
        chars[length] = chars[length + 1] = '\n';
    }

    public synchronized String process() {
        if (result == null) {
            length = chars.length;
            firstPass();
            secondPass();
            result = buffer.toString();
            cleanup();
        }
        return result;
    }

    /**
     * First pass: extract links definitions and remove them from the source text.
     */
    private void firstPass() {
        State state = State.NEWLINE;
        int linestart = 0;
        String linkid = null;
        StringBuffer buffer = new StringBuffer();
        for (int i = 0; i < length; i++) {
            char c = chars[i];
            switch (c) {
                case '\r':
                    if (i < length && chars[i + 1] == '\n') {
                        System.arraycopy(chars, i + 1, chars, i, (length - i) - 1);
                        length -= 1;
                    } else {
                        chars[i] = '\n';
                    }
                case '\n':
                    if (state == State.LINK_URL || state == State.LINK_TITLE) {
                        System.arraycopy(chars, i, chars, linestart, length - i);
                        Arrays.fill(chars, length - (i - linestart), length, (char) 0);
                        length -= (i - linestart);
                        i = linestart;
                        if (state == State.LINK_URL) {
                            links.put(linkid.toLowerCase(), buffer.toString());
                        }
                        buffer.setLength(0);
                        state = State.NEWLINE;
                    } else {
                        state = State.NEWLINE;
                        linestart = i;
                    }
                    break;

                case '[':
                    if (state == State.NEWLINE) {
                        buffer.setLength(0);
                        state = State.LINK_ID;
                    }
                    break;

                case ']':
                    if (state == State.LINK_ID && i < length && chars[i + 1] == ':') {
                        linkid = buffer.toString();
                        buffer.setLength(0);
                        state = State.LINK_URL;
                        i++;
                    }
                    break;

                case '\t':
                case ' ':
                    if (state == State.LINK_URL && buffer.length() > 0) {
                        links.put(linkid.toLowerCase(), buffer.toString());
                        buffer.setLength(0);
                        state = State.LINK_TITLE;
                    } else if (state == State.LINK_ID) {
                        buffer.append(c);
                    }
                    break;

                default:
                    if (state == State.LINK_ID || state == State.LINK_URL) {
                        buffer.append(c);
                    } else if (state == State.NEWLINE) {
                        state = State.NONE;
                    }
                    break;

            }
        }
    }

    private void secondPass() {
        state = State.NEWLINE;
        stack.add(new BaseElement());
        buffer = new StringBuffer();
        boolean escape = false;
        for (int i = 0; i < length; i++) {
            char c = chars[i];
            if (c == '\r') {
                throw new RuntimeException("Got Carriage Return");
            } else if (c == '\n') {
                    if (state == State.HTML_BLOCK &&
                            (i >= length - 1 || chars[i + 1] != '\n')) {
                        buffer.append(c);
                        continue;
                    }
                    if (state == State.HEADER) {
                        Element a = stack.pop();
                        if (a.m > 0) {
                            buffer.setLength(buffer.length() - a.m);
                        }
                        a.close();
                    }
                    if (state == State.LIST && i < length) {
                        checkParagraph(listParagraphs, i);
                    }
                    if (state == State.PARAGRAPH && i < length) {
                        checkParagraph(true, i);
                        i = checkHeader(i);
                    }
                    if (state != State.NEWLINE) {
                        listEndMarker = buffer.length();
                    }
                    buffer.append(c);
                    state = State.NEWLINE;
                    lineMarker = buffer.length();
                    if (i > 0 && chars[i - 1] == '\n')  {
                        paragraphMarker = lineMarker;
                    }
            } else {
                if (c == '\\') {
                    escape = !escape;
                    if (escape) {
                        continue;
                    }
                }

                if (escape) {
                    buffer.append(c);
                    escape = false;
                    continue;
                }
                if (state == State.HEADER) {
                    if (c == '#') {
                        stack.peek().m ++;
                    } else {
                        stack.peek().m = 0;
                    }
                } else if (state == State.NEWLINE) {
                    int k = checkBlock(c, i, 0);
                    if (k > i) {
                        i = k;
                        continue;
                    }
                }
                if (state == State.HTML_BLOCK) {
                    buffer.append(c);
                    continue;
                }
                int j = checkLink(c, i);
                if (j > i) {
                    i = j;
                    continue;
                }
                j = checkEmphasis(c, i);
                if (j > i) {
                    i = j - 1;
                    continue;
                }
                j = checkCodeSpan(c, i);
                if (j > i) {
                    i = j;
                    continue;
                }
                buffer.append(c);
            }
        }
        while (!stack.isEmpty()) {
            stack.pop().close();
        }
    }

    private int checkBlock(char c, int i, int blockquoteNesting) {
        int indentation = 0;
        int j = i;
        while (j < length && isSpace(chars[j])) {
            indentation += c == '\t' ? 4 : 1;
            j += 1;
        }
        if (j < length) {
            c = chars[j];
            int k = checkCodeBlock(i, j, indentation, blockquoteNesting);
            if (k > i) {
                state = State.CODE;
                return k - 1;
            }
            k = checkAtxHeader(c, i);
            if (k > i) {
                state = State.HEADER;
                return k - 1;
            }
            k = checkHorizontalRule(c, j);
            if (k > j) {
                return k;
            }
            k = checkList(c, i, j, indentation, blockquoteNesting);
            if (k > i) {
                state = State.LIST;
                return k;
            }
            k = checkBlockquote(c, i, j, indentation, blockquoteNesting);
            if (k > i) {
                state = State.NEWLINE;
                return checkBlock(chars[k], k, blockquoteNesting + 1);
            }
            if (c == '<') {
                // FIXME we should check for block elements here
                state = State.HTML_BLOCK;
            } else {
                state = State.PARAGRAPH;
            }
        }
        return i;
    }

    private int checkEmphasis(char c, int i) {
        if (c == '*' || c == '_') {
            int n = 1;
            int j = i + 1;
            while(j < length && chars[j] == c && n <= 3) {
                n += 1;
                j += 1;
            }
            if (n % 2 == 1) {
                if (!em && j < length && !Character.isWhitespace(chars[j])) {
                    buffer.append("<em>");
                    em = true;
                } else if (em && !Character.isWhitespace(chars[i - 1])) {
                    buffer.append("</em>");
                    em = false;
                }
            }
            if (n > 1) {
                if (!strong && j < length && !Character.isWhitespace(chars[j])) {
                    buffer.append("<strong>");
                    strong = true;
                } else if (strong && !Character.isWhitespace(chars[i - 1])) {
                    buffer.append("</strong>");
                    strong = false;
                }
            }
            return j;
        }
        return i;
    }

    private int checkCodeSpan(char c, int i) {
        if (c != '`') {
            return i;
        }
        int n = 0; // additional backticks to match
        int j = i + 1;
        StringBuffer code = new StringBuffer();
        while(j < length && chars[j] == '`') {
            n += 1;
            j += 1;
        }
        outer: while(j < length) {
            if (chars[j] == '`') {
                if (n == 0) {
                    break;
                } else {
                    if (j + n >= length) {
                        return i;
                    }
                    for (int k = j + 1; k <= j + n; k++) {
                        if (chars[k] != '`') {
                            break;
                        } else if (k == j + n) {
                            j = k;
                            break outer;
                        }
                    }

                }
            }
            if (chars[j] == '&') {
                code.append("&amp;");
            } else if (chars[j] == '<') {
                code.append("&lt;");
            } else if (chars[j] == '>') {
                code.append("&gt;");
            } else {
                code.append(chars[j]);
            }
            j += 1;
        }
        buffer.append("<code>").append(code).append("</code>");
        return j;
    }

    private int checkLink(char c, int i) {
        if (c != '[') {
            return i;
        }
        StringBuffer b = new StringBuffer();
        int j = i + 1;
        boolean escape = false;
        while (j < length && (escape || chars[j] != ']')) {
            if (chars[j] == '\n') {
                return i;
            }
            escape = chars[j] == '\\' && !escape;
            if (!escape) {
                b.append(chars[j]);
            }
            j += 1;
        }
        String text = b.toString();
        b.setLength(0);
        String href;
        int k = j;
        j += 1;
        while (j < length && Character.isWhitespace(chars[j])) {
            j += 1;
        }
        c = chars[j++];
        if (c == '[') {
            while (j < length && chars[j] != ']') {
                if (chars[j] == '\n') {
                    return i;
                }
                b.append(chars[j]);
                j += 1;
            }
            href = b.toString().toLowerCase();
            if (href.length() > 0) {
                if (!links.containsKey(href)) {
                    return i;
                } else {
                    href = links.get(href);
                }
            } else {
                href = text.toLowerCase();
                if (!links.containsKey(href)) {
                    return i;
                } else {
                    href = links.get(href);
                }
            }
        } else if (c == '(') {
            while (j < length && chars[j] != ')') {
                if (chars[j] == '\n') {
                    return i;
                }
                b.append(chars[j]);
                j += 1;
            }
            href = b.toString();
        } else {
            j = k;
            href = text.toLowerCase();
            if (!links.containsKey(href)) {
                return i;
            } else {
                href = links.get(href);
            }
        }
        buffer.append("<a href=\"").append(href).append("\">")
                .append(text).append("</a>");
        return j;
    }

    private int checkList(char c, int i, int j, int indentation, int blockquoteNesting) {
        int nesting = indentation / 4 + blockquoteNesting;
        if (c >= '0' && c <= '9') {
            while (j < length && chars[j] >= '0' && chars[j] <= '9' ) {
                j += 1;
            }
            if (j < length && chars[j] == '.') {
                checkCloseList("ol", nesting);
                checkOpenList("ol", nesting);
                return j + 1;
            }
        } else if (c == '*' || c == '+' || c == '-') {
            j += 1;
            if (j < length && (chars[j] == ' ' || chars[j] == '\t')) {
                checkCloseList("ul", nesting);
                checkOpenList("ul", nesting);
                return j;
            }
        }
        if (lineMarker == paragraphMarker) {
            checkCloseList(null, nesting - 1);
        }
        return i;
    }

    private void checkOpenList(String tag, int nesting) {
        ListElement list = stack.peekList();
        if (list == null || !tag.equals(list.tag) || nesting != list.nesting) {
            list = new ListElement(tag, nesting);
            stack.push(list);
            list.open();
        } else {
            stack.closeElementsExclusive(list);
            buffer.insert(listEndMarker, "</li>");
        }
        buffer.append("<li>");
        listParagraphs = lineMarker == paragraphMarker;
        lineMarker = paragraphMarker = buffer.length();
    }

    private void checkCloseList(String tag, int nesting) {
        Element elem = stack.peekList();
        while (elem != null &&
                (elem.nesting > nesting ||
                (elem.nesting == nesting && tag != null && !elem.tag.equals(tag)))) {
            stack.closeElements(elem);
            elem = stack.peekNestedElement();
            lineMarker = paragraphMarker = buffer.length();
        }
    }

    private int checkCodeBlock(int i, int j, int indentation, int blockquoteNesting) {
        int nesting = indentation / 4;
        nesting -= stack.countNestedLists();
        if (nesting <= 0) {
            if (stack.peek() instanceof CodeElement && stack.peek().m == blockquoteNesting) {
                Element code = stack.pop();
                code.close();
                lineMarker = paragraphMarker = buffer.length();
            }
            return i;
        }
        Element code = stack.peek();
        if (!(code instanceof CodeElement)) {
            code = new CodeElement(nesting, blockquoteNesting);
            code.open();
            stack.push(code);
        }
        for (int k = code.nesting * 4; k < indentation; k++) {
            buffer.append(' ');
        }
        while(j < length && chars[j] != '\n') {
            if (chars[j] == '&') {
                buffer.append("&amp;");
            } else if (chars[j] == '<') {
                buffer.append("&lt;");
            } else if (chars[j] == '>') {
                buffer.append("&gt;");
            } else {
                buffer.append(chars[j]);
            }
            j += 1;
        }
        codeEndMarker = buffer.length();
        return j;
    }

    private int checkBlockquote(char c, int i, int j, int indentation, int blockquoteNesting) {
        int nesting = indentation / 4 + blockquoteNesting;
        if (c != '>') {
            Element elem = stack.findNestedElement(nesting);
            if (elem instanceof BlockquoteElement) {
                stack.closeElements(elem);
                lineMarker = paragraphMarker = buffer.length();
            }
            return i;
        }

        Element elem = stack.findNestedElement(nesting);
        if (elem != null && !(elem instanceof BlockquoteElement)) {
            stack.closeElements(elem);
            elem = null;
        }
        if (elem == null) {
            elem = new BlockquoteElement(nesting);
            elem.open();
            stack.push(elem);
        }
        lineMarker = paragraphMarker = buffer.length();
        return j + 1;
    }


    private void checkParagraph(boolean paragraphs, int i) {
        if (paragraphs && chars[i + 1] == '\n') {
            buffer.insert(paragraphMarker, "<p>");
            buffer.append("</p>");
        } else if (i > 1 && isSpace(chars[i -1]) && isSpace(chars[i - 2])) {
            buffer.append("<br />");
        }
    }

    private int checkAtxHeader(char c, int i) {
        if (c == '#') {
            int nesting = 1;
            int j = i + 1;
            while (j < length && chars[j++] == '#') {
                nesting += 1;
            }
            HeaderElement header = new HeaderElement(nesting);
            header.open();
            stack.push(header);
            return j;
        }
        return i;
    }

    private int checkHeader(int i) {
        if (chars[i + 1] == '-') {
            int j = i + 1;
            while (j < length && chars[j] == '-') {
                j++;
            }
            if (j < length && chars[j] == '\n') {
                buffer.insert(lineMarker, "<h2>");
                buffer.append("</h2>");
                return j;
            }
        } else if (chars[i + 1] == '=') {
            int j = i + 1;
            while (j < length && chars[j] == '=') {
                j++;
            }
            if (j < length && chars[j] == '\n') {
                buffer.insert(lineMarker, "<h1>");
                buffer.append("</h1>");
                return j;
            }
        }
        return i;
    }

    private int checkHorizontalRule(char c, int i) {
        if (c != '*' && c != '-') {
            return i;
        }
        int j = i + 1;
        while (j < length && (isSpace(chars[j]) || chars[j] == c)) {
            j += 1;
        }
        if (j == length || chars[j] == '\n') {
            buffer.append("<hr />");
            return j - 1;
        }
        return i;
    }

    private void cleanup() {
        links = null;
        chars = null;
        buffer = null;
        stack = null;
    }

    boolean isSpace(char c) {
        return c == ' ' || c == '\t';
    }

    class ElementStack extends Stack<Element> {
        private static final long serialVersionUID = 8514510754511119691L;

        private ListElement peekList() {
            int i = size() - 1;
            while(i > 0) {
                Element elem = get(i);
                if (elem instanceof ListElement) {
                    return (ListElement) elem;
                }
                i -= 1;
            }
            return null;
        }

        private int countNestedLists() {
            int count = 0;
            int i = size() - 1;
            while(i > 0) {
                Element elem = get(i);
                if (elem instanceof ListElement) {
                    count += 1;
                } else if (elem instanceof BlockquoteElement) {
                    break;
                }
                i -= 1;
            }
            return count;
        }

        private Element peekNestedElement() {
            int i = size() - 1;
            while(i > 0) {
                Element elem = get(i);
                if (elem instanceof ListElement || elem instanceof BlockquoteElement) {
                    return elem;
                }
                i -= 1;
            }
            return null;
        }

        private Element findNestedElement(int nesting) {
            for (Element elem: this) {
                if (nesting == elem.nesting &&
                        (elem instanceof ListElement || elem instanceof BlockquoteElement)) {
                    return elem;
                }
            }
            return null;
        }

        private void closeElements(Element element) {
            int initialLength = buffer.length();
            do {
                peek().close();
            } while (pop() != element);
            listEndMarker += buffer.length() - initialLength;
        }

        private void closeElementsExclusive(Element element) {
            int initialLength = buffer.length();
            while(peek() != element) {
                pop().close();
            }
            listEndMarker += buffer.length() - initialLength;
        }
    }

    class Element {
        String tag;
        int nesting, m;

        void open() {
            buffer.append("<").append(tag).append(">");
        }

        void close() {
            buffer.append("</").append(tag).append(">");
        }
    }

    class BaseElement extends Element {
         void open() {}

        void close() {}
    }

    class BlockquoteElement extends Element {
        BlockquoteElement(int nesting) {
            tag = "blockquote";
            this.nesting = nesting;
        }
    }

    class CodeElement extends Element {
        CodeElement(int nesting, int blockquoteNesting) {
            this.nesting = nesting;
            this.m = blockquoteNesting;
        }

        void open() {
            buffer.append("<pre><code>");
        }

        void close() {
            buffer.insert(codeEndMarker, "</code></pre>");
        }
    }

    class HeaderElement extends Element {
        HeaderElement(int nesting) {
            this.nesting = nesting;
            this.tag = "h" + nesting;
        }
    }

    class ListElement extends Element {
        ListElement(String tag, int nesting) {
            this.tag = tag;
            this.nesting = nesting;
        }

        void close() {
            buffer.insert(listEndMarker, "</li></" + tag + ">");
        }
    }

    public static void main(String... args) throws IOException {
        if (args.length != 1) {
            System.err.println("Usage: java org.helma.util.MarkdownProcessor FILE");
            return;
        }
        MarkdownProcessor processor = new MarkdownProcessor(new File(args[0]));
        System.out.println(processor.process());
    }


}

