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
            this.paths = ["*"];
            this.stacks = [{
                    regexp: null,
                    params: [],
                    listeners: {}
                }];
            this.caseSensitive = caseSensitive;
            for (let method of this.constructor.METHODS) {
                this.stacks[0].listeners[method] = [];
            }
        }
        use(arg) {
            if (arg instanceof Router) {
                let router = arg;
                for (let i in router.paths) {
                    let j = this.paths.indexOf(router.paths[i]);
                    if (j >= 0) {
                        let stack = router.stacks[i], _stack = this.stacks[j];
                        for (let method in stack.listeners) {
                            _stack.listeners[method] = Object.assign(_stack.listeners[method] || [], stack.listeners[method]);
                        }
                    }
                    else {
                        this.paths.push(router.paths[i]);
                        this.stacks.push(router.stacks[i]);
                    }
                }
            }
            else if (arg instanceof Function) {
                for (let i in this.stacks) {
                    for (let method in this.stacks[i].listeners) {
                        this.stacks[i].listeners[method].push(arg);
                    }
                }
            }
            else {
                throw new TypeError("The argument passed to '" +
                    this.constructor.name +
                    ".use()' must be a function or an instance of Router.");
            }
            return this;
        }
        /**
         * Adds a listener function to a specified method and path.
         * @param name GET, POST, HEAD, etc.
         * @param path The URL path.
         */
        method(name, path, listener) {
            if (typeof listener !== "function")
                throw new TypeError("The listener must be a function.");
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
                    listeners: {}
                });
            }
            if (this.stacks[i].listeners[name] === undefined) {
                this.stacks[i].listeners[name] = Object.assign([], this.stacks[0].listeners[name]);
            }
            this.stacks[i].listeners[name].push(listener);
            return this;
        }
        /** Adds a listener function to the `DELETE` method. */
        delete(path, listener) {
            return this.method("DELETE", path, listener);
        }
        /** Adds a listener function to the `GET` method. */
        get(path, listener) {
            return this.method("GET", path, listener);
        }
        /** Adds a listener function to the `HEAD` method. */
        head(path, listener) {
            return this.method("HEAD", path, listener);
        }
        /** Adds a listener function to the `PATCH` method. */
        patch(path, listener) {
            return this.method("PATCH", path, listener);
        }
        /** Adds a listener function to the `POST` method. */
        post(path, listener) {
            return this.method("POST", path, listener);
        }
        /** Adds a listener function to the `PUT` method. */
        put(path, listener) {
            return this.method("PUT", path, listener);
        }
        /** Adds a listener function to the all methods. */
        all(path, listener) {
            for (let method of this.constructor.METHODS) {
                this.method(method, path, listener);
            }
            return this;
        }
        /** An alias of `router.all()`. */
        any(path, listener) {
            return this.all(path, listener);
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
        /** Returns the listener function for `http.Server()`. */
        get listener() {
            return (_req, _res) => {
                let enhanced = enhance(this.options)(_req, _res), req = enhanced.req, res = enhanced.res, hasStack = false, hasListener = false;
                req.app = this;
                res.app = this;
                let i = 0;
                let wrap = () => {
                    i += 1;
                    if (i === this.stacks.length)
                        return void 0;
                    let stack = this.stacks[i], values = stack.regexp.exec(req.pathname);
                    if (!values)
                        return wrap();
                    hasStack = true;
                    let listeners = stack.listeners[req.method];
                    if (!listeners || listeners.length === 0)
                        return wrap();
                    hasListener = true;
                    // Set/reset url params:
                    req.params = {};
                    if (stack.params.length > 0) {
                        values.shift();
                        for (let key of stack.params) {
                            req.params[key.name] = values.shift();
                        }
                    }
                    let j = -1;
                    let next = () => {
                        j += 1;
                        if (j === listeners.length)
                            return wrap();
                        return listeners[j].call(this, req, res, next);
                    };
                    return next();
                };
                wrap();
                if (!hasStack) {
                    res.status = 404;
                    res.end(res.status);
                }
                else if (!hasListener) {
                    res.status = 405;
                    res.end(res.status);
                }
            };
        }
        listen(...args) {
            http_1.createServer(this.listener).listen(...args);
            return this;
        }
    }
    webium.App = App;
})(webium || (webium = {}));
module.exports = webium;
