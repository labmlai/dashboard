
import { ROUTER, SCREEN } from "./app"
import { Weya as $, WeyaElement } from "./weya/weya"
import { Run } from "./experiments"
import { getExperiments, clearCache } from "./cache"
import { RunUI } from "./run_ui"
import { renderConfigs } from "./configs"
import { renderValues } from "./indicators"
import { InfoList, InfoItem } from "./view_components/info_list"
import { formatSize } from "./view_components/format"

class RunView {
    run: Run
    runUI: RunUI
    elem: WeyaElement
    tensorboardBtn: HTMLButtonElement
    indicatorsView: HTMLDivElement
    experimentName: string
    runIndex: string
    runView: HTMLDivElement
    configsView: HTMLDivElement
    jupyterBtn: HTMLButtonElement
    analyticsBtns: HTMLDivElement

    constructor(experimentName: string, runIndex: string) {
        this.experimentName = experimentName
        this.runIndex = runIndex
    }

    render() {
        this.elem = <HTMLElement>$('div.container', $ => {
            this.runView = <HTMLDivElement>$('div.run_single', '')
        })

        this.renderRun()

        return this.elem
    }

    private async renderRun() {
        let experiment = (await getExperiments()).get(this.experimentName)
        this.run = experiment.getRun(this.runIndex)
        this.runUI = RunUI.create(this.run)

        let info = this.run.info

        $(this.runView, $ => {
            $('h1', $ => {
                $('label', `${this.run.experimentName}`)
                $('span', ' - ')
                $('label', `${info.index}`)
                if (info.comment.trim() !== "") {
                    $('span', ':')
                    $('span', info.comment)
                }
            })

            $('button', 'Remove', {
                on: { click: this.onRemoveClick }
            })

            $('div', $ => {
                $('i.fa.fa-history.key_icon')
                $('span', info.commit_message)
            })
            $('div', $ => {
                $('i.fa.fa-calendar.key_icon')
                $('span', info.trial_date)
                $('span.key_split', '')
                $('i.fa.fa-clock.key_icon')
                $('span', info.trial_time)
            })


            $('div.block', $ => {
                let commit_info: InfoItem[] = [['.key', 'Commit'],
                ['.value', info.commit]]
                if (info.is_dirty) {
                    commit_info.push(['.link', '[dirty]'])
                }
                new InfoList(commit_info, '.mono').render($)

                new InfoList([['.key', 'Python File'],
                ['.value', info.python_file]], '.mono').render($)
            })

            $('div.block', $ => {
                $('i.fa.fa-save.key_icon')
                let size = info.sqlite_size + info.analytics_size + info.checkpoints_size + info.tensorboard_size
                $('span', formatSize(size))

                new InfoList([['.key', 'Checkpoints'],
                ['.value', formatSize(info.checkpoints_size)]], '.mono').render($)

                new InfoList([['.key', 'SQLite'],
                ['.value', formatSize(info.sqlite_size)]], '.mono').render($)

                new InfoList([['.key', 'Analytics'],
                ['.value', formatSize(info.analytics_size)]], '.mono').render($)

                new InfoList([['.key', 'TensorBoard'],
                ['.value', formatSize(info.tensorboard_size)]], '.mono').render($)
            })

            this.indicatorsView = <HTMLDivElement>$('div.indicators.block')

            this.configsView = <HTMLDivElement>$('div.configs.block')

            this.tensorboardBtn = <HTMLButtonElement>$('button', 'Launch Tensorboard', {
                on: { click: this.onTensorboardClick }
            })

            this.analyticsBtns = <HTMLDivElement>$('div.analytics_buttons')
        })

        this.renderIndicators()
        this.renderConfigs()
        this.renderAnalyticsBtns()

        return this.elem
    }

    private onTensorboardClick = async (e: Event) => {
        e.preventDefault()
        e.stopPropagation()

        let url = await this.runUI.launchTensorboard()
        if (url === "") {
            alert("Couldn't start Tensorboard")
        } else {
            window.open(url, '_blank')
        }
    }

    private onRemoveClick = async (e: Event) => {
        e.preventDefault()
        e.stopPropagation()

        if (confirm("Are you sure")) {
            await this.runUI.remove()
            clearCache()
            ROUTER.back()
        }
    }

    async renderAnalyticsBtns() {
        let templates = await this.runUI.getAnalyticsTemplates()
        for (let t of templates) {
            $(this.analyticsBtns, $ => {
                $('button', t, {
                    on: { click: this.onJupyterClick },
                    data: { template: t }
                })
            })
        }
    }

    private onJupyterClick = async (e: Event) => {
        e.preventDefault()
        e.stopPropagation()
        let target = <any>e.currentTarget
        let url = await this.runUI.launchJupyter(target.template)
        if (url === "") {
            alert("Couldn't start Jupyter")
        } else {
            window.open(url, '_blank')
        }
    }

    async renderIndicators() {
        // let indicators: Indicators = await this.runUI.getIndicators()
        let values = await this.runUI.getValues()
        renderValues(this.indicatorsView, values)
    }

    async renderConfigs() {
        let configs = await this.runUI.getConfigs()
        renderConfigs(this.configsView, configs)
    }
}

export class RunHandler {
    constructor() {

        ROUTER.route('experiment/:name/:runIndex', [this.handleRun])
    }

    handleRun = (name: string, runIndex: string) => {
        SCREEN.setView(new RunView(name, runIndex))
        console.log("test")
    }
}