"use strict";

const assert = require("assert");

module.exports = function (app) {
    let handler = (req, res) => {
        res.send(req.method);
    };

    app.all("/return-method", handler);

    assert.ok(app.contains("POST", "/return-method"));
    assert.ok(app.contains("GET", "/return-method", handler));
    assert.strictEqual(app.contains("GET", "/return-methods"), false);
    assert.deepStrictEqual(
        app.methods("/return-method").sort(),
        app.constructor.METHODS.sort()
    );
};
