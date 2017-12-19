import { IncomingMessage, ServerResponse } from "http";
import { URL } from "url";
import connect from "connect";

declare class Request extends IncomingMessage {
    /**
     * An object parsed by `url` module for both new API and legacy API. be 
     * aware of `URL.auth`, which is actually sent by http 
     * `Basic Authendication`.
     */
    URL: URL;

    /**
     * Request time, not really connection time, but the moment this module 
     * performs actions.
     */
    time: number;

    /**
     * If the client requested via a proxy server, this property will be set, 
     * otherwise it's `null`. If available, it may contain these properties:
     * - `protocol` The client's real request protocol (`x-forwarded-proto`).
     * - `host` The real host that client trying to request (`x-forwarded-host`).
     * - `ip`: The real IP of client (`ips[0]`).
     * - `ips`: An array carries all IP addresses, includes client IP and proxy 
     *   server IPs (`x-forwarded-for`).
     */
    proxy: {
        protocol: string,
        host: string,
        ip: string,
        ips: string[]
    } | void;

    /**
     * Authentication of the client, it could be `null`, or an object carries 
     * `{ username, password }`.
     */
    auth: { username: string, password: string } | void;

    /**
     * Either `http` or `https`, if `useProxy` is true, then trying to use 
     * `proxy`'s `protocol` first.
     */
    protocol: string;

    /** If `protocol` is `https`, then `true`, otherwise `false`. */
    secure: boolean;

    /**
     * The requested host address (including `hostname` and `port`), if 
     * `useProxy` is true, then try to use `proxy`'s `host` first.
     */
    host: string;

    /** The requested host name (without `port`). */
    hostname: string;

    /** The requested port. */
    port: number;

    /**
     * Unlike **express** or **koa**'s `subdomains`, this property is 
     * calculated by setting the `domain` option, and it's a string.
     */
    subdomain: string;

    /** Full requested path (with `search`). */
    path: string;

    /** Directory part of requested path (without `search`). */
    pathname: string;

    /** The requested URL `search` string, with a leading `?`. */
    serch: string;

    /**
     * Parsed URL query object, if you want to get original string, use 
     * `URL.query` instead.
     */
    query: { [param: string]: string };

    /**
     * Full requested URL string (without `hash`, which is not sent by the
     * client).
     */
    href: string;

    /** Equivalent to `headers.referer`. */
    referer: string;

    /** Reference to `headers.origin` or `URL.origin`. */
    origin: string;

    /** The `Content-Type` requested body (without `charset`). */
    type: string;

    /**
     * The requested body's `charset`, or the first accepted charset
     * (`charsets[0]`), assume they both use a same charset. Unlinke other
     * properties, you can set this one to a valid charset, it will be used to
     * decode request body.
     */
    charset: string;

    /** An array carries all `Accept-Charset`s, ordered by `q`ualities. */
    charsets: string[];

    /** The `Content-Length` of requested body. */
    length: number;

    /** An object carries all parsed `Cookie`s sent by the client. */
    cookies: { [name: string]: string };

    /** 
     * By default, only `application/json` and `application/x-www-form-urlencoded`
     * request bodies are parsed.
     */
    body: { [x: string]: string };

    /**
     * The real client IP, if `useProxy` is `true`, then trying to use 
     * `proxy`'s `ip` first.
     */
    ip: string;

    /**
     * An array carries all IP addresses, includes client IP and proxy
     * server IPs. Unlike `proxy.ips`, which may be `undefined`, while this
     * will always be available.
     */
    ips: string[];

    /** The first accepted response content type (`accepts[0]`). */
    accept: string;

    /** An array carries all `Accept`s types, ordered by `q`ualities. */
    accepts: string[];

    /** The first accepted response language (`accepts[0]`). */
    lang: string;

    /** An array carries all `Accept-Language`s, ordered by `q`ualities. */
    langs: string[];

    /** The first accepted response encodings (`encodings[0]`). */
    encoding: string;

