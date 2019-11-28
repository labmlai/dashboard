function LOG(...argArr: any[]) {
    console.log.call(console, ...argArr)
}

function ERROR_LOG(...argArr: any[]) {
    console.error.call(console, ...argArr)
}

let POLL_TYPE = {
    progress: true
};

// Response class
class IOResponse {
    id: string
    port: Port
    options: PortOptions
    queue: Array<ResponseItem>
    fresh: boolean

    constructor(data, port: Port, options: PortOptions) {
        this.id = data.id;
        this.port = port;
        this.options = options
        this.queue = [];
        this.fresh = true;
    }

    progress(progress, data, callback) {
        this.queue.push({
            status: 'progress',
            data: data,
            options: {
                progress: progress
            },
            callback: callback
        });
        return this._handleQueue();
    }

    success(data: Data) {
        this.queue.push({
            status: 'success',
            data: data,
            options: {}
        });
        return this._handleQueue();
    }

    fail(data: Data) {
        this.queue.push({
            status: 'fail',
            data: data,
            options: {}
        });
        return this._handleQueue();
    }

    setOptions(options) {
        this.options = options;
        this.fresh = true;
        return this._handleQueue();
    }

    _multipleResponse() {
        let responseList: ResponseListItem[] = [];
        let callbacks = [];
        for (let i = 0; i < this.queue.length; ++i) {
            let d = this.queue[i];
            responseList.push({
                status: d.status,
                data: d.data,
                options: d.options
            });
            if (d.callback != null) {
                callbacks.push(d.callback);
            }
        }

        function done() {
            for (let j = 0; j < callbacks.length; ++j) {
                callbacks[j]();
            }
        };

        if (this.port.isStreaming) {
            this.port.respondMultiple(this, responseList, this.options, done);
        } else if (this.fresh) {
            this.port.respondMultiple(this, responseList, this.options, done);
            this.fresh = false;
        }
        return this.queue = [];
    }

    _handleQueue() {
        if (!(this.queue.length > 0)) {
            return;
        }
        if (!this.port.isStreaming && !this.fresh) {
            return;
        }
        if (this.queue.length > 1) {
            return this._multipleResponse();
        }
        let d = this.queue[0];
        if (this.port.isStreaming) {
            this.port.respond(this, d.status, d.data, d.options, this.options, d.callback);
        } else if (this.fresh) {
            this.port.respond(this, d.status, d.data, d.options, this.options, d.callback);
            this.fresh = false;
        }
        return this.queue = [];
    }
};

interface CallCallbacks {
    success: any
    fail?: any
    progress?: any
}

type Data = any
type CallStatus = "success" | "fail" | "progress"

// Call class
class Call {
    id: string
    method: string
    data: Data
    callbacks: CallCallbacks
    options: PacketOptions
    port: Port
    constructor(id: string, method: string, data: Data, callbacks: CallCallbacks, options: PacketOptions, port: Port) {
        this.id = id;
        this.method = method;
        this.data = data;
        this.callbacks = callbacks;
        this.options = options;
        this.port = port;
        null;
    }

    handle(data: Data, options: CallOptions) {
        if (this.callbacks[options.status] == null) {
            if (options.status === 'progress') {
                return;
            }
            //Handled by caller
            throw new Error(`No callback registered ${this.method} ${options.status}`);
        }
        let self = this;
        setTimeout(function () {
            try {
                return self.callbacks[options.status](data, options);
            } catch (error) {
                self.port.onError(error)
            }
        }, 0);

        return POLL_TYPE[options.status] != null
    }
};

interface RespondFunc {
    (response: IOResponse, status: string, data: any, options: any, portOptions: PortOptions, callback: any): void
}

interface CallFunc {
    (data: CallPacket, options: PortOptions, last: boolean): void
}

interface SendFunc {
    (method: string, data: Data, callbacks: CallCallbacks, options: PacketOptions): void
}

interface ResponseFunc {
    (data: ResponsePacket, options: PortOptions, last: boolean): void
}

interface PortWrappers {
    send: SendFunc[],
    respond: RespondFunc[]
    handleCall: CallFunc[],
    handleResponse: ResponseFunc[]
}

