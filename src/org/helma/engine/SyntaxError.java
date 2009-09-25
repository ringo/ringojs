package org.helma.engine;

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

}
