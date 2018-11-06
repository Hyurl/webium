module.exports = (app) => {
    app.get("/send-returning", async () => {
        return "Hello, Webium!";
    });
    app.get("/no-next", async (req) => {
        req.myVar = "Hello, Webium!";
    }).get("/no-next", (req) => {
        return req.myVar;
    });
}