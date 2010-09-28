package org.ringojs.engine;

import org.ringojs.util.StringUtils;

public class SyntaxError {

    public final String message, sourceName, lineSource;
    public final int line, offset;

    SyntaxError(String message, String sourceName, int line, String lineSource, int offset) {
        this.message = message;
        this.sourceName = sourceName;
        this.lineSource = lineSource;
        this.line = line;
        this.offset = offset;
    }

    public String toString() {
        String lineSeparator = System.getProperty("line.separator", "\n");
        StringBuffer b = new StringBuffer(sourceName).append(", line ").append(line)
                .append(": ").append(message).append(lineSeparator)
                .append(lineSource).append(lineSeparator);
        for(int i = 0; i < offset - 1; i++) {
            b.append(' ');
        }
        b.append('^');
        return b.toString();
    }

    public String toHtml() {
        String lineSeparator = System.getProperty("line.separator", "\n");
        StringBuffer b = new StringBuffer("<div>").append(sourceName).append(", line ")
                .append(line).append(": <b>").append(StringUtils.escapeHtml(message))
                .append("</b></div>").append(lineSeparator).append("<pre>");
        int srcLength = lineSource.length();
        int errorStart = Math.max(0, offset - 2);
        int errorEnd = Math.min(srcLength, offset);
        b.append(StringUtils.escapeHtml(lineSource.substring(0, errorStart)))
                .append("<span style='border-bottom: 3px solid red;'>")
                .append(StringUtils.escapeHtml(lineSource.substring(errorStart, errorEnd)))
                .append("</span>")
                .append(StringUtils.escapeHtml(lineSource.substring(errorEnd)))
                .append(lineSeparator).append("</pre>");
        return b.toString();
    }

}