interface PortWrapper {
    send?: SendFunc,
    respond?: RespondFunc
    handleCall?: CallFunc,
    handleResponse?: ResponseFunc
}

interface Handler {
    (data: any, dataParent: any, response: IOResponse): void
}

interface PortOptions {
    response?: any
    request?: any
    xhr?: XMLHttpRequest
}

type Status = "success" | "progress" | "fail"

interface CallOptions {
    status: string
}

interface PacketOptions {
    progress?: number
}

type MessagePacket = ResponsePacket | PacketList | CallPacket | PollPacket
type MessageType = "poll" | "list" | "response" | "call"

interface PollPacket extends PacketOptions {
    type: MessageType
    id: string
}

interface CallPacket extends PacketOptions {
    type: MessageType
    id: string
    method: string
    data: Data
}

interface ResponsePacket extends PacketOptions {
    type: MessageType
    id: string
    status: Status
    data: Data
    // [index: string]: any
}

interface PacketList extends PacketOptions {
    type: MessageType
    list: MessagePacket[]
    // [index: string]: any
}

interface ResponseItem {
    status: Status
    data: Data
    options: PacketOptions
    callback?: any
}

interface ResponseListItem {
    status: Status
    data: Data
    options: PacketOptions
}

interface SimpleCallback {
    (): void
}

abstract class Port {
    isStreaming: boolean
    handlers: { [method: string]: Handler }
    callsCache: { [callId: string]: Call }
    callsCounter: number
    id: number
    responses: { [callId: string]: IOResponse }
    wrappers: PortWrappers

    constructor() {
        this.isStreaming = true
        this.handlers = {};
        this.callsCache = {};
        this.callsCounter = 0;
        this.id = Math.floor(Math.random() * 1000);
        this.responses = {};
        this.wrappers = {
            send: [],
            respond: [],
            handleCall: [],
            handleResponse: []
        };
    }

    abstract _send(data: CallPacket | PollPacket, callbacks: CallCallbacks)
    abstract _respond(response: ResponsePacket | PacketList, portOptions: PortOptions, callback)

    onError(err: Error) {
        LOG(err)
    }

    onCallError(msg: string, options = null) {
        let callsCache = this.callsCache;
        this.callsCache = {};
        for (let id in callsCache) {
            let call = callsCache[id];
            if (call.callbacks.fail == null) {
                ERROR_LOG('fail callback not registered', call.method, call.data);
            } else {
                call.callbacks.fail({
                    error: 'connectionError',
                    msg: msg,
                    options: options
                }, {});
            }
        }
        return this.errorCallback(msg, options);
    }

    onHandleError(msg: string, data: Data, options: PortOptions) {
        this.errorCallback(msg, data);
        let response = new IOResponse(data, this, options);
        return response.fail(msg);
    }

    errorCallback(msg: string, options: any) {
        return ERROR_LOG(msg, options);
    }

    wrap(wrapper: PortWrapper) {
        for (let key in wrapper) {
            let f = wrapper[key];
            if (this.wrappers[key] != null) {
                this.wrappers[key].push(f);
            } else {
                this[key] = f;
            }
        }
    }

    // Send RPC call
    send(method: string, data: Data, callbacks: CallCallbacks, options: PacketOptions): void {
        if ((typeof callbacks) === 'function') {
            callbacks = {
                success: callbacks
            };
        }
        for (let f of this.wrappers.send) {
            if (!f.call(this, method, data, callbacks, options)) {
                return;
            }
        }
        let params = this._createCall(method, data, callbacks, options);
        this._send(params, callbacks);
    }

    // Respond to a RPC call
    respond(response: IOResponse, status: Status, data: any, options: PacketOptions, portOptions: PortOptions, callback): void {
        if (POLL_TYPE[status] == null) {
            delete this.responses[response.id];
        }
        for (let f of this.wrappers.respond) {
            if (!f.apply(this, [response, status, data, options, portOptions])) {
                return;
            }
        }
        this._respond(this._createResponse(response, status, data, options), portOptions, callback);
    }

