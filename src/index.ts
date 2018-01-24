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
        domain: string | string[];
        useProxy: boolean;
        capitalize: boolean;
        cookieSecret: string;
        jsonp: string | false;
        [x: string]: any
    }

    export const AppOptions: AppOptions = {
        domain: "",
        useProxy: false,
        capitalize: true,
        cookieSecret: "",
        jsonp: false
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

        readonly stacks: {
            [path: string]: {
                regexp: RegExp,
                params: pathToRegexp.Key[],
                listeners: {
                    [method: string]: Array<(req: Request, res: Response, next: Function) => any>
                }
            }
        };

        /** Creates a new router that can be used by the `App`. */
        constructor() {
            this.stacks = {
                "*": {
                    regexp: null,
                    params: [],
                    listeners: {}
                }
            };
            let Class = <typeof Router>this.constructor;
            for (let method of Class.METHODS) {
                this.stacks["*"].listeners[method] = [];
            }
        }

        /** Adds a listener function to all routes. */
        use(listener: (req: Request, res: Response, next: Function) => any): this;
        /** Uses an existing router. */
        use(router: Router): this;
        use(arg) {
            if (arg instanceof Router) {
                for (let path in arg.stacks) {
                    if (!this.stacks[path]) {
                        this.stacks[path] = arg.stacks[path];
                    } else {
                        for (let method in arg.stacks[path].listeners) {
                            this.stacks[path].listeners[method] = Object.assign(
                                this.stacks[path].listeners[method] || [],
                                arg.stacks[path].listeners[method]
                            );
                        }
                    }
                }
            } else if (arg instanceof Function) {
                for (let path in this.stacks) {
                    for (let method in this.stacks[path].listeners) {
                        this.stacks[path].listeners[method].push(arg);
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
        method(name: string, path: string, listener: (req: Request, res: Response, next: Function) => any): this {
            if (typeof listener !== "function")
                throw new TypeError("The listener must be a function.");

            if (path === "*") {
                for (let x in this.stacks) {
                    this.stacks[x].listeners[name].push(listener);
                }
            } else {
                if (this.stacks[path] === undefined) {
                    this.stacks[path] = {
                        regexp: null,
                        params: [],
                        listeners: {
                            [name]: Object.assign([], this.stacks["*"].listeners[name])
                        }
                    };
                }
                this.stacks[path].listeners[name].push(listener);
                this.stacks[path].regexp = pathToRegexp(path, this.stacks[path].params);
            }

            return this;
        }

        /** Adds a listener function to the `DELETE` method. */
        delete(path: string, listener: (req: Request, res: Response, next: Function) => any): this {
            return this.method("DELETE", path, listener);
        }

        /** Adds a listener function to the `GET` method. */
        get(path: string, listener: (req: Request, res: Response, next: Function) => any): this {
            return this.method("GET", path, listener);
        }

        /** Adds a listener function to the `HEAD` method. */
        head(path: string, listener: (req: Request, res: Response, next: Function) => any): this {
            return this.method("HEAD", path, listener);
        }

        /** Adds a listener function to the `PATCH` method. */
        patch(path: string, listener: (req: Request, res: Response, next: Function) => any): this {
            return this.method("PATCH", path, listener);
        }

        /** Adds a listener function to the `POST` method. */
        post(path: string, listener: (req: Request, res: Response, next: Function) => any): this {
            return this.method("POST", path, listener);
        }

        /** Adds a listener function to the `PUT` method. */
        put(path: string, listener: (req: Request, res: Response, next: Function) => any): this {
            return this.method("PUT", path, listener);
        }

        /** Adds a listener function to the all methods. */
        all(path: string, listener: (req: Request, res: Response, next: Function) => any): this {
            for (let method of (<typeof Router>this.constructor).METHODS) {
                this.method(method, path, listener);
            }
            return this;
        }

        /** An alias of `router.all()`. */
        any(path: string, listener: (req: Request, res: Response, next: Function) => any): this {
            return this.all(path, listener);
        }
    }

    export class App extends Router {

        options: AppOptions;

        constructor(options?: AppOptions) {
            super();
            this.options = Object.assign({}, AppOptions, options);
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
                    hasListener = false;

                req.app = this;
                res.app = this;

                for (let path in this.stacks) {
                    if (path === "*") continue;

                    let stacks = this.stacks[path],
                        values = stacks.regexp.exec(req.url);
                    if (values) {
                        hasListener = true;

                        if (stacks.listeners[req.method] === undefined ||
                            stacks.listeners[req.method].length === 0) {
                            res.status = 405;
                            res.end(res.status);
                            break;
                        }

                        values.shift();
                        let i = -1,
                            j = -1,
                            listeners = stacks.listeners[req.method],
                            next = () => {
                                i += 1;
                                if (i < listeners.length) {
                                    return listeners[i].call(this, req, res, next);
                                } else {
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