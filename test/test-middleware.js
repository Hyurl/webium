"use strict";

const assert = require("assert");

module.exports = function (app) {
    app.use((req, res, next) => {
        res.headers["server"] = "NodeJS";
        res.headers["x-powered-by"] = "webium";
        next();
    }).use((req, res, next) => {
        assert.equal(res.headers["server"], "NodeJS");
        assert.equal(res.headers["x-powered-by"], "webium");
        next();
    });
}