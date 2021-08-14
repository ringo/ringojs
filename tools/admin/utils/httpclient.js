const fs = require("fs");
const log = require("ringo/logging").getLogger(module.id);
const files = require("ringo/utils/files");
const {request} = require("ringo/httpclient");

const RE_SLASH_LEADING = /^\//;
const RE_SLASH_TRAILING = /\/$/;

exports.getBinary = (url) => {
    log.debug("GET (binary)", url);
    const exchange = request({
        method: "GET",
        url: url,
        binary: true
    });
    if (exchange.status !== 200) {
        throw new Error("Downloading " + url + " failed with response code " + exchange.status);
    }
    const tmpFile = files.createTempFile("ringo-admin-");
    fs.write(tmpFile, exchange.contentBytes, {binary: true});
    log.debug("Stored binary file in", tmpFile);
    return tmpFile;
};

exports.composeUrl = function() {
    return Array.prototype.map.call(arguments, (val, idx, arr) => {
        val = val.replace(RE_SLASH_LEADING, "");
        if (idx < arr.length -1) {
            val = val.replace(RE_SLASH_TRAILING, "");
        }
        return val;
    }).join("/");
};

