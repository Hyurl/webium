import * as enhance from "enhance-req-res";
import * as pathToRegexp from "path-to-regexp";
import { createServer, IncomingMessage, ServerResponse } from "http";
import * as net from "net";
import * as bodyParser from "body-parser";

namespace webium {
    export class Cookie extends enhance.Cookie { }

    export interface Request extends enhance.Request {
        app: App;
        /** The URL parameters. */
        params: { [x: string]: string };
        /** Request body parsed by `body-parser`. */
        body: { [x: string]: any };
    }

    export interface Response extends enhance.Response {
        app: App;
    }

    export interface AppOptions {
        domain?: string | string[];
        useProxy?: boolean;
        capitalize?: boolean;
        cookieSecret?: string;
        jsonp?: string | false;
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

    export type RouteHandler = (req: Request, res: Response, next: (thisObj?: any) => any) => any;

    export interface RouteStack {
        regexp: RegExp,
        params: pathToRegexp.Key[],
        handlers: {
            [method: string]: Array<RouteHandler>
        }
    }

    export class Router {
        static METHODS = [
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

        protected paths: string[] = ["*"];
        protected stacks: RouteStack[] = [{
            regexp: null,
            params: [],
            handlers: {}
        }];

        protected caseSensitive: boolean;

        /**
         * Creates a new router that can be used by the `App`.
         * @param caseSensitive Set the routes to be case-sensitive.
         */
        constructor(caseSensitive = false) {
            this.caseSensitive = caseSensitive;
            for (let method of (<typeof Router>this.constructor).METHODS) {
                this.stacks[0].handlers[method] = [];
            }
        }

        /** Adds a handler function to all routes. */
        use(handler: RouteHandler): this;
        /** Uses an existing router. */
        use(router: Router): this;
        use(arg) {
            if (arg instanceof Router) {
                let router = arg;
                for (let i in router.paths) {
                    let j = this.paths.indexOf(router.paths[i]);
                    if (j >= 0) {
                        let stack = router.stacks[i],
                            _stack = this.stacks[j];
                        for (let method in stack.handlers) {
                            _stack.handlers[method] = Object.assign(
                                _stack.handlers[method] || [],
                                stack.handlers[method]
                            );
                        }
                    } else {
                        this.paths.push(router.paths[i]);
                        this.stacks.push(router.stacks[i]);
                    }
                }
            } else if (arg instanceof Function) {
                for (let i in this.stacks) {
                    for (let method in this.stacks[i].handlers) {
                        this.stacks[i].handlers[method].push(arg);
                    }
                }
            } else {
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
        method(name: string, path: string, handler: RouteHandler): this {
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
                this.stacks[i].handlers[name] = Object.assign([], this.stacks[0].handlers[name]);
            }
            this.stacks[i].handlers[name].push(handler);

            return this;
        }

        /** Adds a handler function to the `DELETE` method. */
        delete(path: string, handler: RouteHandler): this {
            return this.method("DELETE", path, handler);
        }

        /** Adds a handler function to the `GET` method. */
        get(path: string, handler: RouteHandler): this {
            return this.method("GET", path, handler);
        }

        /** Adds a handler function to the `HEAD` method. */
        head(path: string, handler: RouteHandler): this {
            return this.method("HEAD", path, handler);
        }

        /** Adds a handler function to the `PATCH` method. */
        patch(path: string, handler: RouteHandler): this {
            return this.method("PATCH", path, handler);
        }

        /** Adds a handler function to the `POST` method. */
        post(path: string, handler: RouteHandler): this {
            return this.method("POST", path, handler);
        }

        /** Adds a handler function to the `PUT` method. */
        put(path: string, handler: RouteHandler): this {
            return this.method("PUT", path, handler);
        }

        /** Adds a handler function to the all methods. */
        all(path: string, handler: RouteHandler): this {
            for (let method of (<typeof Router>this.constructor).METHODS) {
                this.method(method, path, handler);
            }
            return this;
        }

        /** An alias of `router.all()`. */
        any(path: string, handler: RouteHandler): this {
            return this.all(path, handler);
        }
    }

    export class App extends Router {

        protected options: AppOptions;

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
            return (_req: IncomingMessage, _res: ServerResponse) => {
                let enhanced = enhance(this.options)(_req, _res),
                    req = <Request>enhanced.req,
                    res = <Response>enhanced.res,
                    hasStack = false,
                    hasListener = false;

                req.app = this;
                res.app = this;

                let i = 0;
                let wrap = () => {
                    i += 1;
                    if (i === this.stacks.length)
                        return void 0;

                    let stack = this.stacks[i],
                        values = stack.regexp.exec(req.pathname);
                    if (!values)
                        return wrap();

                    hasStack = true;

                    let handlers = stack.handlers[req.method];
                    if (!handlers || handlers.length === 0)
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
                    let next = (thisObj?: any) => {
                        j += 1;
                        if (j === handlers.length)
                            return wrap();

                        return handlers[j].call(thisObj || this, req, res, next);
                    };

                    return next();
                }

                wrap();

                if (!hasStack) {
                    res.status = 404;
                    res.end(res.status);
                } else if (!hasListener) {
                    res.status = 405;
                    res.end(res.status);
                }
            }
        }

        /** Same as `http.listen()`. */
        listen(port?: number, hostname?: string, backlog?: number, listeningListener?: Function): this;
        listen(port?: number, hostname?: string, listeningListener?: Function): this;
        listen(port?: number, backlog?: number, listeningListener?: Function): this;
        listen(port?: number, listeningListener?: Function): this;
        listen(path: string, backlog?: number, listeningListener?: Function): this;
        listen(path: string, listeningListener?: Function): this;
        listen(options: net.ListenOptions, listeningListener?: Function): this;
        listen(handle: any, backlog?: number, listeningListener?: Function): this;
        listen(handle: any, listeningListener?: Function): this;
        listen(...args) {
            createServer(this.handler).listen(...args);
            return this;
        }
    }
}

export = webium;