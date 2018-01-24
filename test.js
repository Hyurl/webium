const { App } = require("./");

var app = new App();

app.get("/", (req, res) => {
    res.send("<h1>Welcome to your first webium app!</h1>");
}).get("/user/:id", (req, res) => {
    console.log("UID:", req.params.id);
    res.send({
        id: req.params.id,
        name: "Luna",
        origin: "Webium"
    });
}).post("/user", (req, res) => {
    console.log("Body:", req.body);
    res.send(req.body);
});

app.listen(80);