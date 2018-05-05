module.exports = function (app) {
    app.all("/return-method", (req, res) => {
        res.send(req.method);
    });
}