"use strict";

const App = require("../").App;
const axios = require("axios").default;
const assert = require("assert");
const qs = require("qs");
const http = require("http");

var app = new App();

require("./test-middleware")(app);

require("./test-all")(app);
require("./test-delete")(app);
require("./test-gets")(app);
require("./test-head")(app);
require("./test-patch")(app);
require("./test-posts")(app);
require("./test-put")(app);
require("./test-unique")(app);
require("./test-async")(app);
require("./test-no-next")(app);
require("./test-regexp")(app);

app.use(require("./test-router"));

require("./test-match-any")(app);

app.listen(3000, listeningListener(true));

function listeningListener(outerServer) {
    return () => {
        axios.defaults.baseURL = "http://localhost:3000";

        Promise.resolve(null).then(() => {
            let promises = [];

            for (let method of App.METHODS) {
                let _method = method.toLowerCase();

                if (typeof axios[_method] == "function") {
                    promises.push(axios[_method]("/return-method").then(res => {
                        if (method != "HEAD") {
                            assert.equal(res.data, method);
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
                assert.equal(res.data, "<h1>Welcome to your first webium app!</h1>");
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
                assert.equal(res.status, 200);
                assert.equal(res.headers.server, "NodeJS");
                assert.equal(res.headers["x-powered-by"], "webium");
            });
        }).then(() => {
            return axios.patch("/user-via-urlencoded", qs.stringify({
                name: "Luna",
                gender: "female"
            })).then(res => {
                assert.equal(res.data, "OK");
            });
        }).then(() => {
            return axios.patch("/user-via-json", {
                name: "Luna",
                gender: "female"
            }).then(res => {
                assert.equal(res.data, "OK");
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
                assert.equal(res.data, "OK");
            });
        }).then(() => {
            return axios.post("/user-via-urlencoded", qs.stringify({
                name: "Luna",
                gender: "female"
            })).then(res => {
                assert.equal(res.data, "OK");
            });
        }).then(() => {
            return axios.post("/user-via-json", {
                name: "Luna",
                gender: "female"
            }).then(res => {
                assert.equal(res.data, "OK");
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
                assert.equal(res.data, "OK");
            });
        }).then(() => {
            return axios.put("/user-via-urlencoded", qs.stringify({
                name: "Luna",
                gender: "female"
            })).then(res => {
                assert.equal(res.data, "OK");
            });
        }).then(() => {
            return axios.put("/user-via-json", {
                name: "Luna",
                gender: "female"
            }).then(res => {
                assert.equal(res.data, "OK");
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
                assert.equal(res.data, "OK");
            });
        }).then(() => {
            return axios.get("/router/").then(res => {
                assert.equal(res.data, "<p>This response is from a router.</p>");
            });
        }).then(() => {
            return axios.patch("/router/user-via-urlencoded", qs.stringify({
                name: "Luna",
                gender: "female"
            })).then(res => {
                assert.equal(res.data, "OK");
            });
        }).then(() => {
            return axios.post("/router/user-via-json", {
                name: "Luna",
                gender: "female"
            }).then(res => {
                assert.equal(res.data, "OK");
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
                assert.equal(res.data, "OK");
            });
        }).then(() => {
            return axios.get("/unique").then(res => {
                assert.equal(res.data, "<h1>Hello, World!</h1>");
            });
        }).then(() => {
            return axios.get("/async").then(res => {
                assert.equal(res.data, "Hello, Webium!");
            });
        }).then(() => {
            return axios.get("/send-returning").then(res => {
                assert.equal(res.data, "Hello, Webium!");
            });
        }).then(() => {
            return axios.get("/no-next").then(res => {
                assert.equal(res.data, "Hello, Webium!");
            });
        }).then(() => {
            return axios.get("/test.html").then(res => {
                assert.equal(res.data, "request an HTML file.");
            });
        }).then(() => {
            return axios.get("/match-any").then(res => {
                assert.equal(res.data, "Unknown route.");
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
    }
}