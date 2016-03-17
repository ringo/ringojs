const assert = require("assert");

const {get, request} = require("ringo/httpclient");
const {Server} = require("ringo/httpserver");

const {JsgiResponse} = require("ringo/jsgi/response");

const HOST = "127.0.0.1";
const PORT = 8088;

exports.testHttpJsgiBinding = function() {
    let server;
    try {
        server = new Server({
            "host": HOST,
            "port": PORT
        });

        const app = function (req) {
            if (req.pathInfo === "/") {
                return {
                    status: 200,
                    headers: {
                        "Content-Type": "text/plain",
                        "Set-Cookie": ["foo=1; Path=/", "bar=2; Path=/baz"]
                    },
                    body: ["Hello World!"]
                };
            } else if (req.pathInfo === "/jsgiresponse") {
                return new JsgiResponse().text("foo").addHeaders({
                    "foo": "bar",
                    "mufoo": ["bar", "baz", 12345]
                });
            } else if (req.pathInfo === "/multipleheaders") {
                return new JsgiResponse().text("done");
            }
        };

        server.getDefaultContext().serveApplication(app);
        server.start();

        let exchange = get("http://" + HOST + ":" + PORT + "/");
        assert.equal(exchange.status, 200);
        assert.isTrue(exchange.headers["Set-Cookie"] instanceof Array);
        assert.isTrue(exchange.headers["Set-Cookie"].indexOf("foo=1; Path=/") >= 0);
        assert.isTrue(exchange.headers["Set-Cookie"].indexOf("bar=2; Path=/baz") >= 0);

        exchange = get("http://" + HOST + ":" + PORT + "/jsgiresponse");
        assert.equal(exchange.status, 200);
        assert.equal(exchange.headers["foo"][0], "bar");
        assert.isTrue(exchange.headers["mufoo"] instanceof Array);
        assert.isTrue(exchange.headers["mufoo"].indexOf("bar") >= 0);
        assert.isTrue(exchange.headers["mufoo"].indexOf("baz") >= 0);
        assert.isTrue(exchange.headers["mufoo"].indexOf("12345") >= 0);

        exchange = request({
            url: "http://" + HOST + ":" + PORT + "/multipleheaders",
            method: "GET",
            headers: {
                "mufoo": ["bar", "baz", "12345"]
            }
        });
        assert.equal(exchange.status, 200);
    } finally {
        server.stop();
    }
};

if (require.main === module) {
    require("system").exit(require("test").run(module.id));
}