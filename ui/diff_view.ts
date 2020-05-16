import {ROUTER, SCREEN} from './app'
import {Weya as $, WeyaElement} from '../lib/weya/weya'
import {Run} from '../common/experiments'
import {getRuns} from './cache'
import {RunUI} from './run_ui'
import {highlight} from './hljs'

class DiffView {
    run: Run
    runUI: RunUI
    elem: WeyaElement
    uuid: string
    diffView: HTMLDivElement
    diff: string

    constructor(uuid: string) {
        this.uuid = uuid
    }

    render() {
        this.elem = <HTMLElement>$('div.container', $ => {
            this.diffView = <HTMLDivElement>$('div.diff', '')
        })

        this.renderRun().then()

        return this.elem
    }

    private async renderRun() {
        this.run = (await getRuns()).getRun(this.uuid)
        this.runUI = RunUI.create(this.run)
        this.diff = await this.runUI.loadDiff()

        let h = highlight('diff', this.diff, true, null)
        let diffPre: HTMLElement
        $(this.diffView, $ => {
            diffPre = <HTMLElement>$('pre')
        })

        diffPre.innerHTML = h.value
    }
}

export class DiffHandler {
    constructor() {
        ROUTER.route('run/:uuid/diff', [this.handleRun])
    }

    handleRun = (uuid: string) => {
        SCREEN.setView(new DiffView(uuid))
    }
}
