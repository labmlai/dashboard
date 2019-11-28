import {
    Port, 
    PacketList, ResponsePacket, CallPacket, PortOptions,
    SimpleCallback,
} from "./io"

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


export { WebSocketPort, ServerSocketPort }