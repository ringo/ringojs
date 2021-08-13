const {URI} = java.net;
const constants = require("../constants");

exports.isValidUrl = (url) => {
    try {
        URI.create(url);
        return true;
    } catch (e) {
        return false;
    }
}

const isHttp = exports.isHttp = (url) => {
    return ["http", "https"].includes(URI.create(url).getScheme());
};

const isGit = exports.isGit = (url) => {
    return [
        "git",
        "git+ssh",
        "ssh",
        "git+http",
        "git+https",
        "git+file"
    ].includes(URI.create(url).getScheme());
};

const isGitHub = exports.isGitHub = (spec) => {
    const uri = URI.create(spec);
    const segments = uri.getPath().split("/").slice(1);
    return ["http", "https", "git", "git+http", "git+https"].includes(uri.getScheme()) &&
        segments.length === 2 &&
        segments.every(part => /[a-zA-Z0-9_-]/.test(part.trim()));
};

const newGitHubSpec = exports.newGitHubSpec = (url) => {
    const uri = URI.create(url);
    const [owner, repository] = uri.getPath()
            .split("/")
            .slice(1)
            .map(part => part.trim());
    const treeish = uri.getFragment();
    return {
        type: constants.TYPE_GIT,
        url: ["https://github.com", owner, repository].join("/"),
        treeish: treeish
    };
};

const newGitSpec = exports.newGitSpec = (url) => {
    const uri = URI.create(url);
    // additional toString to prevent java ProcessBuilder complaints about "ConsString"
    const uriString = (uri.getScheme() + ":" + uri.getSchemeSpecificPart()).toString();
    const treeish = uri.getFragment();
    return {
        type: constants.TYPE_GIT,
        url: uriString,
        treeish: treeish
    };
};

const newHttpSpec = exports.newHttpSpec = (url) => {
    return {
        type: constants.TYPE_HTTP,
        url: url
    };
};

exports.get = (url) => {
    if (isGitHub(url)) {
        return newGitHubSpec(url);
    } else if (isGit(url)) {
        return newGitSpec(url);
    } else if (isHttp(url)) {
        return newHttpSpec(url);
    }
    throw new Error("Invalid package url " + url);
};
