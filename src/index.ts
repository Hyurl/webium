import * as enhance from "enhance-req-res";
import { pathToRegexp, Key } from "path-to-regexp";
import { createServer, IncomingMessage, ServerResponse } from "http";
import * as net from "net";
import * as bodyParser from "body-parser";

namespace webium {
    export const Cookie = enhance.Cookie;
    export const URL = enhance.URL;
    export const RequestConstructor: new (...args: any[]) => Request = <any>enhance.Request;
    export const Http2RequestConstructor: new (...args: any[]) => Request = <any>enhance.Http2Request;
    export const ResponseConstructor: new (...args: any[]) => Response = <any>enhance.Response;
    export const Http2ResponseConstructor: new (...args: any[]) => Response = <any>enhance.Http2Response;

    export interface Request extends enhance.Request {
        app: App;
        /** The URL parameters. */
        params: { [x: string]: string };
        /**
         * Request body parsed by `body-parser`. By default, webium only 
         * parses `urlencoded` and JSON string.
         */
        body?: any;
    }

    export interface Response extends enhance.Response {
        app: App;
    }

    export interface AppOptions extends enhance.Options {
        caseSensitive?: boolean;
        [x: string]: any
    }

    export const AppOptions: AppOptions = {
        domain: "",
        useProxy: false,
        capitalize: true,
        cookieSecret: "",
        jsonp: false,
        caseSensitive: false
    }

    export type RouteHandler = (req: Request, res: Response, next: (thisObj?: any) => Promise<any>) => any;
    export type HttpMethods = "CONNECT" | "DELETE"
        | "HEAD" | "GET" | "HEAD" | "OPTIONS"
        | "PATCH" | "POST" | "PUT" | "TRACE";

    export interface RouteStack {
        regexp: RegExp,
        params: Key[],
        handlers: {
            [method: string]: Array<RouteHandler>
        }
    }

