# Webium

**一个小巧的微服务 Web 框架，使用路由和中间件。** [English](./README.md)

这个模块添加额外的属性和方法到 HTTP 服务器程序中相应的 `req` 和 `res` 对象上，来增强
程序的功能。用以增强的程序已经被分离为一个独立的模块
[enhance-req-res](https://github.com/hyurl/enhance-req-res)，它也能够工作在其他
框架或者内置的 Node.js HTTP/HTTPS/HTTP2 服务器上，你可以查阅它的文档，如果你想更好
地了解它。

这个模块同时拥有 **express** 和 **koa** 的风格，但仅保留了非常少而经常使用的方法。它
兼容大部分知名的 **connect** 和 express 中间件，因此你可以直接使用它们。

自 0.3.5 版本起，Webium 能够兼容使用 Node.js 内置的 **HTTP2** 服务器。

自 0.4.2 版本起，Webium 支持实现 [热重载](./hot-reloading.md)。

自 0.5.0 版本起，Webium 支持 **Flask**（一个 Python 的 web 框架）风格的路由绑定方式。
这意味着调用 `next()` 将是不必要的，并且可以直接从处理器函数中返回值给客户端。

## 安装

```sh
npm install webium
```

## 示例

```javascript
const { App, Router } = require("./");

var app = new App();

// Webium 支持动态加载路由，你可以先启动监听再绑定路由。
app.listen(80);

// 典型的 Express 风格
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

// Koa 风格：这个路由处理器函数包含了很多特性：使用 async/await，在真正执行操作前调用
// next() 函数，从处理器函数中返回值，以及对请求的整个生命周期捕获错误。
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

// Flask (Python) 风格：没有 next()，如果函数返回值，它将会被自动发送到响应流；如果
// 没有返回值，那么下一个处理器函数将会被自动调用，直到最后一个函数也被调用。这个特性
// 对普通函数、async 函数（或者任何返回 promise 的函数）都有效。
app.get("/send-returning", async () => {
    return "Hello, Webium!"; // the returning value will be sent automatically
});
app.get("/no-next", async (req) => {
    req.myVar = "Hello, Webium";
}).get("/no-next", (req) => {
    return req.myVar;
});

// 与另一个独立的路由实例相结合
var router = new Router();

router.get("/another-router", (req, res)=>{
    res.send("This is another router.");
});

app.use(router);

// 直接绑定正则表达式
app.get(/\S+\.html$/, () => {
    return "request an HTML file.";
});

// 这个路由将匹配任何 URL
app.get("*", () => {
    return "Unknown route.";
});
```

## API

### webium

一个命名空间，包含了 `App`, `Router` 和 `Cookie` 类，其中 `Cookie` 来自 
[sfn-cookie](https://github.com/hyurl/sfn-cookie) 模块，而 `App` 继承自
`Router`。

```javascript
const webium = require("webium");

// recommended:
const { App, Router, Cookie } = require("webium");
```

### Cookie

- `new Cookie(name: string, value: string, options?: object)`
    所有 `options` （选项）包括:
    - `maxAge: number` 该 cookie 应该存活的时长（秒）。
    - `expires: number|string|Date`: 保持存货到一个特定的日期或时间。
    - `sameSite`: 遵守 Same-Site 原则，可以是 `Strict` 或 `Lax`。
    - `domain`: 为指定的域名设置 cookie。
    - `path`: 为指定的路径设置 cookie。
    - `httpOnly`: 仅允许 HTTP，非 JavaScript，能够访问到这个 cookie。
    - `secure`: 该 cookie 在不是 HTTPS 协议时不会被（随请求）发送。
- `new Cookie(cookieStr: string)`
- `new Cookie(options: object)`
- `cookie.toString()` 获取当前实例序列化后的 cookie 字符串。

```javascript
var cookie1 = new Cookie("username=Luna"),
    cookie2 = new Cookie("username=Luna; Max-Age=120; HttpOnly"),
    cookie3 = new Cookie("username", "Luna"),
    cookie4 = new Cookie("username", "Luna", { maxAge: 120, httpOnly: true }),
    cookie4 = new Cookie({ name: "username", value: "Luna", maxAge: 120, httpOnly: true });
```

### Router

#### `new Router(caseSensitive?: boolean)`

创建一个可以被 `App` 使用的路由实例。`caseSensitive` 为 `true` 时，程序将会在检测
URL 时严格区分大小写。

```javascript
const { App, Router } = require("webium");

var app = new App,
    router = new Router;

// ...

app.use(router);
```

#### `router.use()`

添加一个处理器函数到中间件队列中，或者合并另一个路由实例。

**签名:**

- `use(handler: RouteHandler): this`
- `use(router: Router): this`

类型 `RouteHandler` 是一个函数，其签名如下:

- `(req: Request, res: Response: next(thisObj: any) => any) => any`

```javascript
router.use((req, res, next) => {
    // ...
    next();
});

var router2 = new Router;
router2.use(router);
```

注意，如果你 `use` 了另一个路由实例，然而当前有相同名称的路由，那么仅它们的处理器函数
会被合并。如果那个路由实例设置的路由不在当前实例上，那么相应的引用就会被建立，这意味着
如果你修改了那个实例中的路由，当前实例也会被同时影响。

中间件会在所有路由之前被调用，而在合并路由时，中间件总是会被合并。

#### `method(name: string, path: string, handler: RouteHandler): this`

添加一个处理器函数到特定的（HTTP 请求）方法和路径上。

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

使用 `express` 风格的 `path`，将会由 
[path-to-regexp](https://github.com/pillarjs/path-to-regexp) 模块来进行解析，你
可以通过它的文档来了解更多细节。

如果提供了参数 `unique`，这意味着路由应该只包含一个处理器函数，并且新的函数将会替换旧的。

#### `delete(path: string, handler: RouteHandler, unique?: boolean): this`

简写 `router.method("DELETE", path, handler, unique)`.

#### `get(path: string, handler: RouteHandler, unique?: boolean): this`

简写 `router.method("GET", path, handler, unique)`.

#### `head(path: string, handler: RouteHandler, unique?: boolean): this`

简写 `router.method("HEAD", path, handler, unique)`.

#### `patch(path: string, handler: RouteHandler, unique?: boolean): this`

简写 `router.method("PATCH", path, handler, unique)`.

#### `post(path: string, handler: RouteHandler, unique?: boolean): this`

简写 `router.method("POST", path, handler, unique)`.

#### `put(path: string, handler: RouteHandler, unique?: boolean): this`

简写 `router.method("PUT", path, handler, unique)`.

#### `all(path: string, handler: RouteHandler, unique?: boolean): this`

添加一个处理器函数到所有（HTTP 请求）方法中。

**别名:**

- `any()`

### App

`App` 类继承自 `Router`。

#### `new App(options?: AppOptions)`

接口 `AppOptions` 包含着:

- `domain` 设置一个主域名（或者用数组设置多个域名），以便程序能够找出访问时使用的
    子域名。
 - `useProxy` 如果为 `true`，当访问属性如 `req.ip` 和 `req.host` 时，将首先尝试从
    代理中获取信息。默认为 `false`。
- `capitalize` 自动对响应头字段使用首字母大写，默认为 `true`。
- `cookieSecret` 一个用来签名/反签名 cookie 值得密钥。
- `jsonp` 为 jsonp 设置一个URL 查询名称，如果需要。如果设置为 `true`，则该名称将会
    是 `jsonp`，在查询字符串中，使用 `jsonp=callback` 的形式来获取 jsonp 响应。
- `caseSensitive` 设置路由是大小写敏感的。

这个模块同时会使用 [body-parser](https://github.com/expressjs/body-parser) 模块
来自动解析请求体，当 `Content-Type` 为 
`application/x-www-form-urlencoded` 或 `application/json` 时，因此其他能够在 
*body-parser* 中使用的设置项也可以被设置到 `options` 中。

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

请查阅 [http.listen()](https://nodejs.org/dist/latest-v8.x/docs/api/http.html#http_server_listen).

#### `close()`

关闭由 `app.listen()` 启动的服务器。

#### `handler` or `listener`

返回为 HTTP/HTTPS/HTTP2 服务器设置的处理器函数，你可以将它使用在 `https` 或 `http2`
中。

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

如果发生任何错误，这个函数就会被调用，你可以重载这个函数来使它更适合你的需求。

```javascript
var app = new App();

// If the default function doesn't fulfill your needs, you can simply just 
// overwrite it.
app.onerror = function (err, req, res) {
    // ...
};
```

### Request

`Request` 接口扩展了 `IncomingMessage`/`Http2ServerRequest`，增加了更多的属性和
方法。

这些属性中的一部分是只读的，这意味着你将无法修改它们。

- `stream` 用以支持请求的 `Http2Stream` 对象（仅 http2）。
- `urlObj` 一个由 [url6](https://github.com/hyurl/url6) 模块解析的包含 URL 信息
    的对象。需要注意 `urlObj.auth`，它实际上是通过 `Basic Authendication` 来发送
    的。
- `time` 请求时间，并不是真正意义上连接发生的时间，而是这个模块开始工作的时刻。
- `proxy` 如果客户端通过一个代理服务器来进行请求，这个属性就会被设置，否则它为 
    `null`。当可用时，它可能携带着这些属性：
    - `protocol` 客户端的真实请求协议 (`x-forwarded-proto`)。
    - `host` 客户端尝试请求的真实主机名 (`x-forwarded-host`)。
    - `ip` 客户端的真实 IP (`ips[0]`)。
    - `ips` 一个数组，携带着所有的 IP 地址，包括客户端和所有代理服务器的地址
        (`x-forwarded-for`)。
- `auth` 客户端的认证信息，它可能是 null，或者一个包含 `{ username, password }` 的
    对象。
- `protocol` `http` 或 `https`，如果 `useProxy` 为真，则首先尝试使用 `proxy` 的
    `protocol` 属性。
- `secure` 如果 `protocol` 为 `https`，则为 `true`，否则为 `false`。
- `host` 请求的主机地址（包含 `hostname` 和 `port`），如果 `useProxy` 为真，则首先
    尝试使用 `proxy` 的 `host` 属性。
- `hostname` 请求的主机名（不包含 `port`）。
- `port` 请求的端口。
- `domainName` 请求的域名。
- `subdomain` 不同于 **express** 或 **koa** 的 `subdomains` 属性，这个属性是通过
    设置的 `domain` 选项来计算出来的。
- `path` 完整的请求路径（包含 `search`）。
- `pathname` 请求地址的目录部分（不包含 `search`）。
- `search` 请求 URL 中的查询字符串，包含开头的 `?`。
- `query` 解析后的查询对象。
- `href` 完整的请求 URL 字符串（不包括 `hash`，它并不会被客户端发送）。
- `referer` 相等于 `headers.referer`。
- `origin` 和 `headers.origin` 或 `urlObj.origin` 相同。
- `type` 请求体的 `Content-Type`（不包含 `charset`）。
- `charset` 请求体的字符集，或第一个接受的字符集（`charsets`），假设它们都使用相同
    的字符集。和其他属性不同，如果你设置其为一个合法的字符集，它将会被用来解码请求体。
- `charsets` 一个数组，携带着所有的 `Accept-Charset` 值，通过权重进行排序。
- `length` 请求体的长度（`Content-Length`）。
- `xhr` 请求是否设置了请求头 `X-Requested-With: XMLHttpRequest`。
- `cookies` 一个携带着所有解析后 cookie 的对象。
- `params` 解析得到的 URL 参数。
- `body` 一个携带着请求体的对象，请求体由 
    [body-parser](https://github.com/expressjs/body-parser) 模块负责解析。记住，
    默认只有 `json` 和 `x-www-form-urlencoded` 才会被解析。
- `ip` 客户端的真实 IP，如果 `useProxy` 为 `true`，则首先尝试使用 `proxy` 的 `ip`
    属性。
- `ips` 一个携带着所有 IP 地址的数组，包括客户端地址和代理服务器地址。和 `proxy.ips`
    不同，它可能为 `undefined`，而这个属性则始终可用。
- `accept` 第一个可接受的响应内容类型（`accepts[0]`）。
- `accepts` 一个携带着所有可接受响应内容类型（`Accept`）的的数组，通过权重进行排序。
- `lang` 第一个可接受的响应内容语言（`accepts[0]`）。
- `langs` 一个携带着所有可接受响应内容语言（`Accept-Language`）的数组，通过权重进行
    排序。
- `encoding` 第一个可接受的响应内容编码（`encodings[0]`）。 
- `encodings` 一个携带着所有可接受响应内容语言（`Accept-Encoding`）的数组，通过权重
    进行排序。
- `cache` 由客户端发送的 `Cache-Control` 头信息，它可能是 `null`（`no-cache`）、
    一个数字（`number`）代表秒数（`max-age`）或者一个字符串如 `private`、`public` 
    等。
- `keepAlive` 请求是否设置了请求头 `Connection: keep-alive`。
- `get(field)` 获取一个请求头字段的值（大小写不敏感）。
- `is(...types)` 检查请求头中的 `Content-Type` 是否和给出的类型相同，可以使用简写
    的关键词，如 `html` 代表 `text/html`。如果通过，返回第一个匹配的类型。

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

`Response` 接口扩展了 `ServerResponse`/`Http2ServerResponse`，添加了更多属性和
方法。

它的绝大多数属性都是 setter/getter，如果你对它们赋予新值，那将确实有些意义。

#### `stream` - 用以支持响应的 `Http2Stream` 对象（仅 http2）

这个属性是只读的。

```javascript
res.stream.push("some thing");
```

#### `code` - 设置/获取状态码

```javascript
res.code = 200;
console.log(res.code); // => 200
```

#### `message` - 设置/获取状态信息

```javascript
res.message = "OK";
console.log(res.message); // => OK
```

#### `status` - 设置/获取状态码和信息

```javascript
res.status = 200;
console.log(res.status); // => 200 OK

res.status = "200 Everything works fine.";
console.log(res.status); // => 200 Everything works fine.
console.log(res.code); // => 200
console.log(res.message); // => Everything works fine.
```

#### `type` - 设置/获取 `Content-Type` 而不包括 `charset` 部分

```javascript
res.type = "text/html";
res.type = "html"; // Will auto lookup to text/html.
console.log(res.type); // => text/html
```

#### `charset` - 设置/获取 `Content-Type` 中仅 `charset` 部分

```javascript
res.charset = "UTF-8";
console.log(res.charset); // => UTF-8
```

#### `length` 设置/获取 `Content-Length`

```javascript
res.length = 12;
console.log(res.length); // => 12
```

#### `encoding` 设置/获取 `Content-Encoding`

```javascript
res.encoding = "gzip";
console.log(res.encoding); // => gzip
```

#### `date` - 设置/获取 `Date`

```javascript
res.date = new Date(); // You can set a date string or Date instance.
console.log(res.date); // => Fri, 15 Dec 2017 04:13:17 GMT
```

#### `etag` 设置/获取 - `Etag`

当调用 `res.send()` 方法时，这个属性是内部使用的，如果你不使用 `res.send()`，你也
可以手动调用它。

```javascript
const etag = require("etag");

var body = "Hello, World!";
res.etag = etag(body);
console.log(res.etag); // => d-CgqfKmdylCVXq1NV12r0Qvj2XgE
```

#### `lastModified` - 设置/获取 `Last-Modified`

```javascript
res.lastModified = new Date(2017); // You can set a date string or Date instance.
console.log(res.lastModified); // => Thu, 01 Jan 1970 00:00:02 GMT
```

#### `location` - 设置/获取 `Location`

```javascript
res.location = "/login";
console.log(res.location); // => /login
```

#### `refresh` - 设置/获取 `Refresh` 为一个表示秒数的数字

```javascript
res.refresh = 3; // The page will auto-refresh in 3 seconds.
res.refresh = "3; URL=/logout"; // Auto-redirect to /logout in 3 seconds.
console.log(res.refresh); // => 3; URL=/logout
```

#### `attachment` - 设置/获取 `Content-Disposition` 为一个文件名

```javascript
res.attachment = "example.txt";
console.log(res.attchment); // => attachment; filename="example.txt"
```

#### `cahce` - 设置/获取 `Cache-Control`

```javascript
res.cache = null; // no-cache
res.cache = 0; // max-age=0
res.cache = 3600; // max-age=3600
res.cache = "private";
console.log(res.cache); // private
```

#### `vary` - 设置/获取 `Vary`

```javascript
res.vary = "Content-Type";
res.vary = ["Content-Type", "Content-Length"]; // Set multiple fields.
console.log(res.vary); // => [Content-Type, Content-Length]
```

#### `keepAlive` - 设置/获取 `Connection`

```javascript
res.keepAlive = true; // Connection: keep-alive
console.log(res.keepAlive); // => true
```

#### `modified` - 是否响应内容已经被改变

这个属性是只读的，且仅当 `res.etag` 和 `res.lastModefied` 被设置（无论是显示地还是
隐式地）之后才有效。

```javascript
res.send("Hello, World!");

if (res.modified) {
    console.log("A new response has been sent to the client.");
} else {
    console.log("A '304 Not Modified' response has been sent to the client");
}
```

#### `headers` - 设置/获取响应头

这个属性是一个 `Proxy` 实例，你只能通过操作它的属性来设置头字段。

```javascript
res.headers["x-powered-by"] = "Node.js/8.9.3";
console.log(res.headers); // => { "x-powered-by": "Node.js/8.9.3" }

// If you want to delete a heder, just call:
delete res.headers["x-powered-by"];
```

#### `cookies` - 设置/获取响应 cookie

这个属性是一个 `Proxy` 实例，你只能通过操作它的属性来设置 cookie。

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

#### `get(field)` - 获取一个响应头字段的值

```javascript
var type = res.get("Content-Type");
// equivalent to 
var type = req.headers["content-type"];
```

#### `set(field, value)` - 设置一个响应头字段的值

```javascript
res.set("Content-Type", "text/html");
// equivalent to:
res.headers["content-type"] = "text/html";
```

#### `append(field, value)` - 追加一个值到一个响应头字段中

```javascript
res.append("Set-Cookie", "username=Luna");
res.append("Set-Cookie", "email=luna@example.com");
// equivalent to:
res.set("Set-Cookie", ["username=Luna", "email=luna@example.com"]);
```

#### `remove(field)` - 移除一个响应头字段

```javascript
res.remove("Set-Cookie");
// equivalent to:
delete res.headers["set-cookie"];
```

#### `cookie(name)` -设置一个响应 cookie

```javascript
var name = res.cookie("username");
// equivalent to:
var name = res.cookies.username;
```

#### `cookie(name, value, options?: object)` - 设置一个响应 cookie

```javascript
res.cookie("username", "Luna");
// equivalent to:
res.cookies.username = "Luna";

// you can set additinal options:
res.cookie("username", "Luna", { maxAge: 3600 });
// equivalent to:
res.cookies.username = new Cookie({ value: "Luna" , maxAge: 3600 });
```

注意，你不能使用 `res.cookie()` 设置值为 `Luna; Max-Age=3600` 这样的形式，它将会
始终被当作 cookie 值来处理。

#### `auth()` - 要求进行一次 HTTP 基本认证

```javascript
if(!req.auth){ // Require authendication if haven't.
    res.auth();
}else{
    // ...
}
```

#### `unauth()` - 清除 HTTP 基本认证

由于浏览器会在响应状态为 `401 Unauthorized` 时清除认证信息，因此这个方法是和 
`res.auth()` 一摸一样的，只是更具可读性。

#### `redirect(url, code?: 301 | 302)` - 重定向请求到一个指定的 URL 上

```javascript
res.redirect("/login"); // code is 302 by default.
// If you want to go back to the previous page, just pass url -1.
res.redirect(-1);
```

#### `send(data)` - 发送内容到客户端

这个方法会自动地进行类型检测，如果 `data` 是一个 buffer，那么 `res.type` 将会被设置
为 `application/octet-stream`；如果 `data` 是一个对象（或数组），`res.type` 将会
被设置为 `application/json`；如果 `data` 是一个字符串，程序将会检测它是否为 
`text/plain`、`text/html`、`application/xml` 或 `application/json`。

这个方法同时检测响应主体较上一次是否已经被改变，如果 `res.modified` 为 `false`，
一个 `304 Not Modified` 响应将会被发送。

```javascript
res.send("Hello, World!"); // text/plain
res.send("<p>Hello, World!</p>"); // text/html
res.send("<Text>Hello, World!</Text>"); // application/xml
res.send(`["Hello", "World!"]`); // application/json
res.send(["Hello", "World!"]); // application/json
res.send(Buffer.from("Hello, World!")); // application/octet-stream
```

这个方法也可以用来发送 JSONP 响应，如果 `res.jsonp` 被设置，或者应用地 
`options.jsonp` 被设置并且 URL 查询对象匹配，那么一个 JSONP 响应将会被发送，并且
`res.type` 也会被设置为 `application/javascript`。

```javascript
res.jsonp = "callback";
res.send(["Hello", "World!"]); // will result as callback(["Hello", "World!"])
```

#### `sendFile(filename, cb?: (err)=>void)` - 将一个文件作为响应内容发送

这个方法也提供类型检测。

```javascript
res.sendFile("example.txt");
// if you provide a callback function, then it will be called after the 
// response has been sent, or failed.
res.sendFile("example.txt", (err)=>{
    console.log(err ? `Fail due to: ${err.message}`: "Success!");
});
```

#### `download(filename, newName?: string)` - 执行一个文件下载功能

这个方法使用 `res.sendFile()` 来传输文件，但浏览器不会将其显示在网页中，而是将其下载
到磁盘中。

```javascript
res.download("example.txt");
// You can set a new name if the original one is inconvenient.
res.download("1a79a4d60de6718e8e5b326e338ae533.txt", "example.txt");
```

其他形式：

- `download(filename, cb:? (err)=>void)`
- `download(filename, newName, cb:? (err)=>void)`

这个回调函数，将会在响应被发送后被调用，或者在失败时被调用。

除了下载一个真实的文件，你还可以执行下载一个字符串作为文本文件，通过组合使用 
`res.attachment` 与 `res.send()` 实现。

```javascript
// This content will be downloaded using the name 'example.html':
res.attachment = "example.html";
res.send("<p>Hello, World!</p>");
```

值得一提的是，如果你使用 `res.send()` 来发送一个 buffer，绝大多数浏览器会将其下载为
文件，因此当你确实要发送 buffer 时，最好设置 `res.attachment`。

### 关于 next()

函数 `next` 返回下一个处理器函数的包装器，当它被调用时，处理器函数的返回值（如果有）
将会被返回。这个模块将会尝试匹配尽量多的路由，只要你继续调用 `next()`，因此你一定不要
调用它，除非你知道自己在做什么。

如果你传递 `thisObj` 到 `next()` 函数中，那么在下一个处理器函数的作用域内，伪变量
`this` 将会被指向 `thisObj`，除非是在一个箭头函数内，其永远使用它所在被定义的地方的
原始 `this`。如果 `thisObj` 没有传递，那么默认的 `this` 则为 `App` 实例。

允许你传递 `thisObj` 的意义是允许你绑定一个类方法到路由中，它永远要求有一个可用的 
`this` 上下文语境。请看下面的示例：

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

如果你直接调用 `Controller.prototype.index(...args)`，那将不会发送任何东西，因为
根本就不存在 `this.text`。但是使用 
`Controller.prototype.index.call(new Controller, ...args)` 的机制，它则会运行
良好。`next(new Controller)` 仅仅只是在内部为你做这样的工作。