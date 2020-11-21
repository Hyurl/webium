"use strict";

require("source-map-support/register");
const webium = require("../");
const axios = require("axios").default;
const assert = require("assert");
const qs = require("qs");
const http = require("http");

var app = new webium.App();
var nodeVersion = parseFloat(process.version.slice(1));

app.use((req, res, next) => {
    assert.ok(req instanceof webium.RequestConstructor);
    assert.ok(res instanceof webium.ResponseConstructor);
    next();
});

require("./test-middleware")(app);

require("./test-all")(app);
require("./test-delete")(app);
require("./test-gets")(app);
require("./test-head")(app);
require("./test-patch")(app);
require("./test-posts")(app);
require("./test-put")(app);
require("./test-unique")(app);
require("./test-regexp")(app);
require("./test-no-next")(app);

if (nodeVersion >= 7.6) {
    require("./test-async")(app);
}

app.use(require("./test-router"));

require("./test-match-any")(app);

app.listen(3000, listeningListener(true));

function listeningListener(outerServer) {
    return () => {
        axios.defaults.baseURL = "http://localhost:3000";

        Promise.resolve(null).then(() => {
            let promises = [];

            for (let method of webium.App.METHODS) {
                let _method = method.toLowerCase();

                if (typeof axios[_method] == "function") {
                    promises.push(axios[_method]("/return-method").then(res => {
                        if (method != "HEAD") {
                            assert.strictEqual(res.data, method);
                        }
                    }));
                }
            }

            return Promise.all(promises);
        }).then(() => {
            return axios.delete("/user/1").then(res => {
                assert.deepStrictEqual(res.data, {
                    id: 1,
                    name: "Luna",
                    gender: "female"
                });
            });
        }).then(() => {
            return axios.get("/").then(res => {
                assert.strictEqual(res.data, "<h1>Welcome to your first webium app!</h1>");
            });
        }).then(() => {
            return axios.get("/user/1").then(res => {
                assert.deepStrictEqual(res.data, {
                    id: 1,
                    name: "Luna",
                    gender: "female"
                });
            });
        }).then(() => {
            return axios.head("user/1").then(res => {
                assert.strictEqual(res.status, 200);
                assert.strictEqual(res.headers.server, "NodeJS");
                assert.strictEqual(res.headers["x-powered-by"], "webium");
            });
        }).then(() => {
            return axios.patch("/user-via-urlencoded", qs.stringify({
                name: "Luna",
                gender: "female"
            })).then(res => {
                assert.strictEqual(res.data, "OK");
            });
        }).then(() => {
            return axios.patch("/user-via-json", {
                name: "Luna",
                gender: "female"
            }).then(res => {
                assert.strictEqual(res.data, "OK");
            });
        }).then(() => {
            return axios.patch("/user-via-urlencoded-with-multi-dimensions", qs.stringify({
                name: "Luna",
                gender: "female",
                meta: {
                    firstName: "Yue",
                    familyName: "Wang",
                    codes: [1, 2, 3, 4, 5]
                }
            })).then(res => {
                assert.strictEqual(res.data, "OK");
            });
        }).then(() => {
            return axios.post("/user-via-urlencoded", qs.stringify({
                name: "Luna",
                gender: "female"
            })).then(res => {
                assert.strictEqual(res.data, "OK");
            });
        }).then(() => {
            return axios.post("/user-via-json", {
                name: "Luna",
                gender: "female"
            }).then(res => {
                assert.strictEqual(res.data, "OK");
            });
        }).then(() => {
            return axios.post("/user-via-urlencoded-with-multi-dimensions", qs.stringify({
                name: "Luna",
                gender: "female",
                meta: {
                    firstName: "Yue",
                    familyName: "Wang",
                    codes: [1, 2, 3, 4, 5]
                }
            })).then(res => {
                assert.strictEqual(res.data, "OK");
            });
        }).then(() => {
            return axios.put("/user-via-urlencoded", qs.stringify({
                name: "Luna",
                gender: "female"
            })).then(res => {
                assert.strictEqual(res.data, "OK");
            });
        }).then(() => {
            return axios.put("/user-via-json", {
                name: "Luna",
                gender: "female"
            }).then(res => {
                assert.strictEqual(res.data, "OK");
            });
        }).then(() => {
            return axios.put("/user-via-urlencoded-with-multi-dimensions", qs.stringify({
                name: "Luna",
                gender: "female",
                meta: {
                    firstName: "Yue",
                    familyName: "Wang",
                    codes: [1, 2, 3, 4, 5]
                }
            })).then(res => {
                assert.strictEqual(res.data, "OK");
            });
        }).then(() => {
            return axios.get("/router/").then(res => {
                assert.strictEqual(res.data, "<p>This response is from a router.</p>");
            });
        }).then(() => {
            return axios.patch("/router/user-via-urlencoded", qs.stringify({
                name: "Luna",
                gender: "female"
            })).then(res => {
                assert.strictEqual(res.data, "OK");
            });
        }).then(() => {
            return axios.post("/router/user-via-json", {
                name: "Luna",
                gender: "female"
            }).then(res => {
                assert.strictEqual(res.data, "OK");
            });
        }).then(() => {
            return axios.put("/router/user-via-urlencoded-with-multi-dimensions", qs.stringify({
                name: "Luna",
                gender: "female",
                meta: {
                    firstName: "Yue",
                    familyName: "Wang",
                    codes: [1, 2, 3, 4, 5]
                }
            })).then(res => {
                assert.strictEqual(res.data, "OK");
            });
        }).then(() => {
            return axios.get("/unique").then(res => {
                assert.strictEqual(res.data, "<h1>Hello, World!</h1>");
            });
        }).then(() => {
            if (nodeVersion < 7.6) return;
            return axios.get("/async").then(res => {
                assert.strictEqual(res.data, "Hello, Webium!");
            });
        }).then(() => {
            return axios.get("/send-returning").then(res => {
                assert.strictEqual(res.data, "Hello, Webium!");
            });
        }).then(() => {
            return axios.get("/no-next").then(res => {
                assert.strictEqual(res.data, "Hello, Webium!");
            });
        }).then(() => {
            return axios.get("/test.html").then(res => {
                assert.strictEqual(res.data, "request an HTML file.");
            });
        }).then(() => {
            return axios.get("/match-any").then(res => {
                assert.strictEqual(res.data, "Unknown route.");
            });
        }).then(() => {
            app.close();

            if (outerServer) {
                app.server = http.createServer(app.listener).listen(3000, listeningListener(false));
            } else {
                console.log("#### OK ####");
            }
        }).catch((err) => {
            app.close();
            throw err;
        });
    };
}
