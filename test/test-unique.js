"use strict";

module.exports = function (app) {
    app.get("/unique", (req, res) => {
        res.send("<h1>Welcome to your first webium app!</h1>");
    }, true).get("/unique", (req, res) => {
        res.send("<h1>Hello, World!</h1>");
    }, true);
};
