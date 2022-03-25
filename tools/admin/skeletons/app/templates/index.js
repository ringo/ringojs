const {Reinhardt} = require("reinhardt");

const reinhardt = exports.reinhardt = new Reinhardt({
    "loader": module.resolve("./"),
    "debug": true
});

exports.renderResponse = (template, context) => {
    return reinhardt.renderResponse(template, context);
};
