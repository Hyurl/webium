module.exports = function (app) {
    app.delete("/user/:id", (req, res) => {
        res.send({
            id: parseInt(req.params.id),
            name: "Luna",
            gender: "female"
        });
    });
}