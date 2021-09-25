const {URI} = java.net;

const GIT_SCHEMES = {
    "git+ssh": "ssh",
    "git+http": "http",
    "git+https": "https",
    "git+file": "file"
};

const TYPE_GIT = exports.TYPE_GIT = "git";
const TYPE_ARCHIVE = exports.TYPE_ARCHIVE = "archive";

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
    if (!uri.getScheme() && segments.length === 2) {
        return segments.every(part => /^[a-zA-Z0-9_-]+$/.test(part.trim()));
    }
    return ["http", "https"].includes(uri.getScheme()) &&
        uri.getHost() === "github.com";
};

const newGitHubSpec = exports.newGitHubSpec = (url) => {
    const uri = URI.create(url);
    const treeish = uri.getFragment();
    if (!uri.isAbsolute()) {
        const [owner, repository] = uri.getPath()
            .split("/")
            .map(part => part.trim());
        url = ["https://github.com", owner, repository].join("/");
    } else {
        url = [uri.getScheme(), uri.getSchemeSpecificPart()].join(":");
    }
    return {
        type: TYPE_GIT,
        url: url,
        treeish: treeish
    };
};

const newGitSpec = exports.newGitSpec = (url) => {
    const uri = URI.create(url);
    const scheme = GIT_SCHEMES[uri.getScheme()] || uri.getScheme();
    // additional toString to prevent java ProcessBuilder complaints about "ConsString"
    const uriString = (scheme + ":" + uri.getSchemeSpecificPart()).toString();
    const treeish = uri.getFragment();
    return {
        type: TYPE_GIT,
        url: uriString,
        treeish: treeish
    };
};

const newArchiveSpec = exports.newArchiveSpec = (url) => {
    return {
        type: TYPE_ARCHIVE,
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