    /** An array carries all `Accept-Encoding`s, ordered by sequence. */
    encodings: string[];

    /** Whether the request fires with `X-Requested-With: XMLHttpRequest`. */
    xhr: boolean;

    /** Whether the request fires with `Connection: keep-alive`. */
    keepAlive: boolean;

    /**
     * `Cache-Control` sent by the client, it could be `null` (`no-cache`), a 
     * `number` of seconds (`max-age`), or a string `private`, `public`, etc.
     */
    cache: string | number | void;

    /**
     * Gets a request header field's (case insensitive) value.
     * @param field 
     */
    get(field: string): string | void;

    /**
     * Checks if the request `Content-Type` matches the given types, 
     * avaialable of using short-hand words, like `html` indicates 
     * `text/html`. If pass, returns the first matched type.
     * @param types 
     */
    is(...types: string[]): string | false;
}

declare class Response extends ServerResponse {
    /** Set/Get status code. */
    code: number;

    /** Set/Get status message. */
    message: string;

    /** Set/Get both status code and message. */
    status: number | string;

    /** Set/Get `Content-Type` without `charset` part. */
    type: string;

    /** Set/Get `Content-Type` only with `charset` part. */
    charset: string;

    /** Set/Get `Content-Length`. */
    length: number;

    /** Set/Get `Content-Encoding`. */
    encoding: string;

    /** Set/Get `Date`. */
    date: string | Date;

    /** Set/Get - `Etag`. */
    etag: string;

    /** Set/Get `Last-Modified`. */
    lastModified: string | Date;

    /** Set/Get `Location`. */
    location: string;

    /** 
     * Set/Get `Refresh` as a number of seconds.
     * 
     * Example:
     * 
     *      res.refresh = 3; // The page will auto-refresh in 3 seconds.
     *      // Auto-redirect to /logout in 3 seconds:
     *      res.refresh = "3; URL=/logout";
     *      console.log(res.refresh); // => 3; URL=/logout
     */
    refresh: number;

    /** 
     * Set/Get `Content-Disposition` with a filename.
     * 
     * Example:
     * 
     *      res.attachment = "example.txt";
     *      console.log(res.attchment); // => attachment; filename="example.txt"
     * */
    attachment: string;

    /** 
     * Set/Get `Cache-Control`.
     * 
     * Example:
     * 
     *      res.cache = null; // no-cache
     *      res.cache = 0; // max-age=0
     *      res.cache = 3600; // max-age=3600
     *      res.cache = "private";
     *      console.log(res.cache); // private
     */
    cache: string | number | boolean;

    /** 
     * Set/Get `Vary`.
     * 
     * Example:
     * 
     *      res.vary = "Content-Type";
     *      res.vary = ["Content-Type", "Content-Length"];
     *      console.log(res.vary); // => Content-Type, Content-Length
     */
    vary: string | string[];

    /** Set/Get `Connection` to `keep-alive`. */
    keepAlive: boolean;

    /** 
     * Whether the response has been modified.
     * 
     * This property is read-only, and only available after `res.atag` and
     * `res.lastModified` are set (whether explicitly or implicitly).
     */
    modfied: boolean;

    /**
     * Set/Get response headers.
     * 
     * This property is a Proxy instance, and itself is read-only, you can 
     * only manipulate its properties to set headers.
     * 
     * Example:
     * 
     *      res.headers["x-powered-by"] = "Node.js/8.9.3";
     *      console.log(res.headers); // => { "x-powered-by": "Node.js/8.9.3" }
     *      
     *      // If you want to delete a heder, just call:
     *      delete res.headers["x-powered-by"];
     */
    headers: { [x: string]: string | number | Date };

    /**
     * Set/Get response cookies.
     *
     * This property is a Proxy instance, and itself is read-only, you can 
     * only manipulate its properties to set cookies.
     * 
     * Example:
     * 
     *      res.cookies.username = "Luna";
     *      res.cookies.username = "Luna; Max-Age=3600";
     * 
     *      res.cookies.username = new Cookie({ value: "Luna", maxAge: 3600 });
     * 
     *      console.log(res.cookies); // => { username: "Luna" }
     * 
     *      // If you want to delete a cookie, just call:
     *      delete res.cookies.username;
     *      // This may be more convinient if you just wnat it to expire:
     *      res.cookies.username = null;
     */
    cookies: { [name: string]: string | Cookie };

