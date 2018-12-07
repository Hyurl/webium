module.exports = (app) => {
    app.get("/send-returning", () => {
        return "Hello, Webium!";
    });
    app.get("/no-next", (req) => {
        req.myVar = "Hello, Webium!";
    }).get("/no-next", (req) => {
        return req.myVar;
    });
}