    respondMultiple(response: IOResponse, list: ResponseListItem[], portOptions: PortOptions, callback: any): void {
        for (let d of list) {
            if (POLL_TYPE[d.status] == null) {
                delete this.responses[response.id];
                break;
            }
        }
        let data = [];
        for (let d of list) {
            let cancel = false;
            if (d.options == null) {
                d.options = {};
            }
            for (let f of this.wrappers.respond) {
                let r = f.apply(this, [response, d.status, d.data, d.options, portOptions]);
                if (!r) {
                    cancel = true;
                    break;
                }
                if (cancel) {
                    continue;
                }
            }
            data.push(this._createResponse(response, d.status, d.data, d.options));
        }
        if (data.length === 0) {
            return;
        }
        this._respond({
            type: 'list',
            list: data
        }, portOptions, callback);
    }

    // Create Call object
    _createCall(method: string, data: any, callbacks: CallCallbacks, options: PacketOptions): CallPacket {
        let call = new Call(`${this.id}-${this.callsCounter}`,
            method, data, callbacks, options, this);
        this.callsCounter++;
        this.callsCache[call.id] = call;
        let params: CallPacket = {
            type: 'call',
            id: call.id,
            method: call.method,
            data: call.data
        };
        for (let k in options) {
            let v = options[k];
            params[k] = v;
        }
        return params;
    }

    // Create Response object
    _createResponse(response: IOResponse, status: Status, data: Data, options): ResponsePacket {
        let params: ResponsePacket = {
            type: 'response',
            id: response.id,
            status: status,
            data: data
        };
        for (let k in options) {
            let v = options[k];
            params[k] = v;
        }
        return params;
    }

    // Add handler
    on(method: string, callback: Handler) {
        return this.handlers[method] = callback;
    }

    // Handle incoming message
    _handleMessage(data: MessagePacket, options: PortOptions = {}, last: boolean = true): void {
        switch (data.type) {
            case 'list':
                data = <PacketList>data
                for (let i = 0; i < data.list.length; ++i) {
                    this._handleMessage(data.list[i], options, last && i + 1 === data.list.length);
                }
                break
            case 'response':
                try {
                    this._handleResponse(<ResponsePacket>data, options, last);
                } catch (error) {
                    this.onError(error)
                }
                break;
            case 'call':
                try {
                    this._handleCall(<CallPacket>data, options, last);
                } catch (error) {
                    this.onError(error)
                }
                break;
            case 'poll':
                try {
                    this._handlePoll(<PollPacket>data, options, last);
                } catch (error) {
                    this.onError(error)
                }
        }
    }

    _handleCall(data: CallPacket, options: PortOptions, last: boolean): void {
        for (let f of this.wrappers.handleCall) {
            if (!f.call(this, data, options, last)) {
                return;
            }
        }
        if (this.handlers[data.method] == null) {
            this.onHandleError(`Unknown method: ${data.method}`, data, options);
            return;
        }
        this.responses[data.id] = new IOResponse(data, this, options);
        this.handlers[data.method](data.data, data, this.responses[data.id]);
    }

    _handleResponse(data: ResponsePacket, options: PortOptions, last: boolean): void {
        for (let f of this.wrappers.handleResponse) {
            if (!f.call(this, data, options, last)) {
                return
            }
        }
        if (this.callsCache[data.id] == null) {
            //Cannot reply
            this.errorCallback(`Response without call: ${data.id}`, data);
            return;
        }
        try {
            if (this.callsCache[data.id].handle(data.data, data)) {
                delete this.callsCache[data.id];
            }
        } catch (error) {
            this.errorCallback(error.message, data);
            delete this.callsCache[data.id];
        }
    }

    _handlePoll(data: PollPacket, options, last: boolean) {
        return this.onHandleError("Poll not implemented", data, options);
    }

};

// WorkerPort class
class WorkerPort extends Port {
    worker: Worker

    constructor(worker) {
        super();
        this.worker = worker;
        this.worker.onmessage = this._onMessage.bind(this);
    }

    //@worker.onerror = @onCallError.bind this
    _send(data: CallPacket) {
        let dd = data.data
        let transferList
        if ((dd != null) && (dd._transferList != null)) {
            transferList = dd._transferList;
            delete dd._transferList;
        } else {
            transferList = [];
        }
        return this.worker.postMessage(data, transferList);
    }

