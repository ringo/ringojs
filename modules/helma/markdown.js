
try {
    var log = require('helma.logging').getLogger(__name__);
} catch (error) {
    // logging module not available
}

function MarkdownProcessor(stringOrResource) {

    var self = this;
    var links = {};
    var state = 0;
    var i = 0;
    var buffer;
    var lineMarker = 0;
    var paragraphStartMarker = 0;
    var listParagraphs = false;
    var codeEndMarker = 0;
    var stack, spanTags;
    var line;
    var debug = false;

    var chars = (stringOrResource + "\n\n").split('');
    var length = chars.length;

    var result;

    const State = {
        NONE: 0,
        NEWLINE: 1,
        LINK_ID: 2,
        LINK_URL: 3,
        HEADER: 4,
        PARAGRAPH: 5,
        LIST: 6,
        HTML_BLOCK: 7,
        CODE: 8,
        BLOCKQUOTE: 9
    };

    const blockTags = {
        p: 1,
        div: 1,
        h1: 1,
        h2: 1,
        h3: 1,
        h4: 1,
        h5: 1,
        h6: 1,
        blockquote: 1,
        pre: 1,
        table: 1,
        dl: 1,
        ol: 1,
        ul: 1,
        script: 1,
        noscript: 1,
        form: 1,
        fieldset: 1,
        iframe: 1,
        math: 1
    };

    const NEWLINE = '\n'.charCodeAt(0);


    this.process = function process() {
        firstPass();
        secondPass();
        return result;
    }

    /**
     * Retrieve a link defined in the source text. If the link is not found, we call
     * lookupLink(String) to retrieve it from an external source.
     * @param linkId the link id
     * @return a String array with the url as first element and the link title as second.
     */
     this.getLink = function(linkId) {
         link =  links[linkId];
         if (!link) {
             link = this.lookupLink(linkId);
         }
         return link;
     }

     /**
      * Method to override for extended link lookup, e.g. for integration into a wiki
      * @param linkId the link id
      * @return a String array with the url as first element and the link title as second.
      */
     this.lookupLink = function(linkId) {
         return null;
     }

    /**
     * First pass: extract links definitions and remove them from the source text.
     */
    function firstPass() {
        var state = State.NEWLINE;
        var linestart = 0, indentation = 0;
        var indentationChars = 0;
        var linkId, linkValue;
        // var buffer = new Buffer();
        var bufferStart = 0;
        for (i = 0; i < length; i++) {
            // convert \r\n and \r newlines to \n
            if (chars[i] == '\r') {
                if (i < length - 1 && chars[i + 1] == '\n') {
                    chars.splice(i, 1);
                    length -= 1;
                } else {
                    chars[i] = '\n';
                }
            }
        }

        for (i = 0; i < length; i++) {
            var c = chars[i];

            switch (state) {
            case State.NEWLINE:
                if (c == '[' && indentation < 4) {
                    state = State.LINK_ID;
                    bufferStart = i + 1;
                } else if (isSpace(c)) {
                    indentationChars += 1;
                    indentation += (c == '\t') ? 4 : 1;
                } else if (c == '\n' && indentationChars > 0) {
                    chars.splice(i - indentationChars, indentationChars);
                    i -= indentationChars;
                    length -= indentationChars;
                } else {
                    state = State.NONE;
                }
                break;

            case State.LINK_ID:
                if (c == ']') {
                    if (i < length - 1 && chars[i + 1] == ':') {
                        linkId = chars.slice(bufferStart, i).join('');
                        linkValue = [];
                        state = State.LINK_URL;
                        bufferStart = i + 2;
                        i++;
                    } else {
                        state = State.NONE;
                    }
                }
                break;

            case State.LINK_URL:
                if (c == '<' && i == bufferStart) {
                    continue;
                } else if ((isWhitespace(c) || c == '>') && i > bufferStart) {
                    linkValue[0] = trim(chars.slice(bufferStart, i).join(''));
                    var j = i + 1;
                    var newlines = 0;
                    while (j < length && chars[j] != ')' && isWhitespace(chars[j])) {
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
                        var quoteChar = chars[j] == '(' ? ')' : chars[j];
                        var start = j = j + 1;
                        var len = -1;
                        while (j < length && chars[j] != '\n') {
                            if (chars[j] == quoteChar) {
                                len = j - start;
                            } else if (len > -1 && !isSpace(chars[j])) {
                                len = -1;
                            }
                            j += 1;
                        }
                        if (len > -1) {
                            linkValue[1] = chars.slice(start, start + len).join('');
                            i = j;
                            c = chars[j];
                        }
                    }
                    if (c == '\n') {
                        links[linkId.toLowerCase()] = linkValue;
                        chars.splice(linestart, i - linestart);
                        length -= (i - linestart);
                        i = linestart;
                        linkId = null;
                    }
                }
            }

            if (c == '\n') {
                state = State.NEWLINE;
                linestart = i;
                indentation = indentationChars = 0;
            }
        }
    }

    function secondPass() {
        state = State.NEWLINE;
        stack = new Stack();
        stack.push(new BaseElement());
        spanTags = {};
        buffer = new Buffer();
        line = 1;
        var escape = false;

        for (i = 0; i < length; ) {
            var c;

            if (state == State.NEWLINE) {
                checkBlock(0);
            }

            var leadingSpaceChars = true;

            while (i < length && chars[i] != '\n') {

                c = chars[i];
                leadingSpaceChars = leadingSpaceChars && isSpace(c);

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

                    case '<':
                        if (checkHtmlLink(c)) {
                            continue;
                        }
                        break;

                    case '°':
                        if (debug) {
                            lg("line" + line + ":" + stack);
                            break;
                        }
                }

                if (state == State.HEADER) {
                    if (c == '#') {
                        stack.peek().m ++;
                    } else {
                        stack.peek().m = 0;
                    }
                }

                if (!leadingSpaceChars) {
                    buffer.append(c);
                }
                i += 1;

            }

            while (i < length && chars[i] == '\n') {

                c = chars[i];
                line += 1;

                if (state == State.HTML_BLOCK &&
                        (i >= length - 1 || chars[i + 1] != '\n')) {
                    buffer.append(c);
                    i += 1;
                    continue;
                }
                if (state == State.HEADER) {
                    var header = stack.pop();
                    if (header.m > 0) {
                        buffer.setLength(buffer.length() - header.m);
                    }
                    header.close();
                }

                var bufLen = buffer.length();
                var markParagraph = bufLen > 0 && bufferEndsWith('\n');

                if (state == State.LIST && i < length) {
                    checkParagraph(listParagraphs);
                }
                if (state == State.PARAGRAPH && i < length) {
                    checkParagraph(true);
                    checkHeader();
                } 

                buffer.append(c);
                state = State.NEWLINE;
                lineMarker = buffer.length();

                if (markParagraph) {
                    paragraphStartMarker = lineMarker;
                }
                i += 1;

            }

        }
        while (!stack.isEmpty()) {
            var elem = stack.pop();
            elem.close();
        }
        result = buffer.toString();
    }

    function checkBlock(blockquoteNesting) {
        var indentation = 0;
        var j = i;
        while (j < length && isSpace(chars[j])) {
            indentation += chars[j] == '\t' ? 4 : 1;
            j += 1;
        }

        if (j < length) {
            var c = chars[j];

            if (checkBlockquote(c, j, indentation, blockquoteNesting)) {
                return true;
            }

            if (checkCodeBlock(c, j, indentation, blockquoteNesting)) {
                return true;
            }

            if (checkList(c, j, indentation, blockquoteNesting)) {
                return true;
            }

            if (checkAtxHeader(c, j)) {
                return true;
            }

            if (!checkHtmlBlock(c, j)) {
                state = stack.search(ListElement) ? State.LIST : State.PARAGRAPH;
            }
        }
        return false;
    }

    function checkEmphasis(c) {
        if (c == '*' || c == '_') {
            var n = 1;
            var j = i + 1;
            while(j < length && chars[j] == c) {
                n += 1;
                j += 1;
            }
            var found = n;
            var isStartTag = j < length  - 1 && !isWhitespace(chars[j]);
            var isEndTag = i > 0 && !isWhitespace(chars[i - 1]);
            var hasStrong = spanTags[2] != null;
            var hasEmphasis = spanTags[1] != null;
            if (isStartTag && (!hasStrong || !hasEmphasis)) {
                var matchingEndTags = searchEndTags(hasStrong, hasEmphasis);
                var tryElements = [
                    hasEmphasis ? null : Emphasis,
                    hasStrong || n < 2 ? null : Strong
                ];
                var matchedElements = [];
                for (var l = tryElements.length - 1; l >= 0; l--) {
                    for (var k = 0; k < matchingEndTags.length; k++) {
                        if (matchedElements.length == tryElements.length) {
                            break;
                        }
                        if (n > l && tryElements[l] && matchingEndTags[k] > l) {
                            matchedElements.push(tryElements[l]);
                            n -= l + 1;
                            matchingEndTags[k] -= l + 1;
                            tryElements[l] = null;
                        }
                    }
                }

                while (matchedElements.length > 0) {
                    var ctor = matchedElements.pop();
                    var elem = new ctor();
                    elem.open();
                    spanTags[ctor == Strong ? 2 : 1] = elem;
                }
            }
            if (isEndTag) {
                for  (var z = 2; z > 0; z--) {
                    var elem = spanTags[z];
                    if (elem && elem.m <= n) {
                        delete spanTags[z];
                        elem.close();
                        n -= elem.m;
                    }
                }
            }
            if (n == found) {
                return false;
            }
            for (var m = 0; m < n; m++) {
                buffer.append(c);
            }
            i = j;
            return true;
        }
        return false;

        function searchEndTags() {
            result = [];
            var lastChar;
            var count = 0;
            for (var k = j; k < length; k++) {
                if (chars[k] == '\n' && lastChar == '\n') {
                    break;
                }
                if (chars[k] == c) {
                    count += 1;
                } else {
                    if (count > 0 && !isWhitespace(chars[k - count - 1])) {
                        result.push(count);
                    }
                    count = 0;
                }
                lastChar = chars[k];
            }
            return result;
        };
    }

    function checkCodeSpan(c) {
        if (c != '`') {
            return false;
        }
        var n = 0; // additional backticks to match
        var j = i + 1;
        var code = new Buffer();
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
                    for (var k = j + 1; k <= j + n; k++) {
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
        code = trim(code.toString());
        buffer.append("<code>").append(code).append("</code>");
        i = j + 1;
        return true;
    }

    function checkLink(c) {
        return checkLinkInternal(c, i + 1, false);
    }

    function checkImage() {
        return checkLinkInternal(chars[i + 1], i + 2,  true);
    }

    function checkLinkInternal(c, j, isImage) {
        if (c != '[') {
            return false;
        }
        var b = new Buffer();
        var escape = false;
        var space = false;
        var nesting = 0;
        var needsEncoding = false;
        while (j < length && (escape || chars[j] != ']' || nesting != 0)) {
            c = chars[j]
            if (c == '\n' && chars[j - 1] == '\n') {
                return false;
            }

            if (escape) {
                b.append(c);
                escape = false;
            } else {
                escape = c == '\\';
                if (!escape) {
                    if (c == '[') {
                        nesting += 1;
                    } else if (c == ']') {
                        nesting -= 1;
                    }
                    if (c == '*' || c == '_' || c == '`') {
                        needsEncoding = true;
                    }
                    var s = isWhitespace(chars[j]);
                    if (!space || !s) {
                        b.append(s ? ' ' : c);
                    }
                    space = s;
                }
            }
            j += 1;
        }
        var text = b.toString();
        b.setLength(0);
        var link;
        var linkId;
        var k = j;
        j += 1;
        while (j < length && isWhitespace(chars[j])) {
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
            if (linkId.length > 0) {
                link = self.getLink(linkId);
                if (link == null) {
                    return false;
                }
            } else {
                linkId = text.toLowerCase();
                link = self.getLink(linkId);
                if (link == null) {
                    return false;
                }
            }
        } else if (c == '(') {
            link = [];
            while (j < length && chars[j] != ')' && !isSpace(chars[j])) {
                if (chars[j] == '\n') {
                    return false;
                }
                b.append(chars[j]);
                j += 1;
            }
            link[0] = b.toString();
            if (j < length && chars[j] != ')') {
                while (j < length && chars[j] != ')' && isWhitespace(chars[j])) {
                    j += 1;
                }
                if (chars[j] == '"') {
                    var start = j = j + 1;
                    var len = -1;
                    while (j < length && chars[j] != '\n') {
                        if (chars[j] == '"') {
                            len = j - start;
                        } else if (len > -1) {
                            if (chars[j] == ')') {
                                link[1] = chars.slice(start, start + len).join('');
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
            link = self.getLink(linkId);
            if (link == null) {
                return false;
            }
        }
        b.setLength(0);
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
            buffer.append(">");
            if (needsEncoding) {
                b.append(escapeHtml(text)).append("</a>");
            } else {
                buffer.append(escapeHtml(text)).append("</a>");
            }
        }
        if (buffer.length() > 0) {
            chars = chars.slice(0, i).concat(b.toString().split(''))
                                     .concat(chars.slice(j + 1, length));
        } else {
            chars.splice(i, j - i + 1);
        }
        length = chars.length;
        return true;
    }

    function checkHtmlLink(c) {
        if (c != '<') {
            return false;
        }
        var k = i + 1;
        var j = k;
        while (j < length && !isWhitespace(chars[j]) && chars[j] != '>') {
            j += 1;
        }
        if (chars[j] == '>') {
            var href = chars.slice(k, j).join('');
            if (href.match("\\w+:\\S*")) {
                var text = href;
                if (href.indexOf("mailto:") == 0) {
                    text = href.substring(7);
                    href = escapeMailtoUrl(href);
                }
                buffer.append("<a href=\"").append(href).append("\">")
                        .append(text).append("</a>");
                i = j + 1;
                return true;
            } else if (href.match(/^.+@.+\.[a-zA-Z]+$/)) {
                buffer.append("<a href=\"")
                        .append(escapeMailtoUrl("mailto:" + href)).append("\">")
                        .append(href).append("</a>");
                i = j + 1;
                return true;
            }
        }
        return false;
    }

    function checkList(c, j, indentation, blockquoteNesting) {
        var nesting = Math.floor(indentation / 4) + blockquoteNesting;
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
            if (c != '+' && checkHorizontalRule(c, j, nesting)) {
                return true;
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

    function checkOpenList(tag, nesting) {
        var list = stack.search(ListElement);
        if (list == null || !tag == list.tag || nesting != list.nesting) {
            list = new ListElement(tag, nesting);
            stack.push(list);
            list.open();
        } else {
            stack.closeElementsExclusive(list);
            buffer.insert(getBufferEnd(), "</li>");
        }
        buffer.append("<li>");
        listParagraphs = isParagraphStart();
        lineMarker = paragraphStartMarker = buffer.length();
        state = State.LIST;
    }

    function checkCloseList(tag, nesting) {
        var elem = stack.search(ListElement);
        while (elem &&
                (elem.nesting > nesting ||
                (elem.nesting == nesting && tag && elem.tag != tag))) {
            stack.closeElements(elem);
            elem = stack.peekNestedElement();
            lineMarker = paragraphStartMarker = buffer.length();
        }
    }

    function checkCodeBlock(c, j, indentation, blockquoteNesting) {
        var nesting = Math.floor(indentation / 4);
        var nestedLists = stack.countNestedLists();
        var code;
        if (nesting - nestedLists <= 0) {
            code = stack.findNestedElement(CodeElement, blockquoteNesting + nestedLists);
            if (code) {
                stack.closeElements(code);
                lineMarker = paragraphStartMarker = buffer.length();
            }
            return false;
        }
        code = stack.peek();
        if (!(code instanceof CodeElement)) {
            code = new CodeElement(blockquoteNesting + nestedLists);
            code.open();
            stack.push(code);
        }
        var sub = 4 + nestedLists * 4;
        for (var k = sub; k < indentation; k++) {
            buffer.append(' ');
        }
        while(j < length && chars[j] != '\n') {
            c = chars[j];
            if (c == '&') {
                buffer.append("&amp;");
            } else if (c == '<') {
                buffer.append("&lt;");
            } else if (c == '>') {
                buffer.append("&gt;");
            } else if (c == '\t') {
                buffer.append("   ");
            } else if (c == '°' && debug) {
                lg("line" + line + ":" + stack);
            } else {
                buffer.append(c);
            }
            j += 1;
        }
        codeEndMarker = buffer.length();
        i = j;
        state = State.CODE;
        return true;
    }

    function lg(msg) {
        buffer.append("[" + msg + "]");
    }

    function checkBlockquote(c, j, indentation, blockquoteNesting) {
        var nesting = Math.floor(indentation / 4);
        var elem = stack.findNestedElement(BlockquoteElement, nesting + blockquoteNesting);
        if (c != '>' && isParagraphStart() || nesting > stack.countNestedLists(elem)) {
            elem = stack.findNestedElement(BlockquoteElement, blockquoteNesting);
            if (elem) {
                stack.closeElements(elem);
                lineMarker = paragraphStartMarker = buffer.length();
            }
            return false;
        }
        nesting +=  blockquoteNesting;
        elem = stack.findNestedElement(BlockquoteElement, nesting);
        if (c == '>') {
            stack.closeElementsUnlessExists(BlockquoteElement, nesting);
            if (elem != null && !(elem instanceof BlockquoteElement)) {
                stack.closeElements(elem);
                elem = null;
            }
            if (elem == null || elem.nesting < nesting) {
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


    function checkParagraph(paragraphs) {
        var paragraphEndMarker = getBufferEnd();
        if (paragraphs && paragraphEndMarker > paragraphStartMarker &&
                (chars[i + 1] == '\n' || bufferEndsWith('\n'))) {
            var delta = 7;
            buffer.insert(paragraphEndMarker, "</p>");
            buffer.insert(paragraphStartMarker, "<p>");
        }
    }

    function checkAtxHeader(c, j) {
        if (c == '#') {
            var nesting = 1;
            var k = j + 1;
            while (k < length && chars[k++] == '#') {
                nesting += 1;
            }
            var header = new HeaderElement(nesting);
            header.open();
            stack.push(header);
            state = State.HEADER;
            i = k - 1;
            return true;
        }
        return false;
    }

    function checkHtmlBlock(c, j) {
        if (c == '<') {
            j += 1;
            var k = j;
            while (k < length && isLetterOrDigit(chars[k])) {
                k += 1;
            }
            var tag = chars.slice(j, k).join('').toLowerCase();
            if (tag in blockTags) {
                state = State.HTML_BLOCK;
                return true;
            }
        }
        return false;
    }

    function checkHeader() {
        var c = chars[i + 1];
        if (c == '-' || c == '=') {
            var j = i + 1;
            while (j < length && chars[j] == c) {
                j++;
            }
            if (j < length && chars[j] == '\n') {
                if (c == '=') {
                    buffer.insert(lineMarker, "<h1>");
                    buffer.append("</h1>");
                } else {
                    buffer.insert(lineMarker, "<h2>");
                    buffer.append("</h2>");
                }
                i = j;
            }
        }
    }

    function checkHorizontalRule(c, j, nesting) {
        if (c != '*' && c != '-') {
            return false;
        }
        var count = 1;
        var k = j;
        while (k < length && (isSpace(chars[k]) || chars[k] == c)) {
            k += 1;
            if (chars[k] == c) {
                 count += 1;
            }
        }
        if (count >= 3 &&  chars[k] == '\n') {
            checkCloseList(null, nesting - 1);
            buffer.append("<hr />");
            i = k;
            return true;
        }
        return false;
    }


    function escapeHtml(str) {
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

    function escapeMailtoUrl(str) {
        var b = new Buffer();
        for (var c = 0; c < str.length; c++) {
            var random = Math.random();
            if (random < 0.5) {
                b.append("&#x").append(str.charCodeAt(c).toString(16)).append(";");
            } else if (random < 0.9) {
                b.append("&#").append(str.charCodeAt(c).toString(10)).append(";");
            } else {
                b.append(str.charAt(c));
            }
        }
        return b.toString();
    }

    function isSpace(c) {
        return c == ' ' || c == '\t';
    }

    function isParagraphStart() {
        return paragraphStartMarker == lineMarker;
    }

    function isWhitespace(c) {
        // FIXME replicate java.lang.Character.isWhitespace()
        return c in { ' ': 1,
                      '\t': 1,
                      '\r': 1,
                      '\n': 1,
                      '\f': 1
                    };
    }

    function isLetterOrDigit(c) {
        return c.match(/[\w\d]/);
    }

    function trim(s) {
        return s.replace(/^\s+|\s+$/g, '');
    }

    function getBufferEnd() {
        if (typeof buffer.endMarker == "function") {
            return buffer.endMarker();
        } else {
            var l = buffer.length();
            while(l > 0 && buffer.charAt(l - 1) == NEWLINE) {
                l -= 1;
            }
            return l;
        }
    }

    function bufferEndsWith(str) {
        if (typeof buffer.endsWith == "function") {
            return buffer.endsWith(str);
        } else {
            return buffer.lastIndexOf(str) == buffer.length() - 1;
        }
    }

    // using java StringBuilder is faster if it is available
    var Buffer = java.lang.StringBuilder;

    var JSBuffer = function() {
        var buf = [];
        var count = 0;

        this.toString = function toString() {
            return buf.join("");
        };

        this.append = function append(obj) {
            var str = typeof obj == "string" ? obj : String(obj);
            if (str.length > 0) {
                count += str.length;
                buf[buf.length] = str;
            }
            return this;
        };

        this.insert = function insert(idx, obj) {
            var str = typeof obj == "string" ? obj : String(obj);
            if (str.length > 0 && idx >= 0 && idx <= count) {
                if (idx == 0) {
                    buf.unshift(str);
                } else if (idx == count) {
                    buf[buf.length] = str;
                } else {
                    var c = count;
                    for (var i = buf.length - 1; i >= 0; i--) {
                        c -= buf[i].length;
                        if (c == idx) {
                            // simple case, no need for splitting
                            buf[i] = str + buf[i];
                            break;
                        } else if (c < idx) {
                            var cut = idx - c;
                            var pre = buf[i].substring(0, cut);
                            var post = buf[i].substring(cut);
                            buf[i] = [pre, str, post].join('');
                            break;
                        }
                    }
                }
                count += str.length;
            }
            return this;
        };

        this.startsWith = function(c) {
            return buf.length > 0 && buf[0].match(new RegExp("^" + c));
        };

        this.endsWith = function(c) {
            return buf.length > 0 && buf[buf.length -1].match(new RegExp(c + "$"));
        };

        this.length = function() {
            return count;
        };

        this.setLength = function setLength(idx) {
            if (idx == 0) {
                count = 0;
                buf.length = 0;
            } else if (idx > 0 && idx < count) {
                var c = count;
                for (var i = buf.length - 1; i >= 0; i--) {
                    c -= buf[i].length;
                    if (c <= idx) {
                        if (c < idx) {
                            buf.length = i + 1;
                            buf[i] = buf[i].substring(0, idx - c);
                        } else {
                            buf.length = i;
                        }
                        count = idx;
                        break;
                    }
                }
            }
        };

        this.endMarker = function() {
            var c = count;
            for (var i = buf.length - 1; i >= 0; i--) {
                for (var j = buf[i].length - 1; j >= 0; j--) {
                    if (buf[i][j] != '\n') {
                        return c;
                    }
                    c -= 1;
                }
            }
            return 0;
        }
        
        return this;
    }

    var Stack = function() {
        var stack = new Array();

        this.push = function(obj) {
            stack.push(obj);
        };

        this.pop = function() {
            return stack.pop();
        };

        this.peek = function() {
            return stack[stack.length - 1];
        };

        this.isEmpty = function() {
            return stack.length == 0;
        }

        this.search = function(type) {
            for (var i = stack.length - 1; i >= 0; i--) {
                if (stack[i] instanceof type) {
                    return stack[i];
                }
            }
            return null;
        };

        this.countNestedLists = function(startFromElement) {
            var count = 0;
            for (var i = stack.length - 1; i >= 0; i--) {
                var elem = stack[i];
                if (startFromElement) {
                    if (startFromElement == elem) {
                        startFromElement = null;
                    }
                    continue;
                }
                if (elem instanceof ListElement) {
                    count += 1;
                } else if (elem instanceof BlockquoteElement) {
                    break;
                }
            }
            return count;
        }

        this.peekNestedElement = function() {
            for (var i = stack.length - 1; i >= 0; i--) {
                var elem = stack[i];
                if (elem instanceof ListElement || elem instanceof BlockquoteElement) {
                    return elem;
                }
            }
            return null;
        }

        this.findNestedElement = function findNestedElement(type, nesting) {
            for (var i = 0; i < stack.length; i++) {
                var elem = stack[i];
                if (nesting == elem.nesting && elem instanceof type) {
                    return elem;
                }
            }
            return null;
        };

        this.closeElements = function closeElements(element) {
            var initialLength = buffer.length();
            do {
                this.peek().close();
            } while (this.pop() != element);
        };

        this.closeElementsExclusive = function closeElementsExclusive(element) {
            var initialLength = buffer.length();
            while(this.peek() != element) {
                this.pop().close();
            }
        };

        this.closeElementsUnlessExists = function closeNestedElement(type, nesting) {
            var elem = this.findNestedElement(type, nesting);
            if (!elem) {
                while(stack.length > 0) {
                    elem = this.peek();
                    if (elem && elem.nesting >= nesting) {
                        stack.pop().close();
                    } else {
                        break;
                    }
                }
            }
        }

        this.toString = function() {
            return stack.toString();
        }

        return this;
    }


    Element.extend = function(obj) {
        var proto1 = obj;
        var proto2 = obj.__proto__;
        while (proto2 && proto2 != this.prototype && proto2 != Object.prototype) {
            proto1 = proto2;
            proto2 = proto2.__proto__;
        }
        if (proto2 != this.prototype) {
            proto1.__proto__ = this.prototype;
        }
        var args = [];
        for (var i = 1; i < arguments.length; i++) {
            args.push(arguments[i]);
        }
        this.apply(obj, args);
    }

    function Element(tag, nesting, m) {
        this.tag = tag;
        this.nesting = nesting;
        this.m = m;

        this.open = function() {
            buffer.append("<").append(tag).append(">");
        }

        this.close = function() {
            buffer.insert(getBufferEnd(), "</" + tag + ">");
        }

        this.toString = function() {
            return "[" + this.constructor.name + ":" + this.nesting + "]";
        }
    }

    function BaseElement() {
        Element.extend(this);

        this.open = this.close = function() {};
    }

    function BlockquoteElement(nesting) {
        Element.extend(this, "blockquote", nesting);
    }

    function CodeElement(nesting) {
        Element.extend(this, "code", nesting);

        this.open = function() {
            buffer.append("<pre><code>");
        }

        this.close = function() {
            buffer.insert(codeEndMarker, "</code></pre>");
        }
    }

    function HeaderElement(nesting) {
        Element.extend(this, "h" + nesting, nesting);
    }

    function ListElement(tag, nesting) {
        Element.extend(this, tag, nesting);

        this.close = function() {
            buffer.insert(getBufferEnd(), "</li></" + tag + ">");
        }
    }

    function Emphasis() {
        Element.extend(this, "em", 0, 1);
    }

    function Strong() {
        Element.extend(this, "strong", 0, 2);
    }

}

