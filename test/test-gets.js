"use strict";

module.exports = function (app) {
    app.get("/", (req, res) => {
        res.send("<h1>Welcome to your first webium app!</h1>");
    }).get("/user/:id", (req, res) => {
        res.send({
            id: parseInt(req.params.id),
            name: "Luna",
            gender: "female"
        });
    });
}