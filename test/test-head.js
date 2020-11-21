"use strict";

const assert = require("assert");

module.exports = function (app) {
    app.head("/user/:id", (req, res) => {
        assert.strictEqual(req.params.id, "1");
        res.send(null);
    });
};
