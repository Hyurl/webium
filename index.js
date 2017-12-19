const http = require("http");
const connect = require("connect");
const enhance = require("enhance-req-res");
const Cookie = require("sfn-cookie");
const bodyParser = require("body-parser");

class App extends connect {
    constructor(options = {}) {
        options.extended = true;
        super();
        this.use((req, res, next) => {
            enhance(options)(req, res);
            next();
        }).use(bodyParser.json(options)).use(bodyParser.urlencoded(options));
    }
}

module.exports = { App, Cookie };