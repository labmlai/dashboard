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
    private port: Port
    private options: PortOptions
    private queue: Array<ResponseItem>
    private fresh: boolean

    constructor(data: CallPacket | PollPacket, port: Port, options: PortOptions) {
        this.id = data.id;
        this.port = port;
        this.options = options
        this.queue = [];
        this.fresh = true;
    }

    progress(data: Data, callback: Function) {
        this.queue.push({
            status: 'progress',
            data: data,
            callback: callback
        });
        this._handleQueue();
    }

    success(data: Data) {
        this.queue.push({
            status: 'success',
            data: data,
        });
        this._handleQueue();
    }

    fail(data: Data) {
        this.queue.push({
            status: 'fail',
            data: data,
        });
        this._handleQueue();
    }

    setOptions(options: PortOptions) {
        this.options = options;
        this.fresh = true;
        this._handleQueue();
    }

    private _multipleResponse(): void {
        let responseList: ResponseListItem[] = [];
        let callbacks = [];
        for (let i = 0; i < this.queue.length; ++i) {
            let d = this.queue[i];
            responseList.push({
                status: d.status,
                data: d.data,
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
        this.queue = [];
    }

    private _handleQueue(): void {
        if (!(this.queue.length > 0)) {
            return;
        }
        if (!this.port.isStreaming && !this.fresh) {
            return;
        }
        if (this.queue.length > 1) {
            this._multipleResponse();
            return
        }
        let d = this.queue[0];
        if (this.port.isStreaming) {
            this.port.respond(this, d.status, d.data, this.options, d.callback);
        } else if (this.fresh) {
            this.port.respond(this, d.status, d.data, this.options, d.callback);
            this.fresh = false;
        }
        this.queue = [];
    }
};

interface CallbackFunction {
    (data: Data, packet?: ResponsePacket): void
}
interface CallCallbacks {
    success: CallbackFunction
    fail?: CallbackFunction
    progress?: CallbackFunction
}

type Data = any

// Call class
class Call {
    id: string
    method: string
    data: Data
    callbacks: CallCallbacks
    port: Port
    constructor(id: string, method: string, data: Data, callbacks: CallCallbacks, port: Port) {
        this.id = id;
        this.method = method;
        this.data = data;
        this.callbacks = callbacks;
        this.port = port;
        null;
    }

    handle(data: Data, packet: ResponsePacket) {
        if (this.callbacks[packet.status] == null) {
            if (packet.status === 'progress') {
                return;
            }
            //Handled by caller
            throw new Error(`No callback registered ${this.method} ${packet.status}`);
        }
        let self = this;
        setTimeout(function () {
            try {
                return self.callbacks[packet.status](data, packet);
            } catch (error) {
                self.port.onError(error)
            }
        }, 0);

        return POLL_TYPE[packet.status] == null
    }
};

type Handler = { (data: Data, packet: CallPacket, response: IOResponse): void }

interface PortOptions {
    response?: any
    request?: any
    xhr?: XMLHttpRequest
}

type Status = "success" | "progress" | "fail"

type MessagePacket = ResponsePacket | PacketList | CallPacket | PollPacket
type MessageType = "poll" | "list" | "response" | "call"

interface PollPacket {
    type: MessageType
    id: string
}

interface CallPacket {
    type: MessageType
    id: string
    method: string
    data: Data
}

interface ResponsePacket {
    type: MessageType
    id: string
    status: Status
    data: Data
}

interface PacketList {
    type: MessageType
    list: MessagePacket[]
}

interface ResponseItem {
    status: Status
    data: Data
    callback?: any
}

interface ResponseListItem {
    status: Status
    data: Data
}

interface SimpleCallback {
    (): void
}

abstract class Port {
    isStreaming: boolean
    private handlers: { [method: string]: Handler }
    protected callsCache: { [callId: string]: Call }
    private callsCounter: number
    private id: number
    protected responses: { [callId: string]: IOResponse }

    constructor() {
        this.isStreaming = true
        this.handlers = {};
        this.callsCache = {};
        this.callsCounter = 0;
        this.id = Math.floor(Math.random() * 1000);
        this.responses = {};
    }

    protected abstract _send(data: CallPacket | PollPacket, callbacks: CallCallbacks)
    protected abstract _respond(response: ResponsePacket | PacketList, portOptions: PortOptions, callback)

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
                });
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

    // Send RPC call
    send(method: string, data: Data, success: Function): void
    send(method: string, data: Data, callbacks: CallCallbacks): void

    send(method: string, data: Data, f: any): void {
        let callbacks: CallCallbacks
        if ((typeof f) === 'function') {
            callbacks = {
                success: f
            };
        } else {
            callbacks = f
        }

        this.sendTyped(method, data, callbacks)
    }

    protected sendTyped(method: string, data: Data, callbacks: CallCallbacks) {
        if(!this.shouldSend(method, data, callbacks)) {
            return
        }
        let params = this._createCall(method, data, callbacks);
        this._send(params, callbacks);
    }

    protected shouldSend(method: string, data: Data, callbacks: CallCallbacks): boolean {
        return true
    }

    // Respond to a RPC call
    respond(response: IOResponse, status: Status, data: any, portOptions: PortOptions, callback): void {
        if (POLL_TYPE[status] == null) {
            delete this.responses[response.id];
        }
        if(!this.shouldRespond(response, status, data, portOptions)) {
            return
        }
        this._respond(this._createResponse(response, status, data), portOptions, callback);
    }

    protected shouldRespond(response: IOResponse, status: Status, data: any, portOptions: PortOptions): boolean {
        return true
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
            if(!this.shouldRespond(response, d.status, d.data, portOptions)) {
                continue
            }
            data.push(this._createResponse(response, d.status, d.data));
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
    private _createCall(method: string, data: any, callbacks: CallCallbacks): CallPacket {
        let call = new Call(`${this.id}-${this.callsCounter}`,
            method, data, callbacks, this);
        this.callsCounter++;
        this.callsCache[call.id] = call;
        let params: CallPacket = {
            type: 'call',
            id: call.id,
            method: call.method,
            data: call.data
        };
        return params;
    }

    // Create Response object
    private _createResponse(response: IOResponse, status: Status, data: Data): ResponsePacket {
        let params: ResponsePacket = {
            type: 'response',
            id: response.id,
            status: status,
            data: data
        };
        return params;
    }

    // Add handler
    on(method: string, callback: Handler) {
        return this.handlers[method] = callback;
    }

    // Handle incoming message
    protected _handleMessage(packet: MessagePacket, options: PortOptions = {}, last: boolean = true): void {
        switch (packet.type) {
            case 'list':
                packet = <PacketList>packet
                for (let i = 0; i < packet.list.length; ++i) {
                    this._handleMessage(packet.list[i], options, last && i + 1 === packet.list.length);
                }
                break
            case 'response':
                try {
                    this._handleResponse(<ResponsePacket>packet, options, last);
                } catch (error) {
                    this.onError(error)
                }
                break;
            case 'call':
                try {
                    this._handleCall(<CallPacket>packet, options, last);
                } catch (error) {
                    this.onError(error)
                }
                break;
            case 'poll':
                try {
                    this._handlePoll(<PollPacket>packet, options, last);
                } catch (error) {
                    this.onError(error)
                }
        }
    }

    protected _handleCall(packet: CallPacket, options: PortOptions, last: boolean): void {
        if(this.shouldCall(packet, options)) {
            return
        }
        if (this.handlers[packet.method] == null) {
            this.onHandleError(`Unknown method: ${packet.method}`, packet, options);
            return;
        }
        this.responses[packet.id] = new IOResponse(packet, this, options);
        this.handlers[packet.method](packet.data, packet, this.responses[packet.id]);
    }
    
    protected shouldCall(packet: CallPacket, options: PortOptions): boolean {
        return true
    }

    protected shouldPoll(packet: PollPacket, options: PortOptions): boolean {
        return true
    }

    protected _handleResponse(data: ResponsePacket, options: PortOptions, last: boolean): void {
        if(!this.shouldAcceptResponse(data, options)) {
            return
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

    protected shouldAcceptResponse(packet: ResponsePacket, options: PortOptions): boolean {
        return true
    }

    protected _handlePoll(data: PollPacket, options, last: boolean) {
        return this.onHandleError("Poll not implemented", data, options);
    }

};

export {
    LOG, ERROR_LOG,
    IOResponse,
    ResponsePacket, PacketList, CallPacket, PollPacket,
    Port, CallCallbacks,
    PortOptions, SimpleCallback
}