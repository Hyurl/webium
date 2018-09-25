# Concept

Since version 0.4.2, **webium** support setting argument `unique` to suggest the
route should contain only one handler, and when new handler is set, it will 
replace the old one, thus allowing you resetting the handler when necessary, e.g.
implementing **hot-reloading**.

## Example

```javascript
// index.js
const { App } = require("webium");
const fs = require("fs");
const path  = require("path");

var app = new App();
var filename = path.resolve(__dirname, "route.js");

app.listen(80);

require(filename)(app);

fs.watch(filename, (event, filename) => {
    if (event == "change") {
        filename = path.resolve(__dirname, filename);
        
        if (require.cache[filename]) {
            delete require.cache[filename]; // delete cache
            require(filename)(app); // re-import the script
        }
    }
});
```

```javascript
// route.js
module.exports = (app) => {
    app.get("/", (req, res) => {
        res.send("<h1>Hello, World!</h1>");
    }, true);
};
```