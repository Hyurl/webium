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

    export interface RouteStack {
        regexp: RegExp,
        params: pathToRegexp.Key[],
        listeners: {
            [method: string]: Array<(req: Request, res: Response, next: () => any) => any>
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
            listeners: {}
        }];

        protected caseSensitive: boolean;

        /**
         * Creates a new router that can be used by the `App`.
         * @param caseSensitive Set the routes to be case-sensitive.
         */
        constructor(caseSensitive = false) {
            this.caseSensitive = caseSensitive;
        }

        /** Adds a listener function to all routes. */
        use(listener: (req: Request, res: Response, next: () => any) => any): this;
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
                        for (let method in stack.listeners) {
                            _stack.listeners[method] = Object.assign(
                                _stack.listeners[method] || [],
                                stack.listeners[method]
                            );
                        }
                    } else {
                        this.paths.push(router.paths[i]);
                        this.stacks.push(router.stacks[i]);
                    }
                }
            } else if (arg instanceof Function) {
                for (let i in this.stacks) {
                    for (let method in this.stacks[i].listeners) {
                        this.stacks[i].listeners[method].push(arg);
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
         * Adds a listener function to a specified method and path.
         * @param name GET, POST, HEAD, etc.
         * @param path The URL path.
         */
        method(name: string, path: string, listener: (req: Request, res: Response, next: () => any) => any): this {
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
        delete(path: string, listener: (req: Request, res: Response, next: () => any) => any): this {
            return this.method("DELETE", path, listener);
        }

        /** Adds a listener function to the `GET` method. */
        get(path: string, listener: (req: Request, res: Response, next: () => any) => any): this {
            return this.method("GET", path, listener);
        }

        /** Adds a listener function to the `HEAD` method. */
        head(path: string, listener: (req: Request, res: Response, next: () => any) => any): this {
            return this.method("HEAD", path, listener);
        }

        /** Adds a listener function to the `PATCH` method. */
        patch(path: string, listener: (req: Request, res: Response, next: () => any) => any): this {
            return this.method("PATCH", path, listener);
        }

        /** Adds a listener function to the `POST` method. */
        post(path: string, listener: (req: Request, res: Response, next: () => any) => any): this {
            return this.method("POST", path, listener);
        }

        /** Adds a listener function to the `PUT` method. */
        put(path: string, listener: (req: Request, res: Response, next: () => any) => any): this {
            return this.method("PUT", path, listener);
        }

        /** Adds a listener function to the all methods. */
        all(path: string, listener: (req: Request, res: Response, next: () => any) => any): this {
            for (let method of (<typeof Router>this.constructor).METHODS) {
                this.method(method, path, listener);
            }
            return this;
        }

        /** An alias of `router.all()`. */
        any(path: string, listener: (req: Request, res: Response, next: () => any) => any): this {
            return this.all(path, listener);
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

        /** Returns the listener function for `http.Server()`. */
        get listener(): (req: Request, res: Response) => void {
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
                        values = stack.regexp.exec(req.url);
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
            createServer(this.listener).listen(...args);
            return this;
        }
    }
}

export = webium;