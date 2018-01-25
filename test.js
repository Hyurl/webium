const { App, Router } = require("./");

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

// This route contains many features: using async/await, calling next() before
// doing stuffs, returning value from the listener function and catching 
// errors across the request life cycle.
app.get("/async", async (req, res, next) => {
    try {
        var result = await next();
        res.send(result); // Hello, Webium!
    } catch (e) {
        res.send(e instanceof Error ? e.message : e);
    }
}).get("/async", async (req, res) => {
    return "Hello, Webium!";
});

var router = new Router();

router.get("/another-router", (req, res)=>{
    res.send("This is another router.");
});

app.use(router);

// This route will match any URL.
app.get("(.*)", (req, res) => {
    res.send("Unknown route.");
});

app.listen(80);