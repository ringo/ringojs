/**
 * @fileOverview A fast and extensible
 * [Markdown](http://daringfireball.net/projects/markdown/) formatter.
 */
module.shared = true;

/**
 * Get an instance of org.ringojs.util.MarkdownProcessor. Passing in an
 * optional JavaScript object as argument allows the caller to override some
 * methods in that class. Specifically, the following methods can be overridden:
 *
 *  - **getLink(id)** called to resolve Markdown link ids. Takes a single string id
 *     as argument and must return an array containing the target link and the
 *     target link title. If this returns null, the markdown link will not be
 *     rendered as HTML link.
 *
 *  - **openTag(tagname, buffer)** called when a HTML tag is opened. `tagname` is
 *     an HTML tag such as `pre` or `div`, buffer is a java.lang.StringBuffer to append to.
 *     The function can be used to create HTML tags with additional attributes.
 *  
 * @param {Object} extension optional object with methods overriding default
 * behaviour in org.ringojs.util.MarkdownProcessor class
 */
exports.Markdown = function Markdown(extension) {
    extension = extension || {};
    return new JavaAdapter(org.ringojs.util.MarkdownProcessor, extension);
};
