"use strict";
var tslib_1 = require("tslib");
var enhance = require("enhance-req-res");
var path_to_regexp_1 = require("path-to-regexp");
var http_1 = require("http");
var bodyParser = require("body-parser");
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
                this.middleware = this.middleware.concat(router.middleware);
                for (var i in router.paths) {
                    var j = this.paths.indexOf(router.paths[i]);
                    if (j >= 0) {
                        var stack = router.stacks[i], _stack = this.stacks[j];
                        for (var method in stack.handlers) {
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
        };
        Router.prototype.method = function (name, path, handler, unique) {
            if (typeof handler !== "function")
                throw new TypeError("The handler must be a function.");
            var i = this.paths.indexOf(path);
            if (i === -1) {
                i = this.paths.length;
                var params = [], regexp = path instanceof RegExp ? path
                    : path_to_regexp_1.pathToRegexp(path === "*" ? "(.*)" : path, params, {
                        sensitive: this.caseSensitive
                    });
                this.paths.push(path);
                this.stacks.push({
                    regexp: regexp,
                    params: params,
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
        };
        Router.prototype.delete = function (path, handler, unique) {
            return this.method("DELETE", path, handler, unique);
        };
        Router.prototype.get = function (path, handler, unique) {
            return this.method("GET", path, handler, unique);
        };
        Router.prototype.head = function (path, handler, unique) {
            return this.method("HEAD", path, handler, unique);
        };
        Router.prototype.patch = function (path, handler, unique) {
            return this.method("PATCH", path, handler, unique);
        };
        Router.prototype.post = function (path, handler, unique) {
            return this.method("POST", path, handler, unique);
        };
        Router.prototype.put = function (path, handler, unique) {
            return this.method("PUT", path, handler, unique);
        };
        Router.prototype.all = function (path, handler, unique) {
            for (var _i = 0, _a = this.constructor.METHODS; _i < _a.length; _i++) {
                var method = _a[_i];
                this.method(method, path, handler, unique);
            }
            return this;
        };
        Router.prototype.any = function (path, handler, unique) {
            return this.all(path, handler, unique);
        };
        Router.prototype.contains = function (method, path, handler) {
            var i = this.paths.indexOf(path);
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
        };
        Router.prototype.methods = function (path) {
            var i = this.paths.indexOf(path);
            if (i === -1) {
                return [];
            }
            else {
                return Object.keys(this.stacks[i].handlers);
            }
        };
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
                    var i = 0;
                    var wrap = function () {
                        if (i === _this.stacks.length) {
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
                        var stack = _this.stacks[i++], values = stack.regexp.exec(req.pathname);
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
                        return _this.dispatch(req, res, handlers, wrap);
                    };
                    _this.dispatch(req, res, _this.middleware, wrap);
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
        App.prototype.dispatch = function (req, res, handlers, cb) {
            var _this = this;
            var i = -1;
            var next = function (thisObj, sendImmediate) {
                if (sendImmediate === void 0) { sendImmediate = false; }
                return tslib_1.__awaiter(_this, void 0, void 0, function () {
                    var result;
                    return tslib_1.__generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4, new Promise(setImmediate)];
                            case 1:
                                _a.sent();
                                i += 1;
                                if (i === handlers.length)
                                    return [2, cb()];
                                else if (i > handlers.length)
                                    return [2, void 0];
                                try {
                                    if (handlers[i].length >= 3) {
                                        return [2, handlers[i].call(thisObj || this, req, res, next)];
                                    }
                                    else {
                                        result = handlers[i].call(thisObj || this, req, res);
                                        if (typeof result === "object" && typeof result["then"] === "function") {
                                            return [2, result["then"](function (_res) {
                                                    if (_res !== undefined) {
                                                        if (sendImmediate) {
                                                            res.headersSent
                                                                ? (!res.finished && res.write(_res))
                                                                : res.send(_res);
                                                        }
                                                        else {
                                                            return _res;
                                                        }
                                                    }
                                                    else {
                                                        return next(thisObj, sendImmediate);
                                                    }
                                                })];
                                        }
                                        else if (result !== undefined) {
                                            if (sendImmediate) {
                                                res.headersSent
                                                    ? (!res.finished && res.write(result))
                                                    : res.send(result);
                                            }
                                            else {
                                                return [2, result];
                                            }
                                        }
                                        else {
                                            return [2, next(thisObj, sendImmediate)];
                                        }
                                    }
                                }
                                catch (e) {
                                    this.onerror(e, req, res);
                                }
                                return [2];
                        }
                    });
                });
            };
            return next(void 0, true);
        };
        App.prototype.listen = function () {
            var _a;
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
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