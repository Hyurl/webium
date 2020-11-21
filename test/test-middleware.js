"use strict";

const assert = require("assert");

module.exports = function (app) {
    app.use((req, res, next) => {
        res.headers["server"] = "NodeJS";
        res.headers["x-powered-by"] = "webium";
        next();
    }).use((req, res, next) => {
        assert.strictEqual(res.headers["server"], "NodeJS");
        assert.strictEqual(res.headers["x-powered-by"], "webium");
        next();
    });
};
