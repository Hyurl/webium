module.exports = (app) => {
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
};
