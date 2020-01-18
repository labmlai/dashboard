
import { ROUTER, SCREEN } from "./app"
import { Weya as $, WeyaElement } from "./weya/weya"
import { Run } from "./experiments"
import { getExperiments } from "./cache"
import { RunUI } from "./run_ui"
import { renderConfigs } from "./configs"
import { renderValues } from "./indicators"
import { InfoList, InfoItem } from "./view_components/info_list"

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

    constructor(experimentName: string, runIndex: string) {
        this.experimentName = experimentName
        this.runIndex = runIndex
    }

    render() {
        getExperiments().then((experiments) => {
            let experiment = experiments.experiments[this.experimentName]
            this.run = experiment.getRun(this.runIndex)
            this.runUI = new RunUI(this.run)
            this.renderRun()
            this.renderIndicators()
            this.renderConfigs()
        })

        this.elem = <HTMLElement>$('div.container', $ => {
            this.runView = <HTMLDivElement>$('div.run_single', '')
        })
        return this.elem
    }

    renderRun() {
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
            $('div', $ => {
                $('i.fa.fa-history.key_icon')
                $('span', ` ${info.commit_message}`)
            })
            $('div', $ => {
                $('i.fa.fa-calendar.key_icon')
                $('span', ` ${info.trial_date} `)
                $('span.key_split', '')
                $('i.fa.fa-clock.key_icon')
                $('span', ` ${info.trial_time}`)
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

            this.indicatorsView = <HTMLDivElement>$('div.indicators.block')

            this.configsView = <HTMLDivElement>$('div.configs.block')

            this.tensorboardBtn = <HTMLButtonElement>$('button', 'Launch Tensorboard', {
                on: {
                    click: this.onTensorboardClick
                }
            })
        })


        return this.elem
    }

    private onTensorboardClick = (e: Event) => {
        e.preventDefault()
        e.stopPropagation()

        this.runUI.launchTensorboard().then(() => {
            window.open('http://localhost:6006', '_blank')
        })
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