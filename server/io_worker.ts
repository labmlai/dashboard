import {
    Port, ResponsePacket, CallPacket, PortOptions,
    SimpleCallback,
} from "./io"

class WorkerPort extends Port {
    worker: Worker

    constructor(worker: Worker) {
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
        if (typeof callback === "function") callback();
    }

    _onMessage(e) {
        return this._handleMessage(e.data);
    }

};

export { WorkerPort }