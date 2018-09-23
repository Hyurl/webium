"use strict";

const assert = require("assert");
const Router = require("../").Router;

var router = new Router();

router.get("/router/", (req, res) => {
    res.send("<p>This response if from a router.</p>");
}).patch("/router/user-via-urlencoded", (req, res) => {
    assert.deepEqual(req.body, {
        name: "Luna",
        gender: "female"
    });
    res.send("OK");
}).post("/router/user-via-json", (req, res) => {
    assert.deepEqual(req.body, {
        name: "Luna",
        gender: "female"
    });
    res.send("OK");
}).put("/router/user-via-urlencoded-with-multi-dimensions", (req, res) => {
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

module.exports = router;