    _respond(data: ResponsePacket, portOptions: PortOptions, callback: SimpleCallback) {
        let dd = data.data;
        let transferList
        if ((dd != null) && (dd._transferList != null)) {
            transferList = dd._transferList;
            delete dd._transferList;
        } else {
            transferList = [];
        }
        this.worker.postMessage(data, transferList);
        if(typeof callback === "function") callback();
    }

    _onMessage(e) {
        return this._handleMessage(e.data);
    }

};

// FramePort class
class FramePort extends Port {
    source: Window
    dest: Window

    constructor(source, dest) {
        super();
        this.source = source;
        this.dest = dest;
        this.source.addEventListener('message', this._onMessage.bind(this));
    }

    _send(data: CallPacket) {
        return this.dest.postMessage(data, '*');
    }

    _respond(data: ResponsePacket | PacketList, portOptions: PortOptions, callback: SimpleCallback) {
        this.dest.postMessage(data, '*');
        return typeof callback === "function" ? callback() : void 0;
    }

    _onMessage(e) {
        return this._handleMessage(e.data);
    }

};

class WebSocketPort extends Port {
    socket: WebSocket

    constructor(socket) {
        super();
        this.socket = socket;
        this.socket.onmessage(this._onMessage.bind(this));
    }

    _send(data: CallPacket) {
        return this.socket.send(JSON.stringify(data));
    }

    _respond(data: ResponsePacket | PacketList, portOptions: PortOptions, callback) {
        this.socket.send(JSON.stringify(data));
        return typeof callback === "function" ? callback() : void 0;
    }

    _onMessage(e) {
        return this._handleMessage(e.data);
    }

};

// ServerSocketPort class
class ServerSocketPort extends Port {
    socket: WebSocket

    constructor(socket) {
        super();
        this.socket = socket;
        this.socket.onopen(this._onConnection.bind(this));
    }

    _send(data: CallPacket) {
        throw Error()
    }

    _respond(data: ResponsePacket | PacketList, portOptions: PortOptions, callback: SimpleCallback) {
        throw Error()
    }


    _onConnection(socket) {
        return new WebSocketPort(socket,
            // {handlers: this.handlers}
        );
    }

};


// AJAX class
class AjaxHttpPort extends Port {
    protocol: string
    host: string
    port: string
    path: string
    url: string

    constructor(protocol: string, host: string, port: string, path: string) {
        super();
        this.isStreaming = false
        this.protocol = protocol;
        this.host = host;
        this.port = port;
        this.path = path
        this.url = this.path;
        if (this.protocol != null) {
            if ((this.host != null) && (this.port == null)) {
                this.url = `${this.protocol}://${this.host}${this.path}`;
            } else if ((this.host != null) && (this.port != null)) {
                this.url = `${this.protocol}://${this.host}:${this.port}${this.path}`;
            }
        } else {
            if ((this.host != null) && (this.port == null)) {
                this.url = `//${this.host}${this.path}`;
            } else if ((this.host != null) && (this.port != null)) {
                this.url = `//${this.host}:${this.port}${this.path}`;
            }
        }
    }

    _onRequest(xhr) {
        let jsonData

        if (xhr.readyState !== 4) {
            return;
        }
        let status = xhr.status;
        if ((!status && xhr.responseText != null && xhr.responseText !== '') ||
            (status >= 200 && status < 300) ||
            (status === 304)) {
            try {
                jsonData = JSON.parse(xhr.responseText);
            } catch (error) {
                this.onCallError('ParseError', error);
                return;
            }
            return this._handleMessage(jsonData, {
                xhr: xhr
            });
        } else {
            return this.onCallError('Cannot connect to server');
        }
    }

    _respond(data: ResponsePacket | PacketList, portOptions: PortOptions, callback: SimpleCallback) {
        this.errorCallback('AJAX cannot respond', data);
        return typeof callback === "function" ? callback() : void 0;
    }

