const { App } = require("./index");
const http = require("http");

var app = new App();

app.use((req, res) => {
    // Print out some request imformation:
    console.log("Client IP:", req.ip);
    console.log("Requested href:", req.href);
    console.log("Requested hostname:", req.hostname);
    console.log("Accepted Language:", req.lang);

    // Set some response information.
    res.cookies.username = "Luna";
    res.refresh = 5; // refresh the page every 5 seconds.

    res.send("<p>Hello, World!</p>"); // text/html;
}).listen(80);