    export class Router {
        static METHODS: HttpMethods[] = [
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

        protected middleware: RouteHandler[] = [];
        protected paths: (string | RegExp)[] = [];
        protected stacks: RouteStack[] = [];

        protected caseSensitive: boolean;

        /**
         * Creates a new router that can be used by the `App`.
         * @param caseSensitive Set the routes to be case-sensitive.
         */
        constructor(caseSensitive = false) {
            this.caseSensitive = caseSensitive;
        }

        /** Adds a handler function as a middleware. */
        use(handler: RouteHandler): this;
        /** Uses an existing router. */
        use(router: Router): this;
        use(arg) {
            if (arg instanceof Router) {
                let router = arg;

                // Attach middleware
                this.middleware = this.middleware.concat(router.middleware);

                // Attach routes
                for (let i in router.paths) {
                    let j = this.paths.indexOf(router.paths[i]);
                    if (j >= 0) {
                        let stack = router.stacks[i],
                            _stack = this.stacks[j];

                        for (let method in stack.handlers) {
                            _stack.handlers[method] = (_stack.handlers[method]
                                || []).concat(stack.handlers[method]);
                        }
                    } else {
                        this.paths.push(router.paths[i]);
                        this.stacks.push(router.stacks[i]);
                    }
                }
            } else if (arg instanceof Function) {
                this.middleware.push(arg);
            } else {
                throw new TypeError("The argument passed to " +
                    this.constructor.name +
                    ".use() must be a function or an instance of Router.");
            }
            return this;
        }

        /**
         * Adds a handler function to a specified method and path.
         * @param name GET, POST, HEAD, etc.
         * @param path The URL path.
         * @param unique The route should contain only one handler, and the new 
         *  one will replace the old one.
         */
        method(name: HttpMethods, path: string | RegExp, handler: RouteHandler, unique?: boolean): this {
            if (typeof handler !== "function")
                throw new TypeError("The handler must be a function.");

            let i = this.paths.indexOf(path);
            if (i === -1) {
                i = this.paths.length;
                let params = [],
                    regexp = path instanceof RegExp ? path
                        : pathToRegexp(path === "*" ? "(.*)" : path, params, {
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
            } else {
                this.stacks[i].handlers[name].push(handler);
            }

            return this;
        }

        /** Adds a handler function to the `DELETE` method. */
        delete(path: string | RegExp, handler: RouteHandler, unique?: boolean): this {
            return this.method("DELETE", path, handler, unique);
        }

        /** Adds a handler function to the `GET` method. */
        get(path: string | RegExp, handler: RouteHandler, unique?: boolean): this {
            return this.method("GET", path, handler, unique);
        }

        /** Adds a handler function to the `HEAD` method. */
        head(path: string | RegExp, handler: RouteHandler, unique?: boolean): this {
            return this.method("HEAD", path, handler, unique);
        }

        /** Adds a handler function to the `PATCH` method. */
        patch(path: string | RegExp, handler: RouteHandler, unique?: boolean): this {
            return this.method("PATCH", path, handler, unique);
        }

        /** Adds a handler function to the `POST` method. */
        post(path: string | RegExp, handler: RouteHandler, unique?: boolean): this {
            return this.method("POST", path, handler, unique);
        }

        /** Adds a handler function to the `PUT` method. */
        put(path: string | RegExp, handler: RouteHandler, unique?: boolean): this {
            return this.method("PUT", path, handler, unique);
        }

        /** Adds a handler function to the all methods. */
        all(path: string | RegExp, handler: RouteHandler, unique?: boolean): this {
            for (let method of (<typeof Router>this.constructor).METHODS) {
                this.method(method, path, handler, unique);
            }
            return this;
        }

        /** An alias of `router.all()`. */
        any(path: string | RegExp, handler: RouteHandler, unique?: boolean): this {
            return this.all(path, handler, unique);
        }

        /** Checks if the router contains corresponding route and handler. */
        contains(method: HttpMethods, path: string, handler?: RouteHandler): boolean {
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

        /** Returns all methods bound to the path. */
        methods(path: string): HttpMethods[] {
            let i = this.paths.indexOf(path);

            if (i === -1) {
                return [];
            } else {
                return Object.keys(this.stacks[i].handlers) as HttpMethods[];
            }
        }
    }

    export class App extends Router {

        protected options: AppOptions;
        server: net.Server;

        constructor(options?: AppOptions) {
            super();
            this.options = Object.assign({}, AppOptions, options);
            this.caseSensitive = this.options.caseSensitive;
            options = Object.assign({ extended: true }, options);
            this.use(<any>bodyParser.urlencoded(<any>options))
                .use(<any>bodyParser.json(<any>options));
        }

        /** Returns the handler function for `http.Server()`. */
        get handler(): (req: Request, res: Response) => void {
            let enhances = enhance(this.options);

            return (_req: IncomingMessage, _res: ServerResponse) => {
                let enhanced = enhances(_req, _res),
                    req = <Request>enhanced.req,
                    res = <Response>enhanced.res,
                    hasStack = false,
                    hasHandler = false;

                req.app = this;
                res.app = this;

                let i = 0;
                let wrap = () => {
                    if (i === this.stacks.length) {
                        // All routes has been tested, and none is matched, 
                        // send 404/405 response.
                        if (!hasStack) {
                            res.status = 404;
                            this.onerror(res.status, req, res);
                        } else if (!hasHandler) {
                            res.status = 405;
                            this.onerror(res.status, req, res);
                        }
                        return void 0;
                    } else if (i > this.stacks.length) {
                        return void 0;
                    }

                    let stack = this.stacks[i++],
                        values = stack.regexp.exec(req.pathname);

                    if (!values)
                        return wrap();

                    hasStack = true;

                    let handlers = stack.handlers[req.method];
                    if (!handlers || handlers.length === 0)
                        return wrap();

                    hasHandler = true;

                    // Set/reset URL params:
                    req.params = {};
                    if (stack.params.length > 0) {
                        values.shift();
                        for (let key of stack.params) {
                            req.params[key.name] = values.shift();
                        }
                    }

                    // Calling handlers.
                    return this.dispatch(req, res, handlers, wrap);
                };

                // Calling middleware.
                this.dispatch(req, res, this.middleware, wrap);
            }
        }

        /** An alias of `handler`. */
        get listener() {
            return this.handler;
        }

        private dispatch(req: Request, res: Response, handlers: RouteHandler[], cb: () => any) {
            let i = -1;
            let next = async (thisObj?: any, sendImmediate = false) => {
                await new Promise(setImmediate); // Ensure asynchronous call.
                i += 1;

                if (i === handlers.length)
                    return cb();
                else if (i > handlers.length)
                    return void 0;

                try {
                    if (handlers[i].length >= 3) { // with 'next'
                        return handlers[i].call(thisObj || this, req, res, next);
                    } else { // without 'next'
                        let result = handlers[i].call(thisObj || this, req, res);

                        if (typeof result === "object" && typeof result["then"] === "function") { // promise
                            return result["then"](_res => {
                                if (_res !== undefined) {
                                    if (sendImmediate) {
                                        res.headersSent
                                            ? (!res.finished && res.write(_res))
                                            : res.send(_res);
                                    } else {
                                        return _res;
                                    }
                                } else {
                                    return next(thisObj, sendImmediate);
                                }
                            });
                        } else if (result !== undefined) {
                            if (sendImmediate) {
                                res.headersSent
                                    ? (!res.finished && res.write(result))
                                    : res.send(result);
                            } else {
                                return result;
                            }
                        } else {
                            return next(thisObj, sendImmediate);
                        }
                    }
                } catch (e) {
                    this.onerror(e, req, res);
                }
            };

            return next(void 0, true);
        }

        /** Same as `http.listen()`. */
        listen(port?: number, hostname?: string, backlog?: number, listeningListener?: Function): this;
        listen(port?: number, hostname?: string, listeningListener?: Function): this;
        listen(port?: number, backlog?: number, listeningListener?: Function): this;
        listen(port?: number, listeningListener?: Function): this;
        listen(path: string | RegExp, backlog?: number, listeningListener?: Function): this;
        listen(path: string | RegExp, listeningListener?: Function): this;
        listen(options: net.ListenOptions, listeningListener?: Function): this;
        listen(handle: any, backlog?: number, listeningListener?: Function): this;
        listen(handle: any, listeningListener?: Function): this;
        listen(...args) {
            this.server = createServer(this.handler).listen(...args);
            return this;
        }

        /** Closes the server started by `app.listen()`. */
        close(): this {
            this.server.close();
            return this;
        }

        /**
         * If any error occurred, this method will be called, you can override
         * this method to make it satisfied to your needs.
         */
        onerror(err: any, req: Request, res: Response) {
            if (res.statusCode === 404 || res.statusCode === 405) {
                res.end(err);
            } else {
                res.status = 500;
                if (err instanceof Error)
                    err = err.message;
                else if (typeof err !== "string")
                    err = res.status;
                res.end(err);
            }
        }
    }
}

export = webium;