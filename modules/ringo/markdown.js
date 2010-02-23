/**
 * Get an instance of org.ringojs.util.MarkdownProcessor with optionally
 * some methods overridden by the functions in the extension argument.
 * @param extension functions overriding methods in the MarkdownProcessor
 */
exports.Markdown = function Markdown(extension) {
    extension = extension || {};
    return new JavaAdapter(org.ringojs.util.MarkdownProcessor, extension);
}