    _send(data: CallPacket | PollPacket) {
        let dataStr = JSON.stringify(data);
        let xhr = new XMLHttpRequest;
        xhr.open('POST', this.url);
        xhr.onreadystatechange = () => {
            return this._onRequest(xhr);
        };
        xhr.setRequestHeader('Accept', 'application/json');
        //xhr.setRequestHeader 'Content-Type', 'application/json'
        return xhr.send(dataStr);
    }

    _handleResponse(data, options, last = true): void {
        for (let f of this.wrappers.handleResponse) {
            if (!f.apply(this, arguments)) {
                return;
            }
        }
        if (this.callsCache[data.id] == null) {
            this.errorCallback(`Response without call: ${data.id}`, data);
            return;
        }
        let call = this.callsCache[data.id];
        try {
            if (call.handle(data.data, data)) {
                delete this.callsCache[data.id];
            } else if (last) {
                let params: PollPacket = {
                    type: 'poll',
                    id: call.id
                };
                for (let k in call.options) {
                    let v = call.options[k];
                    params[k] = v;
                }
                this._send(params);
            }
        } catch (error) {
            this.errorCallback(error.message, data);
            delete this.callsCache[data.id];
        }
    }

};

class NodeHttpPort extends Port {
    host: string
    port: number
    path: string
    http: any
    httpOptions: any

    constructor(http, host, port: number, path = '/') {
        super();
        this.isStreaming = false
        this.host = host
        this.port = port
        this.path = path
        this.http = http;
        this._createHttpOptions();
    }

    _createHttpOptions() {
        return this.httpOptions = {
            hostname: this.host,
            port: this.port,
            path: this.path,
            method: 'POST',
            agent: false,
            headers: {
                accept: 'application/json'
            },
            'content-type': 'application/json'
        };
    }

    _onRequest(res) {
        let data = '';
        //LOG 'STATUS: ' + res.statusCode
        //LOG 'HEADERS: ' + JSON.stringify res.headers
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            return data += chunk;
        });
        //LOG 'result', res
        return res.on('end', () => {
            let jsonData;
            try {
                jsonData = JSON.parse(data);
            } catch (error) {
                this.onCallError('ParseError', error);
                return;
            }
            return this._handleMessage(jsonData, {
                response: res
            });
        });
    }

    _respond(data: ResponsePacket | PacketList, portOptions: PortOptions, callback: SimpleCallback) {
        let dataStr = JSON.stringify(data);
        let res = portOptions.response;
        res.setHeader('content-length', Buffer.byteLength(dataStr, 'utf8'));
        if (callback != null) {
            res.once('finish', function () {
                return callback();
            });
            res.once('close', function () {
                return callback();
            });
        }
        res.write(dataStr);
        return res.end();
    }

    _send(data: CallPacket | PollPacket, callbacks: CallCallbacks) {
        let dataStr = JSON.stringify(data);
        let options = this.httpOptions;
        options.headers['content-length'] = Buffer.byteLength(dataStr, 'utf8');
        let req = this.http.request(options, this._onRequest.bind(this));
        delete options.headers['content-length'];
        req.on('error', (e) => {
            try {
                return typeof callbacks.fail === "function" ? callbacks.fail(e) : void 0;
            } catch (error) {
                this.onError(error)
            }
        });
        req.write(dataStr);
        return req.end();
    }

    _handleResponse(data, options, last = true) {
        for (let f of this.wrappers.handleResponse) {
            if (!f.apply(this, arguments)) {
                return;
            }
        }
        if (this.callsCache[data.id] == null) {
            this.errorCallback(`Response without call: ${data.id}`, data);
            return;
        }
        let call = this.callsCache[data.id];
        if (!call.handle(data.data, data)) {
            if (!last) {
                return;
            }
            let params: PollPacket = {
                type: 'poll',
                id: call.id
            };
            for (let k in call.options) {
                let v = call.options[k];
                params[k] = v;
            }
            return this._send(params, call.callbacks);
        }
    }

};

class NodeHttpServerPort extends Port {
    port: number
    http: any
    zlib: any
    allowOrigin: string
    server: any
    httpOptionsHeader: any
    handleRequest: any

