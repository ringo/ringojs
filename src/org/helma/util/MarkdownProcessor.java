package org.helma.util;

import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.util.*;

public class MarkdownProcessor {

    private HashMap<String,String[]> links = new HashMap<String,String[]>();
    private State state;
    private int i;
    private int length;
    private char[] chars;
    private StringBuffer buffer;
    private int lineMarker = 0;
    private int paragraphStartMarker = 0;
    private int paragraphEndMarker = 0;
    private boolean listParagraphs = false;
    private int listEndMarker = 0;
    private int codeEndMarker = 0;
    private boolean strong, em;
    private ElementStack stack = new ElementStack();

    private String result = null;

    enum State {
        // stage 1 states
        NONE, NEWLINE, LINK_ID, LINK_URL,
        // stage 2 states
        HEADER, PARAGRAPH, LIST, HTML_BLOCK, CODE, BLOCKQUOTE
    }

    static final Set<String> blockTags = new HashSet<String>();

    static {
        blockTags.add("p");
        blockTags.add("div");
        blockTags.add("h1");
        blockTags.add("h2");
        blockTags.add("h3");
        blockTags.add("h4");
        blockTags.add("h5");
        blockTags.add("h6");
        blockTags.add("blockquote");
        blockTags.add("pre");
        blockTags.add("table");
        blockTags.add("dl");
        blockTags.add("ol");
        blockTags.add("ul");
        blockTags.add("script");
        blockTags.add("noscript");
        blockTags.add("form");
        blockTags.add("fieldset");
        blockTags.add("iframe");
        blockTags.add("math");
    }

    public MarkdownProcessor() {}

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

