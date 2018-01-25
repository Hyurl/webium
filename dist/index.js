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
        jsonp: false
    };
    class Router {
        /** Creates a new router that can be used by the `App`. */
        constructor() {
            this.stacks = {
                "*": {
                    regexp: null,
                    params: [],
                    listeners: {}
                }
            };
            let Class = this.constructor;
            for (let method of Class.METHODS) {
                this.stacks["*"].listeners[method] = [];
            }
        }
        use(arg) {
            if (arg instanceof Router) {
                for (let path in arg.stacks) {
                    if (!this.stacks[path]) {
                        this.stacks[path] = arg.stacks[path];
                    }
                    else {
                        for (let method in arg.stacks[path].listeners) {
                            this.stacks[path].listeners[method] = Object.assign(this.stacks[path].listeners[method] || [], arg.stacks[path].listeners[method]);
                        }
                    }
                }
            }
            else if (arg instanceof Function) {
                for (let path in this.stacks) {
                    for (let method in this.stacks[path].listeners) {
                        this.stacks[path].listeners[method].push(arg);
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
            if (path === "*") {
                for (let x in this.stacks) {
                    this.stacks[x].listeners[name].push(listener);
                }
            }
            else {
                if (this.stacks[path] === undefined) {
                    this.stacks[path] = {
                        regexp: null,
                        params: [],
                        listeners: {}
                    };
                }
                if (this.stacks[path].listeners[name] === undefined) {
                    this.stacks[path].listeners[name] = Object.assign([], this.stacks["*"].listeners[name]);
                }
                this.stacks[path].listeners[name].push(listener);
                this.stacks[path].regexp = pathToRegexp(path, this.stacks[path].params);
            }
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
            options = Object.assign({ extended: true }, options);
            this.use(bodyParser.urlencoded(options))
                .use(bodyParser.json(options));
        }
        /** Returns the listener function for `http.Server()`. */
        get listener() {
            return (_req, _res) => {
                let enhanced = enhance(this.options)(_req, _res), req = enhanced.req, res = enhanced.res, hasListener = false;
                req.app = this;
                res.app = this;
                for (let path in this.stacks) {
                    if (path === "*")
                        continue;
                    let stacks = this.stacks[path], values = stacks.regexp.exec(req.url);
                    if (values) {
                        hasListener = true;
                        if (stacks.listeners[req.method] === undefined ||
                            stacks.listeners[req.method].length === 0) {
                            res.status = 405;
                            res.end(res.status);
                            break;
                        }
                        values.shift();
                        let i = -1, j = -1, listeners = stacks.listeners[req.method], next = () => {
                            i += 1;
                            if (i < listeners.length) {
                                return listeners[i].call(this, req, res, next);
                            }
                            else {
                                return void 0;
                            }
                        };
                        // Set url params:
                        req.params = {};
                        for (let key of stacks.params) {
                            j += 1;
                            req.params[key.name] = values[j];
                        }
                        next();
                        break;
                    }
                }
                if (!hasListener) {
                    res.status = 404;
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
