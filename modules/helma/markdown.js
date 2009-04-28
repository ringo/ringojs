/**
 * Get an instance of org.helma.util.MarkdownProcessor with optionally
 * some methods overridden by the functions in the extension argument.
 * @param extension functions overriding methods in the MarkdownProcessor
 */
exports.Markdown = function Markdown(extension) {
    extension = extension || {};
    return new JavaAdapter(org.helma.util.MarkdownProcessor, extension);
}
