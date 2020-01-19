import { Run } from "./experiments";
import { EXPERIMENTS_FOLDER } from "./consts";
import * as PATH from "path"
import {spawn, ChildProcessWithoutNullStreams} from "child_process"
import * as PROCESS from "process"

export class Jupyter {
    runs: Run[]
    port: number
    proc: ChildProcessWithoutNullStreams

    constructor(runs: Run[], port: number = 6006) {
        this.runs = runs
        this.port = port
        this.proc = null
    }

    async start(): Promise<void> {
        let paths = this.runs.map((r) => `${r.experimentName}_${r.info.index}:` +
            PATH.join(EXPERIMENTS_FOLDER, r.experimentName, r.info.index, 'tensorboard'))
        let env = JSON.parse(JSON.stringify(PROCESS.env))
        if(!('PYTHONPATH' in env)) {
            env['PYTHONPATH'] = env['PWD']
        } else {
            env['PYTHONPATH'] += ":" + env['PWD']
        }

        let args = ['notebook', '--no-browser']
        console.log('jupyter', args)
        this.proc = spawn('jupyter', args, {env: env})

        let isClosed = false

        this.proc.on("close", (code, signal) => {
            isClosed = true
            console.log("Close", code, signal)
        })
        this.proc.stdout.on("data", (data: Buffer) => {
            console.log("TB out", data.toString())
        })
        this.proc.stderr.on("data", (data: Buffer) => {
            console.log("TB err", data.toString())
        })

        return new Promise((resolve, reject) => {
            setTimeout(() => {
                console.log("isClosed", isClosed)
                if(isClosed) {
                    reject()
                } else {
                    resolve()
                }
            }, 2500)
        })
    }

    stop() {
        if(this.proc == null) {
            return
        } else {
            this.proc.kill('SIGINT')
        }
    }
}