    public synchronized String process(String text) {
        length = text.length();
        chars = new char[length + 2];
        text.getChars(0, length, chars, 0);
        chars[length] = chars[length + 1] = '\n';
        return process();
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
    * Retrieve a link defined in the source text. If the link is not found, we call
    * lookupLink(String) to retrieve it from an external source.
    * @param linkId the link id
    * @return a String array with the url as first element and the link title as second.
    */
    protected String[] getLink(String linkId) {
        String[] link =  links.get(linkId);
        if (link == null) {
            link = lookupLink(linkId);
        }
        return link;
    }

    /**
     * Method to override for extended link lookup, e.g. for integration into a wiki
     * @param linkId the link id
     * @return a String array with the url as first element and the link title as second.
     */
    protected String[] lookupLink(String linkId) {
        return null;
    }

    /**
     * First pass: extract links definitions and remove them from the source text.
     */
    private synchronized void firstPass() {
        State state = State.NEWLINE;
        int linestart = 0;
        int indentation = 0;
        int indentationChars = 0;
        String linkId = null;
        String[] linkValue = null;
        StringBuffer buffer = new StringBuffer();
        for (int i = 0; i < length; i++) {
            // convert \r\n and \r newlines to \n
            if (chars[i] == '\r') {
                if (i < length && chars[i + 1] == '\n') {
                    System.arraycopy(chars, i + 1, chars, i, (length - i) - 1);
                    length -= 1;
                } else {
                    chars[i] = '\n';
                }
            }
        }

        for (int i = 0; i < length; i++) {
            char c = chars[i];

            switch (state) {
                case NEWLINE:
                    if (c == '[') {
                        state = State.LINK_ID;
                    } else if (isSpace(c)) {
                        indentation += (c == '\t') ? 4 : 1;
                        if (indentation > 3) {
                            state = State.NONE;
                        }
                    } else {
                        state = State.NONE;
                    }
                    break;
                case LINK_ID:
                    if (c == ']') {
                        if (i < length - 1 && chars[i + 1] == ':') {
                            linkId = buffer.toString();
                            linkValue = new String[2];
                            state = State.LINK_URL;
                            i++;
                        } else {
                            state = State.NONE;
                        }
                        buffer.setLength(0);
                    } else {
                        buffer.append(c);
                    }
                    break;
                case LINK_URL:
                    if (c == '<' && buffer.length() == 0) {
                        continue;
                    } else if ((Character.isWhitespace(c) || c == '>') && buffer.length() > 0) {
                        linkValue[0] = buffer.toString().trim();
                        buffer.setLength(0);
                        int j = i + 1;
                        int newlines = 0;
                        while (j < length && chars[j] != ')' && Character.isWhitespace(chars[j])) {
                            if (chars[j] == '\n') {
                                newlines += 1;
                                if (newlines > 1) {
                                    break;
                                } else {
                                    i = j;
                                    c = chars[j];
                                }
                            }
                            j += 1;
                        }
                        if ((chars[j] == '"' || chars[j] == '\'' || chars[j] == '(') && newlines <= 1) {
                            char quoteChar = chars[j] == '(' ? ')' : chars[j];
                            int start = j = j + 1;
                            int len = -1;
                            while (j < length && chars[j] != '\n') {
                                if (chars[j] == quoteChar) {
                                    len = j - start;
                                } else if (len > -1 && !isSpace(chars[j])) {
                                    len = -1;
                                }
                                j += 1;
                            }
                            if (len > -1) {
                                linkValue[1] = new String(chars, start, len);
                                i = j;
                                c = chars[j];
                            }
                        }
                        if (c == '\n') {
                            links.put(linkId.toLowerCase(), linkValue);
                            System.arraycopy(chars, i, chars, linestart, length - i);
                            Arrays.fill(chars, length - (i - linestart), length, (char) 0);
                            length -= (i - linestart);
                            i = linestart;
                            buffer.setLength(0);
                            linkId = null;
                        }
                    } else {
                        buffer.append(c);
                    }
            }

            if (c == '\n') {
                if (state == State.NEWLINE && indentationChars > 0) {
                    System.arraycopy(chars, i, chars, i - indentationChars, length - i);
                    Arrays.fill(chars, length - indentationChars, length, (char) 0);
                    length -= indentationChars;
                }
                state = State.NEWLINE;
                linestart = i;
                indentation = indentationChars = 0;
            }

        }
        /* for (Map.Entry<String, String[]> entry: links.entrySet())
            System.err.println(entry.getKey() + " > " + entry.getValue()[0]); */
    }

    private synchronized void secondPass() {
        state = State.NEWLINE;
        stack.add(new BaseElement());
        buffer = new StringBuffer((int) (length * 1.2));
        // System.err.println("BUFFER ALLOC: " + buffer.capacity());
        boolean escape = false;

        for (i = 0; i < length; ) {
            char c = chars[i];

            if (escape) {
                buffer.append(c);
                escape = false;
                i += 1;
                continue;
            } else if (c == '\\') {
                escape = true;
                i += 1;
                continue;
            }

            if (state == State.NEWLINE) {
                checkBlock(0);
            }

            while (i < length && chars[i] != '\n') {

                c = chars[i];

                if (state == State.HTML_BLOCK) {
                    buffer.append(c);
                    i += 1;
                    continue;
                }

                if (escape) {
                    buffer.append(c);
                    escape = false;
                    i += 1;
                    continue;
                } else if (c == '\\') {
                    escape = true;
                    i += 1;
                    continue;
                }
                
                switch (c) {
                    case '[':
                        if (checkLink(c)) {
                            continue;
                        }
                        break;

                    case '!':
                        if (checkImage()) {
                            continue;
                        }
                        break;

                    case '*':
                    case '_':
                        if (checkEmphasis(c)) {
                            continue;
                        }
                        break;

                    case '`':
                        if (checkCodeSpan(c)) {
                            continue;
                        }
                        break;

                    case '<':
                        if (checkHtmlLink(c)) {
                            continue;
                        }
                        break;
                }

                if (state == State.HEADER) {
                    if (c == '#') {
                        stack.peek().m ++;
                    } else {
                        stack.peek().m = 0;
                    }
                }

                buffer.append(c);
                i += 1;

            }
            int bufLen = buffer.length();
            paragraphEndMarker = bufLen > 0 && buffer.charAt(bufLen - 1) == '\n' ?
                    bufLen - 1 : bufLen;


            while (i < length && chars[i] == '\n') {

                c = chars[i];

                // System.err.println("   newline: " + state);
                if (state == State.HTML_BLOCK &&
                        (i >= length - 1 || chars[i + 1] != '\n')) {
                    buffer.append(c);
                    i += 1;
                    continue;
                }
                if (state == State.HEADER) {
                    Element a = stack.pop();
                    if (a.m > 0) {
                        buffer.setLength(buffer.length() - a.m);
                    }
                    a.close();
                }

                bufLen = buffer.length();
                boolean markParagraph = bufLen > 0 && buffer.charAt(bufLen - 1) == '\n';

                if (state == State.LIST && i < length) {
                    checkParagraph(listParagraphs);
                }
                if (state == State.PARAGRAPH && i < length) {
                    checkParagraph(true);
                    checkHeader();
                } else 
                if (state != State.NEWLINE) {
                    listEndMarker = buffer.length();
                }
                buffer.append(c);
                state = State.NEWLINE;
                lineMarker = buffer.length();
                // if (i > 0 && chars[i - 1] == '\n')  {
                if (markParagraph) {
                    paragraphStartMarker = lineMarker;
                }
                i += 1;

            }

        }
        while (!stack.isEmpty()) {
            stack.pop().close();
        }
    }

    private boolean checkBlock(int blockquoteNesting) {
        int indentation = 0;
        int j = i;
        while (j < length && isSpace(chars[j])) {
            indentation += chars[j] == '\t' ? 4 : 1;
            j += 1;
        }

        if (j < length) {
            char c = chars[j];

            if (checkCodeBlock(j, indentation, blockquoteNesting)) {
                return true;
            }

            if (checkBlockquote(c, j, indentation, blockquoteNesting)) {
                return true;
            }
            
            if (checkList(c, j, indentation, blockquoteNesting)) {
                return true;
            }

            if (checkAtxHeader(c, j)) {
                return true;
            }

            if (!checkHtmlBlock(c, j)) {
                state = State.PARAGRAPH;
            }
        }
        return false;
    }

    private boolean checkEmphasis(char c) {
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
            i = j;
            return true;
        }
        return false;
    }

