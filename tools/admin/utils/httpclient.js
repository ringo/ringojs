const fs = require("fs");
const log = require("ringo/logging").getLogger(module.id);
const files = require("ringo/utils/files");
const {request} = require("ringo/httpclient");

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

