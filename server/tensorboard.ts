import {Run} from '../common/experiments'
import {LAB} from './consts'
import * as PATH from 'path'
import {ChildProcessWithoutNullStreams, spawn} from 'child_process'
import {mkdir, rmtree, symlink} from "./util";

export class Tensorboard {
    runs: Run[]
    port: number
    proc: ChildProcessWithoutNullStreams

    constructor(runs: Run[], port: number = 6006) {
        this.runs = runs
        this.port = port
        this.proc = null
    }

    async start(): Promise<void> {
        let path = PATH.join(LAB.analytics,
            LAB.tensorboardLogDir)
        await rmtree(path)
        await mkdir(path, {recursive: true})

        for (let r of this.runs) {
            try {
                await symlink(PATH.join(
                    LAB.experiments,
                    r.experimentName,
                    r.info.uuid,
                    'tensorboard'
                    ),
                    PATH.join(path, `${r.experimentName}_${r.info.uuid}`))
            } catch (e) {
                console.log(e)
            }
        }
        let args = [
            `--logdir=${path}`,
            '--port',
            `${this.port}`
        ]
        console.log('tensorboard', args)
        this.proc = spawn('tensorboard', args)

        return new Promise<void>((resolve, reject) => {
            this.proc.on('close', (code, signal) => {
                console.log('Close', code, signal)
                reject()
            })
            this.proc.stdout.on('data', (data: Buffer) => {
                console.log('TB out', data.toString())
            })
            this.proc.stderr.on('data', (data: Buffer) => {
                console.log('TB err', data.toString())
                if (data.toString().indexOf('Press CTRL+C to quit') !== -1) {
                    resolve()
                }
            })
        })
    }

    stop() {
        if (this.proc == null) {
            return
        } else {
            this.proc.kill('SIGINT')
        }
    }
}