    /** Gets a response header field's value. */
    get(field: string): string | void;

    /** Sets a response header field's value. */
    set(field: string, value: string | string[] | Date): void;

    /** 
     * Appends a value to a response header field.
     * 
     * Example:
     * 
     *      res.append("Set-Cookie", "username=Luna");
     *      res.append("Set-Cookie", "email=luna@example.com");
     */
    append(field: string, value: string | string[] | Date): void;

    /** Removes a response header field. */
    remove(field: string): void;

    /** Gets a response cookie. */
    cookie(name: string): string | void;

    /**
     * Sets a response cookie.
     * 
     * Example:
     * 
     *      res.cookie("username", "Luna");
     * 
     *      res.cookie("username", "Luna", { maxAge: 3600 });
     */
    cookie(name: string, value: string, options?: {
        value: string | number,
        maxAge: number,
        expires: string | number | Date,
        sameSite: boolean,
        domain: string,
        path: string,
        httpOnly: boolean,
        secure: boolean
    }): void;

    /** 
     * Makes an HTTP basic authentication.
     * 
     * Example:
     * 
     *      if(!req.auth){ // Require authendication if haven't.
     *          res.auth();
     *      }else{
     *           // ...
     *      }
     * */
    auth(realm: string): void;

    /** Clears authentication. */
    unauth(): void;

    /** 
     * Redirects the request to a specified URL.
     * @param url Set `url` to `-1` will go back to the previous page.
     * @param code Default: `302`.
     */
    redirect(url: string | -1, code?: 301 | 302): void;

    /**
     * Sends contents to the client.
     * 
     * This method will automatically perform type checking, If `data` is a 
     * buffer, the `res.type` will be set to `application/octet-stream`; if 
     * `data` is an object (or array), `res.type` will be set to 
     * `application/json`; if `data` is a string, the program will detect if 
     * it's `text/plain` `text/html`, `application/xml`, or `application/json`.
     *
     * This method also check if a response body has been modified or not, if
     * `res.modified` is `false`, a `304 Not Modified` with no body will be 
     * sent.
     * 
     * This method could send jsonp response as well, if `res.jsonp` is set, 
     * or `options.jsonp` for the application is set and the query matches, a 
     * jsonp response will be sent, and the `res.type` will be set to 
     * `application/javascript`.
     * 
     * Example:
     * 
     *      res.send("Hello, World!"); // text/plain
     *      res.send("<p>Hello, World!</p>"); // text/html
     *      res.send("<Text>Hello, World!</Text>"); // application/xml
     *      res.send(`["Hello", "World!"]`); // application/json
     *      res.send(["Hello", "World!"]); // application/json
     * 
     *      // application/octet-stream
     *      res.send(Buffer.from("Hello, World!"));
     * 
     *      res.jsonp = "callback";
     *      // will result as callback(["Hello", "World!"])
     *      res.send(["Hello", "World!"]);
     */
    send(data: any): void;

    /**
     * Sends a file as response body.
     * 
     * This method also performs type checking.
     * 
     * Example:
     * 
     *      res.sendFile("example.txt");
     *      // if you provide a callback function, then it will be called 
     *      // after the response has been sent, or failed.
     *      res.sendFile("example.txt", (err)=>{
     *          console.log(err ? `Fail!`: "Success!");
     *      });
     */
    sendFile(filename: string, cb?: (err: Error) => void): void;

    /**
     * Performs a file download function.
     * 
     * Example:
     * 
     *      res.download("example.txt");
     */
    download(filename: string, cb?: (err: Error) => void): void;

