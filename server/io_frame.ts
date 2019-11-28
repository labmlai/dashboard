
import {
    Port, 
    PacketList, ResponsePacket, CallPacket, PortOptions,
    SimpleCallback,
} from "./io"

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

export { FramePort }