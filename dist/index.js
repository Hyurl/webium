"use strict";
const tslib_1 = require("tslib");
const enhance = require("enhance-req-res");
const path_to_regexp_1 = require("path-to-regexp");
const http_1 = require("http");
const bodyParser = require("body-parser");
var webium;
(function (webium) {
    webium.Cookie = enhance.Cookie;
    webium.URL = enhance.URL;
    webium.RequestConstructor = enhance.Request;
    webium.Http2RequestConstructor = enhance.Http2Request;
    webium.ResponseConstructor = enhance.Response;
    webium.Http2ResponseConstructor = enhance.Http2Response;
    webium.AppOptions = {
        domain: "",
        useProxy: false,
        capitalize: true,
        cookieSecret: "",
        jsonp: false,
        caseSensitive: false
    };
    class Router {
        constructor(caseSensitive = false) {
            this.middleware = [];
            this.paths = [];
            this.stacks = [];
            this.caseSensitive = caseSensitive;
        }
        use(arg) {
            if (arg instanceof Router) {
                let router = arg;
                this.middleware = this.middleware.concat(router.middleware);
                for (let i in router.paths) {
                    let j = this.paths.indexOf(router.paths[i]);
                    if (j >= 0) {
                        let stack = router.stacks[i], _stack = this.stacks[j];
                        for (let method in stack.handlers) {
                            _stack.handlers[method] = (_stack.handlers[method]
                                || []).concat(stack.handlers[method]);
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
                throw new TypeError("The argument passed to " +
                    this.constructor.name +
                    ".use() must be a function or an instance of Router.");
            }
            return this;
        }
        method(name, path, handler, unique) {
            if (typeof handler !== "function")
                throw new TypeError("The handler must be a function.");
            let i = this.paths.indexOf(path);
            if (i === -1) {
                i = this.paths.length;
                let params = [], regexp = path instanceof RegExp ? path
                    : path_to_regexp_1.pathToRegexp(path === "*" ? "(.*)" : path, params, {
                        sensitive: this.caseSensitive
                    });
                this.paths.push(path);
                this.stacks.push({
                    regexp,
                    params,
                    handlers: {}
                });
            }
            if (this.stacks[i].handlers[name] === undefined) {
                this.stacks[i].handlers[name] = [];
            }
            if (unique) {
                this.stacks[i].handlers[name] = [handler];
            }
            else {
                this.stacks[i].handlers[name].push(handler);
            }
            return this;
        }
        delete(path, handler, unique) {
            return this.method("DELETE", path, handler, unique);
        }
        get(path, handler, unique) {
            return this.method("GET", path, handler, unique);
        }
        head(path, handler, unique) {
            return this.method("HEAD", path, handler, unique);
        }
        patch(path, handler, unique) {
            return this.method("PATCH", path, handler, unique);
        }
        post(path, handler, unique) {
            return this.method("POST", path, handler, unique);
        }
        put(path, handler, unique) {
            return this.method("PUT", path, handler, unique);
        }
        all(path, handler, unique) {
            for (let method of this.constructor.METHODS) {
                this.method(method, path, handler, unique);
            }
            return this;
        }
        any(path, handler, unique) {
            return this.all(path, handler, unique);
        }
        contains(method, path, handler) {
            let i = this.paths.indexOf(path);
            if (i === -1) {
                return false;
            }
            if (!this.stacks[i].handlers[method] ||
                !this.stacks[i].handlers[method].length) {
                return false;
            }
            if (typeof handler === "function") {
                return this.stacks[i].handlers[method].indexOf(handler) >= 0;
            }
            return true;
        }
        methods(path) {
            let i = this.paths.indexOf(path);
            if (i === -1) {
                return [];
            }
            else {
                return Object.keys(this.stacks[i].handlers);
            }
        }
    }
    Router.METHODS = [
        "CONNECT",
        "DELETE",
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
        get handler() {
            let enhances = enhance(this.options);
            return (_req, _res) => {
                let enhanced = enhances(_req, _res), req = enhanced.req, res = enhanced.res, hasStack = false, hasHandler = false;
                req.app = this;
                res.app = this;
                let i = 0;
                let wrap = () => {
                    if (i === this.stacks.length) {
                        if (!hasStack) {
                            res.status = 404;
                            this.onerror(res.status, req, res);
                        }
                        else if (!hasHandler) {
                            res.status = 405;
                            this.onerror(res.status, req, res);
                        }
                        return void 0;
                    }
                    else if (i > this.stacks.length) {
                        return void 0;
                    }
                    let stack = this.stacks[i++], values = stack.regexp.exec(req.pathname);
                    if (!values)
                        return wrap();
                    hasStack = true;
                    let handlers = stack.handlers[req.method];
                    if (!handlers || handlers.length === 0)
                        return wrap();
                    hasHandler = true;
                    req.params = {};
                    if (stack.params.length > 0) {
                        values.shift();
                        for (let key of stack.params) {
                            req.params[key.name] = values.shift();
                        }
                    }
                    return this.dispatch(req, res, handlers, wrap);
                };
                this.dispatch(req, res, this.middleware, wrap);
            };
        }
        get listener() {
            return this.handler;
        }
        dispatch(req, res, handlers, cb) {
            let i = -1;
            let next = (thisObj, sendImmediate = false) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                yield new Promise(setImmediate);
                i += 1;
                if (i === handlers.length)
                    return cb();
                else if (i > handlers.length)
                    return void 0;
                try {
                    if (handlers[i].length >= 3) {
                        return handlers[i].call(thisObj || this, req, res, next);
                    }
                    else {
                        let result = yield handlers[i].call(thisObj || this, req, res);
                        if (result !== undefined) {
                            if (sendImmediate) {
                                res.headersSent
                                    ? (!res.finished && res.write(result))
                                    : res.send(result);
                            }
                            else {
                                return result;
                            }
                        }
                        else {
                            return next(thisObj, sendImmediate);
                        }
                    }
                }
                catch (e) {
                    this.onerror(e, req, res);
                }
            });
            return next(void 0, true);
        }
        listen(...args) {
            this.server = http_1.createServer(this.handler).listen(...args);
            return this;
        }
        close() {
            this.server.close();
            return this;
        }
        onerror(err, req, res) {
            if (res.statusCode === 404 || res.statusCode === 405) {
                res.end(err);
            }
            else {
                res.status = 500;
                if (err instanceof Error)
                    err = err.message;
                else if (typeof err !== "string")
                    err = res.status;
                res.end(err);
            }
        }
    }
    webium.App = App;
})(webium || (webium = {}));
module.exports = webium;
//# sourceMappingURL=index.js.map