    /**
     * Performs a file download function, and set a new name to the response.
     * 
     * Example:
     * 
     *      res.download("1a79a4d60de6718e8e5b326e338ae533.txt", "example.txt");
     */
    download(filename: string, newName: string, cb?: (err: Error) => void): void;
}

declare namespace webium {
    class Cookie {
        /**
         * Example:
         * 
         *      new Cookie("username=Luna");
         *      new Cookie("username=Luna; Max-Age=120; HttpOnly");
         */
        constructor(cookieStr: string);

        /**
         * Example:
         * 
         *      new Cookie("username", "Luna");
         *      new Cookie("username", "Luna", {
         *          maxAge: 120,
         *          httpOnly: true
         *      });
         */
        constructor(name: string, value: string, options?: {
            maxAge: number,
            expires: string | number | Date,
            sameSite: boolean,
            domain: string,
            path: string,
            httpOnly: boolean,
            secure: boolean
        });

        /**
         * Example:
         * 
         *      new Cookie({
         *          name: "username",
         *          value: "Luna",
         *          maxAge: 120,
         *          httpOnly: true
         *      });
         */
        constructor(options: {
            name: string,
            value: string | number,
            maxAge: number,
            expires: string | number | Date,
            sameSite: boolean,
            domain: string,
            path: string,
            httpOnly: boolean,
            secure: boolean
        });

        /** Gets the serialized cookie string of the current instance. */
        toString(): string;

        /** Serializes an object or Cookie instance to a valid cookie string. */
        static serialize(cookie: Cookie | {
            name: string,
            value: string | number,
            maxAge: number,
            expires: string | number | Date,
            sameSite: boolean,
            domain: string,
            path: string,
            httpOnly: boolean,
            secure: boolean
        }): string;

        /** Parses a cookie string to a Cookie instance. */
        static parse(cookieStr: string): Cookie | void;

        /** 
         * Parses a string as multiple cookies, useful for parsing
         * `document.cookie` and `req.headers.cookie`.
         */
        static parseMany(str: string): Cookie[];
    }

    class App extends connect {
        /**
         * @param options Include:
         *  - `domain` Set a domain name for finding out the subdomain.
         *  - `useProxy` If `true`, when access properties like `req.ip` and
         *      `req.host`, will firstly try to get info from proxy, default: 
         *      `false`.
         *  - `capitalize` Auto-capitalize response headers when setting, 
         *      default: `true`.
         *  - `cookieSecret` A secret key to sign/unsign cookie values.
         *  - `jsonp` Set a default jsonp callback name if you want.
         * 
         *  This argument will also be used by module `body-parser`, so any 
         *  other options valid for `body-parser` can also be set.
         */
        constructor(options?: {
            domain: string,
            useProxy: boolean,
            capitalize: boolean,
            cookieSecret: string,
            jsonp: string
        }): App;

        /**
         * Adds a middleware to the app.
         * 
         * Example:
         * 
         *      var app = new App();
         *      app.use((req, res, next) => {
         *          // ...
         *          next();
         *      });
         */
        use(fn: (req: Request, res: Response, next?: Function) => void): this;

        /**
         * Adds a middleware to the app and binds it to a specific route.
         */
        use(route: string, fn: (req: Request, res: Response, next?: Function) => void): this;

        /**
         * Listen for connections.
         *
         * This method takes the same arguments as node's `http.Server#listen()`.
         * 
         * Example:
         * 
         *      var app = new App();
         *      app.lesten(80);
         *
         * HTTP and HTTPS:
         *
         * If you run your application both as HTTP and HTTPS you may wrap them 
         * individually, since your app is really just a JavaScript `Function`.
         *
         *      const http = require('http');
         *      const https = require('https');
         * 
         *      http.createServer(app).listen(80);
         *      https.createServer(options, app).listen(443);
         */
        listen(port: number, hostname?: string, backlog?: number, callback?: Function): this;
        listen(port: number, hostname?: string, callback?: Function): this;
        listen(path: string, callback?: Function): this;
        listen(handle: any, listeningListener?: Function): this;
    }
}

export = webium;