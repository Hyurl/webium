"use strict";

const assert = require("assert");

module.exports = function (app) {
    app.patch("/user-via-urlencoded", (req, res) => {
        assert.deepEqual(req.body, {
            name: "Luna",
            gender: "female"
        });
        res.send("OK");
    }).patch("/user-via-json", (req, res) => {
        assert.deepEqual(req.body, {
            name: "Luna",
            gender: "female"
        });
        res.send("OK");
    }).patch("/user-via-urlencoded-with-multi-dimensions", (req, res) => {
        assert.deepStrictEqual(req.body, {
            name: "Luna",
            gender: "female",
            meta: {
                firstName: "Yue",
                familyName: "Wang",
                codes: ["1", "2", "3", "4", "5"]
            }
        });
        res.send("OK");
    });
}