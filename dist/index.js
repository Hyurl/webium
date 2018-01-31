"use strict";
const enhance = require("enhance-req-res");
const pathToRegexp = require("path-to-regexp");
const http_1 = require("http");
const bodyParser = require("body-parser");
var webium;
(function (webium) {
    class Cookie extends enhance.Cookie {
    }
    webium.Cookie = Cookie;
    webium.AppOptions = {
        domain: "",
        useProxy: false,
        capitalize: true,
        cookieSecret: "",
        jsonp: false,
        caseSensitive: false
    };
    class Router {
        /**
         * Creates a new router that can be used by the `App`.
         * @param caseSensitive Set the routes to be case-sensitive.
         */
        constructor(caseSensitive = false) {
            this.middleware = [];
            this.paths = [];
            this.stacks = [];
            this.caseSensitive = caseSensitive;
        }
        use(arg) {
            if (arg instanceof Router) {
                let router = arg;
                // Attach middleware
                Object.assign(this.middleware, router.middleware);
                // Attach routes
                for (let i in router.paths) {
                    let j = this.paths.indexOf(router.paths[i]);
                    if (j >= 0) {
                        let stack = router.stacks[i], _stack = this.stacks[j];
                        for (let method in stack.handlers) {
                            _stack.handlers[method] = Object.assign(_stack.handlers[method] || [], stack.handlers[method]);
                        }
                    }
                    else {
                        this.paths.push(router.paths[i]);
                        this.stacks.push(router.stacks[i]);
                    }
                }
            }
            else if (arg instanceof Function) {
                this.middleware.push(arg);
            }
            else {
                throw new TypeError("The argument passed to '" +
                    this.constructor.name +
                    ".use()' must be a function or an instance of Router.");
            }
            return this;
        }
        /**
         * Adds a handler function to a specified method and path.
         * @param name GET, POST, HEAD, etc.
         * @param path The URL path.
         */
        method(name, path, handler) {
            if (typeof handler !== "function")
                throw new TypeError("The handler must be a function.");
            let i = this.paths.indexOf(path);
            if (i === -1) {
                i = this.paths.length;
                let params = [];
                this.paths.push(path);
                this.stacks.push({
                    regexp: pathToRegexp(path, params, {
                        sensitive: this.caseSensitive
                    }),
                    params,
                    handlers: {}
                });
            }
            if (this.stacks[i].handlers[name] === undefined) {
                this.stacks[i].handlers[name] = [];
            }
            this.stacks[i].handlers[name].push(handler);
            return this;
        }
        /** Adds a handler function to the `DELETE` method. */
        delete(path, handler) {
            return this.method("DELETE", path, handler);
        }
        /** Adds a handler function to the `GET` method. */
        get(path, handler) {
            return this.method("GET", path, handler);
        }
        /** Adds a handler function to the `HEAD` method. */
        head(path, handler) {
            return this.method("HEAD", path, handler);
        }
        /** Adds a handler function to the `PATCH` method. */
        patch(path, handler) {
            return this.method("PATCH", path, handler);
        }
        /** Adds a handler function to the `POST` method. */
        post(path, handler) {
            return this.method("POST", path, handler);
        }
        /** Adds a handler function to the `PUT` method. */
        put(path, handler) {
            return this.method("PUT", path, handler);
        }
        /** Adds a handler function to the all methods. */
        all(path, handler) {
            for (let method of this.constructor.METHODS) {
                this.method(method, path, handler);
            }
            return this;
        }
        /** An alias of `router.all()`. */
        any(path, handler) {
            return this.all(path, handler);
        }
    }
    Router.METHODS = [
        "CONNECT",
        "DELETE",
        "HEAD",
        "GET",
        "HEAD",
        "OPTIONS",
        "PATCH",
        "POST",
        "PUT",
        "TRACE"
    ];
    webium.Router = Router;
    class App extends Router {
        constructor(options) {
            super();
            this.options = Object.assign({}, webium.AppOptions, options);
            this.caseSensitive = this.options.caseSensitive;
            options = Object.assign({ extended: true }, options);
            this.use(bodyParser.urlencoded(options))
                .use(bodyParser.json(options));
        }
        /** Returns the handler function for `http.Server()`. */
        get handler() {
            return (_req, _res) => {
                let enhanced = enhance(this.options)(_req, _res), req = enhanced.req, res = enhanced.res, hasStack = false, hasHandler = false;
                req.app = this;
                res.app = this;
                let i = -1;
                let wrap = () => {
                    i += 1;
                    if (i === this.stacks.length) {
                        // All routes has been tested, and none is matched, 
                        // send 404/405 response.
                        if (!hasStack) {
                            res.status = 404;
                            res.send(res.status);
                        }
                        else if (!hasHandler) {
                            res.status = 405;
                            res.end(res.status);
                        }
                        return void 0;
                    }
                    let stack = this.stacks[i], values = stack.regexp.exec(req.pathname);
                    if (!values)
                        return wrap();
                    hasStack = true;
                    let handlers = stack.handlers[req.method];
                    if (!handlers || handlers.length === 0)
                        return wrap();
                    hasHandler = true;
                    // Set/reset url params:
                    req.params = {};
                    if (stack.params.length > 0) {
                        values.shift();
                        for (let key of stack.params) {
                            req.params[key.name] = values.shift();
                        }
                    }
                    // Calling handlers.
                    return this.callNext(req, res, handlers, wrap);
                };
                // Calling middleware.
                this.callNext(req, res, this.middleware, wrap);
            };
        }
        /** An alias of `handler`. */
        get listener() {
            return this.handler;
        }
        callNext(req, res, handlers, cb) {
            let i = -1, $this = this;
            function next(thisObj) {
                i += 1;
                if (i === handlers.length)
                    return cb();
                return handlers[i].call(thisObj || $this, req, res, next);
            }
            return next();
        }
        listen(...args) {
            http_1.createServer(this.handler).listen(...args);
            return this;
        }
    }
    webium.App = App;
})(webium || (webium = {}));
module.exports = webium;