    private boolean checkCodeSpan(char c) {
        if (c != '`') {
            return false;
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
                        return false;
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
        i = j + 1;
        return true;
    }

    private boolean checkLink(char c) {
        return checkLinkInternal(c, i + 1, false);
    }

    private boolean checkImage() {
        return checkLinkInternal(chars[i + 1], i + 2,  true);
    }

    private boolean checkLinkInternal(char c, int j, boolean isImage) {
        if (c != '[') {
            return false;
        }
        StringBuffer b = new StringBuffer();
        boolean escape = false;
        boolean space = false;
        int nesting = 0;
        while (j < length && (escape || chars[j] != ']' || nesting != 0)) {
            if (chars[j] == '\n' && chars[j - 1] == '\n') {
                return false;
            }
            escape = chars[j] == '\\' && !escape;
            if (!escape) {
                if (chars[j] == '[') {
                    nesting += 1;
                } else if (chars[j] == ']') {
                    nesting -= 1;
                }
                boolean s = Character.isWhitespace(chars[j]);
                if (!space || !s) {
                    b.append(s ? ' ' : chars[j]);
                }
                space = s;
            }
            j += 1;
        }
        String text = b.toString();
        b.setLength(0);
        String[] link;
        String linkId;
        int k = j;
        j += 1;
        while (j < length && Character.isWhitespace(chars[j])) {
            j += 1;
        }
        c = chars[j++];
        if (c == '[') {
            while (j < length && chars[j] != ']') {
                if (chars[j] == '\n') {
                    return false;
                }
                b.append(chars[j]);
                j += 1;
            }
            linkId = b.toString().toLowerCase();
            if (linkId.length() > 0) {
                link = getLink(linkId);
                if (link == null) {
                    return false;
                }
            } else {
                linkId = text.toLowerCase();
                link = getLink(linkId);
                if (link == null) {
                    return false;
                }
            }
        } else if (c == '(') {
            link = new String[2];
            while (j < length && chars[j] != ')' && !isSpace(chars[j])) {
                if (chars[j] == '\n') {
                    return false;
                }
                b.append(chars[j]);
                j += 1;
            }
            link[0] = b.toString();
            if (j < length && chars[j] != ')') {
                while (j < length && chars[j] != ')' && Character.isWhitespace(chars[j])) {
                    j += 1;
                }
                if (chars[j] == '"') {
                    int start = j = j + 1;
                    int len = -1;
                    while (j < length && chars[j] != '\n') {
                        if (chars[j] == '"') {
                            len = j - start;
                        } else if (len > -1) {
                            if (chars[j] == ')') {
                                link[1] = new String(chars, start, len);
                                break;
                            } else if (!isSpace(chars[j])) {
                                len = -1;
                            }
                        }
                        j += 1;
                    }
                }
                if (chars[j] != ')') {
                    return false;
                }
            }
        } else {
            j = k;
            linkId = text.toLowerCase();
            link = getLink(linkId);
            if (link == null) {
                return false;
            }
        }
        if (isImage) {
            buffer.append("<img src=\"").append(escapeHtml(link[0])).append("\"");
            buffer.append(" alt=\"").append(escapeHtml(text)).append("\"");
            if (link[1] != null) {
                buffer.append(" title=\"").append(escapeHtml(link[1])).append("\"");
            }
            buffer.append(" />");

        } else {
            buffer.append("<a href=\"").append(escapeHtml(link[0])).append("\"");
            if (link[1] != null) {
                buffer.append(" title=\"").append(escapeHtml(link[1])).append("\"");
            }
            buffer.append(">").append(escapeHtml(text)).append("</a>");
        }
        i = j + 1;
        return true;
    }

    private boolean checkHtmlLink(char c) {
        if (c != '<') {
            return false;
        }
        int k = i + 1;
        int j = k;
        while (j < length && !Character.isWhitespace(chars[j]) && chars[j] != '>') {
            j += 1;
        }
        if (chars[j] == '>') {
            String href = new String(chars, k, j - k);
            if (href.matches("\\w+:\\S*")) {
                if (href.startsWith("mailto:")) {
                    href = escapeMailtoUrl(href);
                }
                buffer.append("<a href=\"").append(href).append("\">")
                        .append(href).append("</a>");
                i = j + 1;
                return true;
            }
        }
        return false;
    }

    private boolean checkList(char c, int j, int indentation, int blockquoteNesting) {
        int nesting = indentation / 4 + blockquoteNesting;
        if (c >= '0' && c <= '9') {
            while (j < length && chars[j] >= '0' && chars[j] <= '9' ) {
                j += 1;
            }
            if (j < length && chars[j] == '.') {
                checkCloseList("ol", nesting);
                checkOpenList("ol", nesting);
                i = j + 1;
                return true;
            }
        } else if (c == '*' || c == '+' || c == '-') {
            if (c != '+') {
                if (checkHorizontalRule(c, j)) {
                    return true;
                }
            }
            j += 1;
            if (j < length && isSpace(chars[j])) {
                checkCloseList("ul", nesting);
                checkOpenList("ul", nesting);
                i = j;
                return true;
            }
        }
        if (isParagraphStart()) {
            // never close list unless there's an empty line
            checkCloseList(null, nesting - 1);
        }
        return false;
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
        listParagraphs = isParagraphStart();
        lineMarker = paragraphStartMarker = buffer.length();
        state = State.LIST;
    }

    private void checkCloseList(String tag, int nesting) {
        Element elem = stack.peekList();
        while (elem != null &&
                (elem.nesting > nesting ||
                (elem.nesting == nesting && tag != null && !elem.tag.equals(tag)))) {
            stack.closeElements(elem);
            elem = stack.peekNestedElement();
            lineMarker = paragraphStartMarker = buffer.length();
        }
    }

    private boolean checkCodeBlock(int j, int indentation, int blockquoteNesting) {
        int nesting = indentation / 4;
        nesting -= stack.countNestedLists();
        if (nesting <= 0) {
            if (stack.peek() instanceof CodeElement && stack.peek().m == blockquoteNesting) {
                Element code = stack.pop();
                code.close();
                lineMarker = paragraphStartMarker = buffer.length();
            }
            return false;
        }
        Element code = stack.peek();
        if (!(code instanceof CodeElement)) {
            code = new CodeElement(nesting, blockquoteNesting);
            code.open();
            stack.push(code);
        }
        if (blockquoteNesting > 0) {
            // FIXME adjust indentation for blockquoted code blocks
            indentation -= 1;
        }
        for (int k = 4; k < indentation; k++) {
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
        i = j;
        state = State.CODE;
        return true;
    }

    private boolean checkBlockquote(char c, int j, int indentation, int blockquoteNesting) {
        int nesting = indentation / 4 + blockquoteNesting;
        if (c != '>' && isParagraphStart()) {
            Element elem = stack.findNestedElement(nesting);
            if (elem instanceof BlockquoteElement) {
                stack.closeElements(elem);
                lineMarker = paragraphStartMarker = buffer.length();
            }
            return false;
        }

        Element elem = stack.findNestedElement(nesting);
        if (c == '>') {
            if (elem != null && !(elem instanceof BlockquoteElement)) {
                stack.closeElements(elem);
                elem = null;
            }
            if (elem == null) {
                elem = new BlockquoteElement(nesting);
                elem.open();
                stack.push(elem);
                lineMarker = paragraphStartMarker = buffer.length();
            } else {
                lineMarker = buffer.length();
            }
            i = isSpace(chars[j+ 1]) ? j + 2 : j + 1;
            state = State.NEWLINE;
            checkBlock(nesting + 1);
            return true;
        } else {
            return elem instanceof BlockquoteElement;
        }
    }


    private void checkParagraph(boolean paragraphs) {
        if (paragraphs && paragraphEndMarker > paragraphStartMarker &&
                (chars[i + 1] == '\n' || buffer.charAt(buffer.length() - 1) == '\n')) {
            buffer.insert(paragraphEndMarker, "</p>");
            buffer.insert(paragraphStartMarker, "<p>");
            listEndMarker = paragraphEndMarker + 7;
        } else if (i > 1 && isSpace(chars[i -1]) && isSpace(chars[i - 2])) {
            buffer.append("<br />");
        }
    }

    private boolean checkAtxHeader(char c, int j) {
        if (c == '#') {
            int nesting = 1;
            int k = j + 1;
            while (k < length && chars[k++] == '#') {
                nesting += 1;
            }
            HeaderElement header = new HeaderElement(nesting);
            header.open();
            stack.push(header);
            state = State.HEADER;
            i = k - 1;
            return true;
        }
        return false;
    }

    private boolean checkHtmlBlock(char c, int j) {
        if (c == '<') {
            j += 1;
            int k = j;
            while (k < length && Character.isLetterOrDigit(chars[k])) {
                k += 1;
            }
            String tag = new String(chars, j, k - j).toLowerCase();
            if (blockTags.contains(tag)) {
                state = State.HTML_BLOCK;
                return true;
            }
        }
        return false;
    }

    private void checkHeader() {
        if (chars[i + 1] == '-') {
            int j = i + 1;
            while (j < length && chars[j] == '-') {
                j++;
            }
            if (j < length && chars[j] == '\n') {
                buffer.insert(lineMarker, "<h2>");
                buffer.append("</h2>");
                i = j;
            }
        } else if (chars[i + 1] == '=') {
            int j = i + 1;
            while (j < length && chars[j] == '=') {
                j++;
            }
            if (j < length && chars[j] == '\n') {
                buffer.insert(lineMarker, "<h1>");
                buffer.append("</h1>");
                i =  j;
            }
        }
    }

    private boolean checkHorizontalRule(char c, int j) {
        if (c != '*' && c != '-') {
            return false;
        }
        int k = j + 1;
        while (k < length && (isSpace(chars[k]) || chars[k] == c)) {
            k += 1;
        }
        if (k == length || chars[k] == '\n') {
            buffer.append("<hr />");
            i = k - 1;
            return true;
        }
        return false;
    }

    private void cleanup() {
        links = null;
        chars = null;
        buffer = null;
        stack = null;
    }

    private String escapeHtml(String str) {
        if (str.indexOf('"') > -1) {
            str = str.replace("\"", "&quot;");
        }
        if (str.indexOf('<') > -1) {
            str = str.replace("\"", "&lt;");
        }
            if (str.indexOf('>') > -1) {
            str = str.replace("\"", "&gt;");
        }
        return str;
    }

    private String escapeMailtoUrl(String str) {
        StringBuffer b = new StringBuffer();
        for (char c: str.toCharArray()) {
            b.append("&#x").append(Integer.toString(c, 16)).append(";");
        }
        return b.toString();
    }

    boolean isSpace(char c) {
        return c == ' ' || c == '\t';
    }

    boolean isParagraphStart() {
        return paragraphStartMarker == lineMarker;
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
            int l = buffer.length();
            while(l > 0 && buffer.charAt(l - 1) == '\n') {
                l -= 1;
            }
            buffer.insert(l, "</" + tag + ">");
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

