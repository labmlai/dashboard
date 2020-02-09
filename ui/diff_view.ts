import { ROUTER, SCREEN } from './app'
import { Weya as $, WeyaElement } from '../lib/weya/weya'
import { Run } from '../common/experiments'
import { getExperiments, clearCache } from './cache'
import { RunUI } from './run_ui'
import { renderConfigs } from './configs'
import { renderValues } from './indicators'
import { InfoList, InfoItem } from './view_components/info_list'
import { formatSize } from './view_components/format'
import { highlight } from './hljs'

class DiffView {
    run: Run
    runUI: RunUI
    elem: WeyaElement
    tensorboardBtn: HTMLButtonElement
    indicatorsView: HTMLDivElement
    experimentName: string
    runIndex: string
    diffView: HTMLDivElement
    configsView: HTMLDivElement
    jupyterBtn: HTMLButtonElement
    analyticsBtns: HTMLDivElement
    diff: string

    constructor(experimentName: string, runIndex: string) {
        this.experimentName = experimentName
        this.runIndex = runIndex
    }

    render() {
        this.elem = <HTMLElement>$('div.container', $ => {
            this.diffView = <HTMLDivElement>$('div.diff', '')
        })

        this.renderRun()

        return this.elem
    }

    private async renderRun() {
        let experiment = (await getExperiments()).get(this.experimentName)
        this.run = experiment.getRun(this.runIndex)
        this.runUI = RunUI.create(this.run)
        this.diff = await this.runUI.getDiff()

        let info = this.run.info
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
        ROUTER.route('experiment/:name/:runIndex/diff', [this.handleRun])
    }

    handleRun = (name: string, runIndex: string) => {
        SCREEN.setView(new DiffView(name, runIndex))
    }
}
