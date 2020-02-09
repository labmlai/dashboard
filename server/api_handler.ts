import {Port, Data, CallPacket, IOResponse} from '../lib/io/io'

function getParameters(func: Function) {
    let code = func.toString().replace(/\n/g, '')
    let argumentList = new RegExp(
        '(?:' + func.name + '\\s*|^)\\s*\\((.*?)\\)'
    ).exec(code)[1]
    // remove comments
    argumentList = argumentList.replace(/\/\*.*?\*\//g, '')
    // remove spaces
    argumentList = argumentList.replace(/ /g, '')
    if (argumentList === '') {
        return []
    }
    return argumentList.split(',')
}

function createCaller(port: Port, name: string, args: string[]) {
    function caller() {
        let params = {}
        if (arguments.length !== args.length) {
            throw Error('Invalid call' + name + args + arguments)
        }

        for (let i = 0; i < args.length; ++i) {
            params[args[i]] = arguments[i]
        }

        return new Promise((resolve, reject) => {
            port.send(name, params, (data: any, options: any) => {
                resolve(data)
            })
        })
    }

    return caller
}

export function wrapAPI(port: Port, api: object) {
    let proto = api['__proto__']
    let wrappers = {}

    for (let k of Object.getOwnPropertyNames(proto)) {
        if (k === 'constructor') {
            continue
        }

        let func = proto[k]
        let args = getParameters(func)
        wrappers[k] = createCaller(port, k, args)
    }

    for (let k in wrappers) {
        proto[k] = wrappers[k]
    }
}

function createListener(
    port: Port,
    name: string,
    api: object,
    func: Function,
    args: string[]
) {
    async function listener(
        data: Data,
        packet: CallPacket,
        response: IOResponse
    ) {
        let params = []

        for (let i = 0; i < args.length; ++i) {
            params.push(data[args[i]])
        }

        let result = await func.apply(api, params)
        response.success(result)
    }

    port.on(name, listener)
}

export function listenAPI(port: Port, api: object) {
    let proto = api['__proto__']

    for (let k of Object.getOwnPropertyNames(proto)) {
        if (k === 'constructor') {
            continue
        }

        let func = proto[k]
        let args = getParameters(func)
        createListener(port, k, api, func, args)
    }
}
