package org.helma.util;

import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Stack;

public class MarkdownProcessor {

    private HashMap<String,String> links = new HashMap<String,String>();
    private int length;
    private char[] chars;
    private StringBuffer buffer;
    private int lineMarker = 0;
    private int paragraphMarker = 0;
    private boolean listParagraphs = false;
    private int listEndMarker = 0;
    private int codeEndMarker = 0;
    private boolean strong, em;
    private Context stack = new Context();

    private String result = null;

    enum State {
        NONE, NEWLINE, LINK_ID, LINK_URL, LINK_TITLE, HEADER_PREFIX, HEADER_MAIN, PARAGRAPH, LIST, HTML_BLOCK, CODE
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
        State state = State.NEWLINE;
        stack.add(new BaseElement());
        buffer = new StringBuffer();
        StringBuffer subBuffer = new StringBuffer();
        boolean escape = false;
        for (int i = 0; i < length; i++) {
            char c = chars[i];
            switch (c) {
                case '\r':
                    throw new RuntimeException("Got Carriage Return");
                    
                case '\n':
                    if (state == State.HTML_BLOCK &&
                            (i >= length - 1 || chars[i + 1] != '\n')) {
                        buffer.append(c);
                        break;
                    }
                    if (state == State.HEADER_MAIN) {
                        BlockElement a = stack.pop();
                        if (a.m >= a.nesting) {
                            buffer.setLength(buffer.length() - a.m);
                        }
                        buffer.append(a.endTag());
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
                    break;

                case '\\':
                    escape = !escape;
                    if (escape) {
                        break;
                    }

                default:
                    if (state == State.LINK_TITLE || state == State.LINK_ID) {
                        subBuffer.append(c);
                        break;
                    }
                    if (escape) {
                        buffer.append(c);
                        escape = false;
                        break;
                    }
                    if (state == State.HEADER_PREFIX) {
                        if (c == '#') {
                            stack.peek().nesting++;
                            break;
                        }
                        buffer.append(stack.peek().startTag());
                        state = State.HEADER_MAIN;
                    } else if (state == State.HEADER_MAIN) {
                        if (c == '#') {
                            stack.peek().m ++;
                        } else {
                            stack.peek().m = 0;
                        }
                    } else if (state == State.NEWLINE) {
                        int indentation = 0;
                        int j = i;
                        while (j < length && isSpace(chars[j])) {
                            indentation += c == '\t' ? 4 : 1;
                            j += 1;
                        }
                        if (j < length) {
                            c = chars[j];
                            int k = checkCodeBlock(i, j, indentation / 4);
                            if (k > i) {
                                i = k - 1;
                                state = State.CODE;
                                break;
                            }
                            k = checkHorizontalRule(c, j);
                            if (k > j) {
                                i = k;
                                break;
                            }
                            k = checkList(c, i, j, indentation / 4);
                            if (k > i) {
                                i = k;
                                state = State.LIST;
                                break;
                            }
                            if (indentation == 0) {
                                if (c == '#') {
                                    stack.push(new HeaderElement());
                                    state = State.HEADER_PREFIX;
                                    break;
                                }
                            }
                            state = State.PARAGRAPH;
                            i = j;
                        }
                        if (c == '<') {
                            // FIXME we should check for block elements here
                            state = State.HTML_BLOCK;
                        }
                    }
                    if (state == State.HTML_BLOCK) {
                        buffer.append(c);
                        break;
                    }
                    int j = checkLink(c, i);
                    if (j > i) {
                        i = j;
                        break;
                    }
                    j = checkEmphasis(c, i);
                    if (j > i) {
                        i = j - 1;
                        break;
                    }
                    j = checkCodeSpan(c, i);
                    if (j > i) {
                        i = j;
                        break;
                    }
                    buffer.append(c);
                    break;
            }
        }
        while (!stack.isEmpty()) {
            buffer.append(stack.pop().endTag());
        }
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

    private int checkList(char c, int i, int j, int nesting) {
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
            return i;
        }
        return j - 1;
    }

    private void checkOpenList(String tag, int nesting) {
        ListElement list = stack.peekList();
        if (list == null || !tag.equals(list.tag) || nesting != list.nesting) {
            list = new ListElement(tag, nesting);
            stack.push(list);
            buffer.append(list.startTag());
        } else {
            buffer.insert(listEndMarker, "</li>");
        }
        buffer.append("<li>");
        listParagraphs = lineMarker == paragraphMarker;
        lineMarker = paragraphMarker = buffer.length();
    }

    private void checkCloseList(String tag, int nesting) {
        ListElement list = stack.peekList();
        while (list != null &&
                (list.nesting > nesting ||
                (list.nesting == nesting && tag != null && !list.tag.equals(tag)))) {
            buffer.insert(listEndMarker, list.endTag());
            listEndMarker += list.endTag().length();
            stack.pop();
            list = stack.peekList();
            lineMarker = paragraphMarker = buffer.length();
        }
    }

    private int checkCodeBlock(int i, int j, int nesting) {
        for (int s = stack.size() - 1; s > 0; s--) {
            if (stack.get(s) instanceof ListElement) {
                nesting -= 1;
            }
        }
        if (nesting <= 0) {
            if (stack.peek() instanceof CodeElement) {
                BlockElement code = stack.pop();
                buffer.insert(codeEndMarker, code.endTag());
                lineMarker = paragraphMarker = buffer.length();
            }
            return i;
        }
        if (!(stack.peek() instanceof CodeElement)) {
            BlockElement code = new CodeElement();
            buffer.append(code.startTag());
            stack.push(code);
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

    private void checkParagraph(boolean paragraphs, int i) {
        if (paragraphs && chars[i + 1] == '\n') {
            buffer.insert(paragraphMarker, "<p>");
            buffer.append("</p>");
        } else if (i > 1 && isSpace(chars[i -1]) && isSpace(chars[i - 2])) {
            buffer.append("<br />");
        }
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

    class Context extends Stack<BlockElement> {
        private static final long serialVersionUID = 8514510754511119691L;

        ListElement peekList() {
            if (isEmpty()) {
                return null;
            }
            int i = size() - 1;
            while(i > 0) {
                if (get(i) instanceof ListElement) {
                    return (ListElement) get(i);
                }
                i -= 1;
            }
            return null;
        }
    }

    class BlockElement {
        String tag;
        int nesting, m;

        String startTag() {
            return "<" + tag + ">";
        }

        String endTag() {
            return "</" + tag + ">";
        }
    }

    class BaseElement extends BlockElement {
        String startTag() {
            return "";
        }

        String endTag() {
            return "";
        }
    }

    class CodeElement extends BlockElement {
        String startTag() {
            return "<pre><code>";
        }

        String endTag() {
            return "</code></pre>";
        }
    }

    class HeaderElement extends BlockElement {
        HeaderElement() {
            nesting = 1;
        }

        String startTag() {
            return "<h" + nesting + ">";
        }

        String endTag() {
            return "</h" + nesting + ">";
        }
    }

    class ListElement extends BlockElement {
        ListElement(String tag, int nesting) {
            this.tag = tag;
            this.nesting = nesting;
        }

        String endTag() {
            return "</li>" + super.endTag();
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

