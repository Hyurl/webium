"use strict";
var tslib_1 = require("tslib");
require("source-map-support/register");
var enhance = require("enhance-req-res");
var pathToRegexp = require("path-to-regexp");
var http_1 = require("http");
var bodyParser = require("body-parser");
var webium;
(function (webium) {
    webium.Cookie = enhance.Cookie;
    webium.AppOptions = {
        domain: "",
        useProxy: false,
        capitalize: true,
        cookieSecret: "",
        jsonp: false,
        caseSensitive: false
    };
    var Router = (function () {
        function Router(caseSensitive) {
            if (caseSensitive === void 0) { caseSensitive = false; }
            this.middleware = [];
            this.paths = [];
            this.stacks = [];
            this.caseSensitive = caseSensitive;
        }
        Router.prototype.use = function (arg) {
            if (arg instanceof Router) {
                var router = arg;
                Object.assign(this.middleware, router.middleware);
                for (var i in router.paths) {
                    var j = this.paths.indexOf(router.paths[i]);
                    if (j >= 0) {
                        var stack = router.stacks[i], _stack = this.stacks[j];
                        for (var method in stack.handlers) {
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
                throw new TypeError("The argument passed to " +
                    this.constructor.name +
                    ".use() must be a function or an instance of Router.");
            }
            return this;
        };
        Router.prototype.method = function (name, path, handler) {
            if (typeof handler !== "function")
                throw new TypeError("The handler must be a function.");
            var i = this.paths.indexOf(path);
            if (i === -1) {
                i = this.paths.length;
                var params = [];
                this.paths.push(path);
                this.stacks.push({
                    regexp: pathToRegexp(path, params, {
                        sensitive: this.caseSensitive
                    }),
                    params: params,
                    handlers: {}
                });
            }
            if (this.stacks[i].handlers[name] === undefined) {
                this.stacks[i].handlers[name] = [];
            }
            this.stacks[i].handlers[name].push(handler);
            return this;
        };
        Router.prototype.delete = function (path, handler) {
            return this.method("DELETE", path, handler);
        };
        Router.prototype.get = function (path, handler) {
            return this.method("GET", path, handler);
        };
        Router.prototype.head = function (path, handler) {
            return this.method("HEAD", path, handler);
        };
        Router.prototype.patch = function (path, handler) {
            return this.method("PATCH", path, handler);
        };
        Router.prototype.post = function (path, handler) {
            return this.method("POST", path, handler);
        };
        Router.prototype.put = function (path, handler) {
            return this.method("PUT", path, handler);
        };
        Router.prototype.all = function (path, handler) {
            for (var _i = 0, _a = this.constructor.METHODS; _i < _a.length; _i++) {
                var method = _a[_i];
                this.method(method, path, handler);
            }
            return this;
        };
        Router.prototype.any = function (path, handler) {
            return this.all(path, handler);
        };
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
        return Router;
    }());
    webium.Router = Router;
    var App = (function (_super) {
        tslib_1.__extends(App, _super);
        function App(options) {
            var _this = _super.call(this) || this;
            _this.options = Object.assign({}, webium.AppOptions, options);
            _this.caseSensitive = _this.options.caseSensitive;
            options = Object.assign({ extended: true }, options);
            _this.use(bodyParser.urlencoded(options))
                .use(bodyParser.json(options));
            return _this;
        }
        Object.defineProperty(App.prototype, "handler", {
            get: function () {
                var _this = this;
                var enhances = enhance(this.options);
                return function (_req, _res) {
                    var enhanced = enhances(_req, _res), req = enhanced.req, res = enhanced.res, hasStack = false, hasHandler = false;
                    req.app = _this;
                    res.app = _this;
                    var i = -1;
                    var wrap = function () {
                        i += 1;
                        if (i == _this.stacks.length) {
                            if (!hasStack) {
                                res.status = 404;
                                _this.onerror(res.status, req, res);
                            }
                            else if (!hasHandler) {
                                res.status = 405;
                                _this.onerror(res.status, req, res);
                            }
                            return void 0;
                        }
                        else if (i > _this.stacks.length) {
                            return void 0;
                        }
                        var stack = _this.stacks[i], values = stack.regexp.exec(req.pathname);
                        if (!values)
                            return wrap();
                        hasStack = true;
                        var handlers = stack.handlers[req.method];
                        if (!handlers || handlers.length === 0)
                            return wrap();
                        hasHandler = true;
                        req.params = {};
                        if (stack.params.length > 0) {
                            values.shift();
                            for (var _i = 0, _a = stack.params; _i < _a.length; _i++) {
                                var key = _a[_i];
                                req.params[key.name] = values.shift();
                            }
                        }
                        return _this.callNext(req, res, handlers, wrap);
                    };
                    _this.callNext(req, res, _this.middleware, wrap);
                };
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(App.prototype, "listener", {
            get: function () {
                return this.handler;
            },
            enumerable: true,
            configurable: true
        });
        App.prototype.callNext = function (req, res, handlers, cb) {
            var _this = this;
            var i = -1;
            var next = function (thisObj) {
                i += 1;
                if (i === handlers.length)
                    return cb();
                else if (i > handlers.length)
                    return void 0;
                try {
                    return handlers[i].call(thisObj || _this, req, res, next);
                }
                catch (e) {
                    _this.onerror(e, req, res);
                }
            };
            return next();
        };
        App.prototype.listen = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            var _a;
            this.server = (_a = http_1.createServer(this.handler)).listen.apply(_a, args);
            return this;
        };
        App.prototype.close = function () {
            this.server.close();
            return this;
        };
        App.prototype.onerror = function (err, req, res) {
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
        };
        return App;
    }(Router));
    webium.App = App;
})(webium || (webium = {}));
module.exports = webium;
//# sourceMappingURL=index.js.map