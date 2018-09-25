# Webium

**A minimal web framework with middleware and routes.** [中文](./README.zh-CN.md)

This module adds additional properties and methods to the corresponding `req` 
and `res` objects in a http server, and enhance abilities of the program.
The program for enhancement has been separated as an individual module 
[enhance-req-res](https://github.com/hyurl/enhance-req-res), which will work 
with other frameworks or the internal Node.js http/https/http2 server, you can
check it out if you want.

This module has both `express` style and `koa` style, but only keeps very few 
and useful methods. It is compatible to most well-known `connect` and `express` 
middleware, so you can use them instead.

Since version 0.3.5, this package is compatible to Node.js internal **HTTP2** 
server.

Since version 0.4.2, this package supports implementing 
[hot-reloading](./hot-reloading.md).

## Install

```sh
npm install webium
```

## Example

```javascript
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
// doing stuffs, returning value from the handler function and catching 
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
```

## API

### webium

A namespace that contains classes `App`, `Router` and `Cookie`, while the 
`Cookie` comes from [sfn-cookie](https://github.com/hyurl/sfn-cookie),
and the `App` inherited `Router`.

```javascript
const webium = require("webium");

// recommended:
const { App, Router, Cookie } = require("webium");
```

### Cookie

- `new Cookie(name: string, value: string, options?: object)`
    All `options` include:
    - `maxAge: number` How many seconds that this cookie should last.
    - `expires: number|string|Date`: Keep alive to a specified date or time.
    - `sameSite`: Honor same-site principle, could be either `Strict` or `Lax`.
    - `domain`: Set cookie for a specified domain name.
    - `path`: Set cookie for a specified pathname.
    - `httpOnly`: Only HTTP, not JavaScript, can access this cookie.
    - `secure`: This cookie won't be sent if not using HTTPS protocol.
- `new Cookie(cookieStr: string)`
- `new Cookie(options: object)`
- `cookie.toString()` Gets the serialized cookie string of the current 
    instance.

```javascript
var cookie1 = new Cookie("username=Luna"),
    cookie2 = new Cookie("username=Luna; Max-Age=120; HttpOnly"),
    cookie3 = new Cookie("username", "Luna"),
    cookie4 = new Cookie("username", "Luna", { maxAge: 120, httpOnly: true }),
    cookie4 = new Cookie({ name: "username", value: "Luna", maxAge: 120, httpOnly: true });
```

### Router

#### `new Router(caseSensitive?: boolean)`

Creates a new router that can be used by the `App`. If `caseSensitive` is 
`true`, when analyzing URL, the program will check it case-sensitively.

```javascript
const { App, Router } = require("webium");

var app = new App,
    router = new Router;

// ...

app.use(router);
```

#### `router.use()`

Adds a handler function as a middleware, or concatenate another router.

**signatures:**

- `use(handler: RouteHandler): this`
- `use(router: Router): this`

The type `RouteHandler` is a function with this signature:

- `(req: Request, res: Response: next(thisObj: any) => any) => any`

```javascript
router.use((req, res, next) => {
    // ...
    next();
});

var router2 = new Router;
router2.use(router);
```

Be aware, if you `use` another router when the current one has same routes,
only their handlers will be merged. If the routes in that router don't exist 
in the current one, then references will be created, that means if you 
modified the routes of that router, the current one will also be affected.

Middleware are called before all routes, and when concatenating two routes, 
middleware are always merged.

#### `method(name: string, path: string, handler: RouteHandler, unique?: boolean): this`

Adds a handler function to a specified method and path.

```javascript
router.method("GET", "/", (req, res, next) => {
    // ...
    next();
}).method("GET", "/user/:name", (req, res, next) => {
    // GET /user/luna
    console.log(req.params); // { name: 'luna' }
    // ...
});
```

The `path` in `express` style, will be parsed by 
[path-to-regexp](https://github.com/pillarjs/path-to-regexp) module, you can 
learn more details in its documentation.

If the argument `unique` is provided, that means the route should contain only 
one handler, and the new one will replace the old one.

#### `delete(path: string, handler: RouteHandler, unique?: boolean): this`

Short-hand for `router.method("DELETE", path, handler, unique)`.

#### `get(path: string, handler: RouteHandler, unique?: boolean): this`

Short-hand for `router.method("GET", path, handler, unique)`.

#### `head(path: string, handler: RouteHandler, unique?: boolean): this`

Short-hand for `router.method("HEAD", path, handler, unique)`.

#### `patch(path: string, handler: RouteHandler, unique?: boolean): this`

Short-hand for `router.method("PATCH", path, handler, unique)`.

#### `post(path: string, handler: RouteHandler, unique?: boolean): this`

Short-hand for `router.method("POST", path, handler, unique)`.

#### `put(path: string, handler: RouteHandler, unique?: boolean): this`

Short-hand for `router.method("PUT", path, handler, unique)`.

#### `all(path: string, handler: RouteHandler, unique?: boolean): this`

Adds a handler function to the all methods.

**alias:**

- `any()`

### App

The `App` class inherited from `Router`.

#### `new App(options?: AppOptions)`

Interface `AppOptions` includes:

- `domain` Set a domain name (or multiple ones in an array) for the program to 
    find out the subdomain.
 - `useProxy` If `true`, when access properties like `req.ip` and 
    `req.host`, will firstly try to get info from proxy, default: `false`.
- `capitalize` Auto-capitalize response headers when setting, default: `true`.
- `cookieSecret` A secret key to sign/unsign cookie values.
- `jsonp` Set a query name for jsonp callback if needed. If `true` is set, 
    then the query name will be `jsonp`. In the query string, using the style
    `jsonp=callback` to request jsonp response.
- `caseSensitive` Set the routes to be case-sensitive.

This module also automatically parses request body if the `Content-Type` is 
`application/x-www-form-urlencoded` or `application/json` by using 
[body-parser](https://github.com/expressjs/body-parser) module, so other 
options worked with `body-parser` can also be set to `options`.

```javascript
var app = new App();

// Or:
var app = new App({
    domain: "example.com",
    useProxy: true
});

app.get("/", (req, res, next) => {
    // ...
    next();
});
```

#### `listen()`

Please check [http.listen()](https://nodejs.org/dist/latest-v8.x/docs/api/http.html#http_server_listen).

#### `close()`

Closes the server started by `app.listen()`.

#### `handler` or `listener`

Returns the handler function for http/https/http2 server, you can use it with 
`https` and/or `http2`.

HTTPS

```javascript
const { createServer } = require("https");

createServer(app.listener).listen(443);
```

HTTP/2

```javascript
const { createSecureServer } = require("http2");

createSecureServer(tlsOptions, app.listener).listen(443);
```

#### `onerror(err: any, req: Request, res: Response)`

If any error occurred, this method will be called, you can override this 
method to make it satisfied to your needs.

```javascript
var app = new App();

// If the default function doesn't fulfill your needs, you can simply just 
// overwrite it.
app.onerror = function (err, req, res) {
    // ...
};
```

### Request

The `Request` interface extends `IncomingMessage`/`Http2ServerRequest` with 
more properties and methods.

Some of these properties are read-only for security reasons, that means you 
won't be able to modified them.

- `stream` The `Http2Stream` object backing the request (only for http2).
- `urlObj` An object parsed by [url6](https://github.com/hyurl/url6) module 
    that contains URL information. Be aware of `urlObj.auth`, which is 
    actually sent by http `Basic Authendication`.
- `time` Request time, not really connection time, but the moment this 
    module performs actions.
- `proxy` If the client requested via a proxy server, this property will be 
    set, otherwise it's `null`. If available, it may contain these properties:
    - `protocol` The client's real request protocol (`x-forwarded-proto`).
    - `host` The real host that client trying to request (`x-forwarded-host`).
    - `ip` The real IP of client (`ips[0]`).
    - `ips` An array carries all IP addresses, includes client IP and proxy 
        server IPs (`x-forwarded-for`).
- `auth` Authentication of the client, it could be `null`, or an object 
    carries `{ username, password }`.
- `protocol` Either `http` or `https`, if `useProxy` is true, then trying to 
    use `proxy`'s `protocol` first.
- `secure` If `protocol` is `https`, then `true`, otherwise `false`.
- `host` The requested host address (including `hostname` and `port`), if 
    `useProxy` is true, then try to use `proxy`'s `host` first.
- `hostname` The requested host name (without `port`).
- `port` The requested port.
- `domainName` The request domain name.
- `subdomain` Unlike **express** or **koa**'s `subdomains`, this property is 
    calculated by setting the `domain` option.
- `path` Full requested path (with `search`).
- `pathname` Directory part of requested path (without `search`).
- `search` The requested URL `search` string, with a leading `?`.
- `query` Parsed URL query object.
- `href` Full requested URL string (without `hash`, which is not sent by the 
    client).
- `referer` Equivalent to `headers.referer`.
- `origin` Reference to `headers.origin` or `urlObj.origin`.
- `type` The `Content-Type` of requested body (without `charset`).
- `charset` The requested body's `charset`, or the first accepted charset 
    (`charsets[0]`), assume they both use a same charset. Unlike other 
    properties, If you set this one to a valid charset, it will be used to 
    decode request body.
- `charsets` An array carries all `Accept-Charset`s, ordered by `q`ualities.
- `length` The `Content-Length` of requested body.
- `xhr` Whether the request fires with `X-Requested-With: XMLHttpRequest`.
- `cookies` An object carries all parsed cookies sent by the client.
- `params` The URL parameters.
- `body` An object carries requested body parsed by 
    [body-parser](https://github.com/expressjs/body-parser). Remember, only
    `json` and `x-www-form-urlencoded` are parsed by default.
- `ip` The real client IP, if `useProxy` is `true`, then trying to use 
    `proxy`'s `ip` first.
- `ips` An array carries all IP addresses, includes client IP and proxy 
    server IPs. Unlike `proxy.ips`, which may be `undefined`, while this
    will always be available.
- `accept` The first accepted response content type (`accepts[0]`).
- `accepts` An array carries all `Accept`s types, ordered by `q`ualities.
- `lang` The first accepted response language (`accepts[0]`).
- `langs` An array carries all `Accept-Language`s, ordered by `q`ualities.
- `encoding` The first accepted response encoding (`encodings[0]`). 
- `encodings` An array carries all `Accept-Encoding`s, ordered by sequence.
- `cache` `Cache-Control` sent by the client, it could be `null` (`no-cache`),
    a `number` of seconds (`max-age`), or a string like `private`, `public`, 
    etc.
- `keepAlive` Whether the request fires with `Connection: keep-alive`.
- `get(field)` Gets a request header field's (case insensitive) value.
- `is(...types)` Checks if the request `Content-Type` matches the given types,
    available of using short-hand words, like `html` indicates `text/html`. 
    If pass, returns the first matched type.

```javascript
console.log(req.urlObj);
console.log(req.ip);
console.log(req.host);
console.log(req.subdomain);
console.log(req.query);
console.log(req.lang);
// ...
```

### Response

The `Response` interface extends `ServerResponse`/`Http2ServerResponse` with 
more properties and methods.

Most of its properties are setters/getters, if you assign a new value to 
them, that will actually mean something.

#### `stream` - The `Http2Stream` object backing the response (only for http2)

This property is read-only.

```javascript
res.stream.push("some thing");
```

#### `code` - Sets/Gets status code.

```javascript
res.code = 200;
console.log(res.code); // => 200
```

#### `message` - Sets/Gets status message.

```javascript
res.message = "OK";
console.log(res.message); // => OK
```

#### `status` - Sets/Gets both status code and message.

```javascript
res.status = 200;
console.log(res.status); // => 200 OK

res.status = "200 Everything works fine.";
console.log(res.status); // => 200 Everything works fine.
console.log(res.code); // => 200
console.log(res.message); // => Everything works fine.
```

#### `type` - Sets/Gets `Content-Type` without `charset` part.

```javascript
res.type = "text/html";
res.type = "html"; // Will auto lookup to text/html.
console.log(res.type); // => text/html
```

#### `charset` - Sets/Gets `Content-Type` only with `charset` part.

```javascript
res.charset = "UTF-8";
console.log(res.charset); // => UTF-8
```

#### `length` Sets/Gets `Content-Length`.

```javascript
res.length = 12;
console.log(res.length); // => 12
```

#### `encoding` Sets/Gets `Content-Encoding`.

```javascript
res.encoding = "gzip";
console.log(res.encoding); // => gzip
```

#### `date` - Sets/Gets `Date`.

```javascript
res.date = new Date(); // You can set a date string or Date instance.
console.log(res.date); // => Fri, 15 Dec 2017 04:13:17 GMT
```

#### `etag` Sets/Gets - `Etag`.

This properties is internally used when calling `res.send()`, if you don't use
`res.send()`, you can call it manually.

```javascript
const etag = require("etag");

var body = "Hello, World!";
res.etag = etag(body);
console.log(res.etag); // => d-CgqfKmdylCVXq1NV12r0Qvj2XgE
```

#### `lastModified` - Sets/Gets `Last-Modified`.

```javascript
res.lastModified = new Date(2017); // You can set a date string or Date instance.
console.log(res.lastModified); // => Thu, 01 Jan 1970 00:00:02 GMT
```

#### `location` - Sets/Gets `Location`.

```javascript
res.location = "/login";
console.log(res.location); // => /login
```

#### `refresh` - Sets/Gets `Refresh` in a number of seconds.

```javascript
res.refresh = 3; // The page will auto-refresh in 3 seconds.
res.refresh = "3; URL=/logout"; // Auto-redirect to /logout in 3 seconds.
console.log(res.refresh); // => 3; URL=/logout
```

#### `attachment` - Sets/Gets `Content-Disposition` with a filename.

```javascript
res.attachment = "example.txt";
console.log(res.attchment); // => attachment; filename="example.txt"
```

#### `cahce` - Sets/Gets `Cache-Control`.

```javascript
res.cache = null; // no-cache
res.cache = 0; // max-age=0
res.cache = 3600; // max-age=3600
res.cache = "private";
console.log(res.cache); // private
```

#### `vary` - Sets/Gets `Vary`.

```javascript
res.vary = "Content-Type";
res.vary = ["Content-Type", "Content-Length"]; // Set multiple fields.
console.log(res.vary); // => [Content-Type, Content-Length]
```

#### `keepAlive` - Sets/Gets `Connection`.

```javascript
res.keepAlive = true; // Connection: keep-alive
console.log(res.keepAlive); // => true
```

#### `modified` - Whether the response has been modified.

This property is read-only, and only works after `res.atag` and
`res.lastModified` are set (whether explicitly or implicitly).

```javascript
res.send("Hello, World!");

if (res.modified) {
    console.log("A new response has been sent to the client.");
} else {
    console.log("A '304 Not Modified' response has been sent to the client");
}
```

#### `headers` - Sets/Gets response headers.

This property is a `Proxy` instance, you can only manipulate its properties to 
set headers.

```javascript
res.headers["x-powered-by"] = "Node.js/8.9.3";
console.log(res.headers); // => { "x-powered-by": "Node.js/8.9.3" }

// If you want to delete a heder, just call:
delete res.headers["x-powered-by"];
```

#### `cookies` - Sets/Gets response cookies.

This property is a Proxy instance, you can only manipulate its properties to 
set cookies.

```javascript
res.cookies.username = "Luna";
res.cookies.username = "Luna; Max-Age=3600"; // Set both value and max-age

// Another way to set a cookie is using the Cookie class:
const { Cookie } = require("webium");
res.cookies.username = new Cookie({ value: "Luna", maxAge: 3600 });

console.log(res.cookies); // => { username: "Luna" }

// If you want to delete a cookie, just call:
delete res.cookies.username;
// Or this may be more convinient if you just wnat it to expire:
res.cookies.username = null;
```

#### `get(field)` - Gets a response header field's value.

```javascript
var type = res.get("Content-Type");
// equivalent to 
var type = req.headers["content-type"];
```

#### `set(field, value)` - Sets a response header field's value.

```javascript
res.set("Content-Type", "text/html");
// equivalent to:
res.headers["content-type"] = "text/html";
```

#### `append(field, value)` - Appends a value to a response header field.

```javascript
res.append("Set-Cookie", "username=Luna");
res.append("Set-Cookie", "email=luna@example.com");
// equivalent to:
res.set("Set-Cookie", ["username=Luna", "email=luna@example.com"]);
```

#### `remove(field)` - Removes a response header field.

```javascript
res.remove("Set-Cookie");
// equivalent to:
delete res.headers["set-cookie"];
```

#### `cookie(name)` - Gets a response cookie.

```javascript
var name = res.cookie("username");
// equivalent to:
var name = res.cookies.username;
```

#### `cookie(name, value, options?: object)` - Sets a response cookie.

```javascript
res.cookie("username", "Luna");
// equivalent to:
res.cookies.username = "Luna";

// you can set additinal options:
res.cookie("username", "Luna", { maxAge: 3600 });
// equivalent to:
res.cookies.username = new Cookie({ value: "Luna" , maxAge: 3600 });
```

Be aware, you cannot set value as `Luna; Max-Age=3600` with `res.cookie()`, it
will always be treated as cookie value.

#### `auth()` - Makes an HTTP basic authentication.

```javascript
if(!req.auth){ // Require authendication if haven't.
    res.auth();
}else{
    // ...
}
```

#### `unauth()` - Clears authentication.

Since browsers clear authentication while respond `401 Unauthorized`, so 
this method is exactly the same as `res.auth()`, only more readable.

#### `redirect(url, code?: 301 | 302)` - Redirects the request to a specified URL.

```javascript
res.redirect("/login"); // code is 302 by default.
// If you want to go back to the previous page, just pass url -1.
res.redirect(-1);
```

#### `send(data)` - Sends contents to the client.

This method will automatically perform type checking, If `data` is a buffer, 
the `res.type` will be set to `application/octet-stream`; if `data` is an 
object (or array), `res.type` will be set to `application/json`; if `data` is 
a string, the program will detect if it's `text/plain`, `text/html`, 
`application/xml`, or `application/json`.

This method also check if a response body has been modified since the last 
time, if `res.modified` is `false`, a `304 Not Modified` with no body will be 
sent.

```javascript
res.send("Hello, World!"); // text/plain
res.send("<p>Hello, World!</p>"); // text/html
res.send("<Text>Hello, World!</Text>"); // application/xml
res.send(`["Hello", "World!"]`); // application/json
res.send(["Hello", "World!"]); // application/json
res.send(Buffer.from("Hello, World!")); // application/octet-stream
```

This method could send jsonp response as well, if `res.jsonp` is set, or 
`options.jsonp` for the application is set and the query matches, a jsonp 
response will be sent, and the `res.type` will be set to 
`application/javascript`.

```javascript
res.jsonp = "callback";
res.send(["Hello", "World!"]); // will result as callback(["Hello", "World!"])
```

#### `sendFile(filename, cb?: (err)=>void)` - Sends a file as response body.

This method also performs type checking.

```javascript
res.sendFile("example.txt");
// if you provide a callback function, then it will be called after the 
// response has been sent, or failed.
res.sendFile("example.txt", (err)=>{
    console.log(err ? `Fail due to: ${err.message}`: "Success!");
});
```

#### `download(filename, newName?: string)` Performs a file download function.

This method uses `res.sendFile()` to transfer the file, but instead of 
displaying on the page, the browser will download it to disk.

```javascript
res.download("example.txt");
// You can set a new name if the original one is inconvenient.
res.download("1a79a4d60de6718e8e5b326e338ae533.txt", "example.txt");
```

Other forms:

- `download(filename, cb:? (err)=>void)`
- `download(filename, newName, cb:? (err)=>void)`

The callback function, will be called after the response has been sent, or 
failed.

Other than downloading a real file, you can perform downloading a string as a 
text file by using `res.attachment` and `res.send()`.

```javascript
// This content will be downloaded using the name 'example.html':
res.attachment = "example.html";
res.send("<p>Hello, World!</p>");
```

Worth mentioned, if you use `res.send()` to send a buffer, most browsers will 
download the buffer as a file, so it's always better to set `res.attachment` 
when you are sending buffers.

### About the next()

The function `next` returns a wrapper of the next handler, when it is called,
the returning value (if any) of the handler will be returned. This module 
will try to match as many routes as it can as long as you continue calling the
`next()`, so you must not call it unless you know what you're doing.

If you pass the `thisObj` to `next()`, then in the next handler function scope,
the pseudo-variable `this` will be pointed to `thisObj`, except in an arrow 
function, which always uses the origin `this` at where the function is defined.
If no `thisObj` passed, then the default `this` is the `App` instance.

Allowing you pass `thisObj` is meant to allow you bind a class method to the 
route, which always requires the `this` context available. Please see the 
following example:

```javascript

class Controller {
    constructor() {
        this.text = "Hello, World!";
    }

    index(req, res) {
        res.send(this.text);
    }
}

var app = new App;

app.get("/", (req, res, next) => {
    var ctrl = new Controller;
    ctrl.text = "<h1>Response comes from a controller.</h1>";
    next(ctrl);
}).get("/", Controller.prototype.index);
```

If you calling `Controller.prototype.index(...args)` directly, nothing will be
sent because there is no `this.text` at all. But using the mechanism of 
`Controller.prototype.index.call(new Controller, ...args)`, it will work fine.
The `next(new Controller)` is just doing the same thing for you internally.