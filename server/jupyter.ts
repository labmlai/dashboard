import {Run} from '../common/experiments'
import {LAB} from './consts'
import * as PATH from 'path'
import {ChildProcessWithoutNullStreams, spawn} from 'child_process'
import * as PROCESS from 'process'
import {RunNodeJS} from './run_nodejs'
import {copyFile, exists, mkdir} from "./util";

export class Jupyter {
    port: number
    proc: ChildProcessWithoutNullStreams

    constructor(port: number = 6006) {
        this.port = port
        this.proc = null
    }

    async start(): Promise<void> {
        let env = JSON.parse(JSON.stringify(PROCESS.env))
        if (!('PYTHONPATH' in env)) {
            env['PYTHONPATH'] = env['PWD']
        } else {
            env['PYTHONPATH'] += ':' + env['PWD']
        }

        let args = ['notebook', '--no-browser']
        console.log('jupyter', args)
        this.proc = spawn('jupyter', args, {env: env})

        let isClosed = false

        this.proc.on('close', (code, signal) => {
            isClosed = true
            console.log('Close', code, signal)
        })
        this.proc.stdout.on('data', (data: Buffer) => {
            console.log('TB out', data.toString())
        })
        this.proc.stderr.on('data', (data: Buffer) => {
            console.log('TB err', data.toString())
        })

        return new Promise<void>((resolve, reject) => {
            setTimeout(() => {
                console.log('isClosed', isClosed)
                if (isClosed) {
                    reject()
                } else {
                    resolve()
                }
            }, 2500)
        })
    }

    stop() {
        if (this.proc == null) {
            return
        } else {
            this.proc.kill('SIGINT')
        }
    }

    async setupTemplate(run: Run, templateName: string) {
        let runNodeJs = RunNodeJS.create(run)
        let lab = await runNodeJs.getLab()
        let template = lab.analyticsTemplates[templateName]
        let destinationPath = PATH.join(
            LAB.analytics,
            run.experimentName,
            run.info.uuid
        )
        let destination = PATH.join(destinationPath, `${templateName}.ipynb`)
        let url = `http://localhost:8888/notebooks/${lab.analyticsPath}/${run.experimentName}/${run.info.uuid}/${templateName}.ipynb`

        console.log(url)
        if (await exists(destination)) {
            return url
        }

        await mkdir(destinationPath, {recursive: true})

        console.log(template, destination)

        await copyFile(template, destination)

        return url
    }
}
