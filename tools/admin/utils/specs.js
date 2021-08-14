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

const isArchive = exports.isArchive = (url) => {
    const uri = URI.create(url);
    return ["http", "https"].includes(uri.getScheme()) &&
        [".tar", ".tar.gz", ".tgz", ".zip"].some(extension => uri.getPath().endsWith(extension));
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

const isGitHub = exports.isGitHub = (url) => {
    const uri = URI.create(url);
    const segments = uri.getPath().split("/");
    if (segments.length === 2) {
        return segments.every(part => /^[a-zA-Z0-9_-]+$/.test(part.trim()));
    }
    return ["http", "https"].includes(uri.getScheme()) &&
        uri.getHost() === "github.com";
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

const newArchiveSpec = exports.newArchiveSpec = (url) => {
    return {
        type: constants.TYPE_ARCHIVE,
        url: url
    };
};

exports.get = (url) => {
    if (isGit(url)) {
        return newGitSpec(url);
    } else if (isArchive(url)) {
        return newArchiveSpec(url);
    } else if (isGitHub(url)) {
        return newGitHubSpec(url);
    }
    throw new Error("Invalid package url " + url);
};
