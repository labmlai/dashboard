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

    constructor(data: CallPacket | PollPacket, port: Port, options: PortOptions) {
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

    onHandleError(msg: string, data: CallPacket | PollPacket, options: PortOptions) {
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
    private _createCall(method: string, data: any, callbacks: CallCallbacks, options: PacketOptions): CallPacket {
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
    private _createResponse(response: IOResponse, status: Status, data: Data, options): ResponsePacket {
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
    protected _handleMessage(data: MessagePacket, options: PortOptions = {}, last: boolean = true): void {
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

export {
    LOG, ERROR_LOG,
    ResponsePacket, PacketList, CallPacket, PollPacket,
    Port, CallCallbacks,
    PortOptions, SimpleCallback
}