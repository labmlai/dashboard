import {
    Port, PacketList, ResponsePacket, CallPacket, PollPacket,
    PortOptions,
    SimpleCallback,
} from "./io"

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

export { AjaxHttpPort }