    constructor(port: number, http, allowOrigin, zlib = null) {
        super();
        this.isStreaming = false
        this.port = port;
        this.http = http;
        this.zlib = zlib;
        this.allowOrigin = allowOrigin;
        this.httpOptionsHeader = {
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
            'Access-Control-Allow-Headers': 'origin, content-type',
            'Access-Control-Max-Age': 1728000,
            'Vary': 'Accept-Encoding, Origin',
            'Content-Encoding': 'gzip',
            'Content-Length': 0,
            'Content-Type': 'text/plain',
            'Allow': 'POST, GET, OPTIONS'
        }
        if (this.allowOrigin != null) {
            this.httpOptionsHeader['Access-Control-Allow-Origin'] = this.allowOrigin
        }
    }

    _send(data: CallPacket) {
        throw Error()
    }

    _onRequest(req: any, res: any) {
        if (req.method.toUpperCase() === 'OPTIONS') {
            res.writeHead(200, this.httpOptionsHeader);
            res.end()
            return
        }
        if (this.handleRequest != null) {
            if (this.handleRequest(req, res)) {
                return
            }
        }
        let data = '';
        res.setHeader('content-type', 'application/json');
        req.on('data', function (chunk) {
            return data += chunk;
        });
        return req.on('end', () => {
            let jsonData;
            try {
                jsonData = JSON.parse(data);
            } catch (error) {
                this.errorCallback('ParseError', error);
                return;
            }
            return this._handleMessage(jsonData, {
                response: res,
                request: req
            });
        });
    }

    _respond(data: ResponsePacket | PacketList, portOptions: PortOptions, callback: SimpleCallback) {
        if (this.allowOrigin != null) {
            portOptions.response.setHeader('Access-Control-Allow-Origin', this.allowOrigin);
        }
        let accept = portOptions.request.headers['accept-encoding'];
        if (accept == null) {
            accept = '';
        }
        if (this.zlib == null) {
            accept = '';
        }
        let buffer = new Buffer(JSON.stringify(data), 'utf8');
        if (accept.match(/\bgzip\b/)) {
            portOptions.response.setHeader('content-encoding', 'gzip');
            this.zlib.gzip(buffer, (err, result) => {
                if (err != null) {
                    return this.errorCallback('GZipeError', err);
                }
                this._sendBuffer(result, portOptions.response, callback);
            });
        } else if (accept.match(/\bdeflate\b/)) {
            portOptions.response.setHeader('content-encoding', 'deflate');
            this.zlib.deflate(buffer, (err, result) => {
                if (err != null) {
                    return this.errorCallback('DeflateError', err);
                }
                this._sendBuffer(result, portOptions.response, callback);
            });
        } else {
            this._sendBuffer(buffer, portOptions.response, callback);
        }
    }

    _sendBuffer(buf, res, callback) {
        res.setHeader('content-length', buf.length);
        if (callback != null) {
            res.once('finish', function () {
                callback();
            });
            res.once('close', function () {
                callback();
            });
        }
        res.write(buf);
        return res.end();
    }

    listen() {
        this.server = this.http.createServer(this._onRequest.bind(this));
        return this.server.listen(this.port);
    }

    _handlePoll(data: PollPacket, options: PortOptions) {
        for (let f of this.wrappers.handleCall) {
            if (!f.call(this, data, options, false)) {
                return;
            }
        }
        if (this.responses[data.id] == null) {
            this.onHandleError(`Poll without response: ${data.id}`, data, options);
            return;
        }
        return this.responses[data.id].setOptions(options);
    }

};

// NodeHttpsServerPort class
class NodeHttpsServerPort extends NodeHttpServerPort {
    key: string
    cert: string

    constructor(port: number, http, allowOrigin, zlib, key, cert) {
        super(port, http, allowOrigin, zlib);
        this.key = key;
        this.cert = cert;
    }

    listen() {
        let options = {
            key: this.key,
            cert: this.cert
        };
        this.server = this.http.createServer(options, this._onRequest.bind(this));
        return this.server.listen(this.port);
    }

};

export { WorkerPort, FramePort, WebSocketPort, AjaxHttpPort, NodeHttpPort, NodeHttpServerPort, NodeHttpsServerPort, ServerSocketPort }