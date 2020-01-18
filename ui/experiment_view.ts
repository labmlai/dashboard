import { ScreenView } from "./screen"
import { ROUTER, SCREEN, PORT } from "./app"
import { Weya as $, WeyaElement } from "./weya/weya"
import { Experiment, Run, IndicatorsModel, Indicators } from "./experiments"
import { getExperiments } from "./cache"
import { KeyValue } from "./view_components/key_value"
import { RunUI } from "./run_ui"
import { renderConfigs } from "./configs"
import { renderValues } from "./indicators"

class RunView {
    run: Run
    runUI: RunUI
    elem: WeyaElement
    indicatorsView: HTMLDivElement
    configsView: HTMLDivElement

    constructor(run: Run) {
        this.run = run
        this.runUI = new RunUI(this.run)
    }

    render() {
        this.elem = $('div.run', {
            on: { click: this.onClick }
        }, $ => {
            let info = this.run.info
            $('h3', $ => {
                $('label', `${info.index}`)
                if(info.comment.trim() !== "") {
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

            this.indicatorsView = <HTMLDivElement>$('div.indicators.block')
            this.configsView = <HTMLDivElement>$('div.configs.block')
        })

        return this.elem
    }

    private onClick = (e: Event) => {
        e.preventDefault()
        e.stopPropagation()

        ROUTER.navigate(`/experiment/${this.run.experimentName}/${this.run.info.index}`)
    }

    async renderValues() {
        let values: any = await this.runUI.getValues()
        renderValues(this.indicatorsView, values)
    }

    async renderConfigs() {
        let configs = await this.runUI.getConfigs()
        renderConfigs(this.configsView, configs)
    }
}

class ExperimentView implements ScreenView {
    elem: HTMLElement
    experiment: Experiment
    name: string
    experimentView: HTMLDivElement

    constructor(name: string) {
        this.name = name
    }

    render(): WeyaElement {
        getExperiments().then((experiments) => {
            this.experiment = experiments.experiments[this.name]
            this.renderExperiment()
        })

        this.elem = <HTMLElement>$('div.container', $ => {
            this.experimentView = <HTMLDivElement>$('div.experiment_single', '')
        })
        return this.elem
    }

    private renderExperiment() {
        this.experimentView.append($('div.info', $ => {
            $('h1', this.experiment.name)
        }))

        for (let t of this.experiment.runs) {
            let rv = new RunView(t);
            this.experimentView.append(rv.render());
            rv.renderValues()
            rv.renderConfigs()
        }
    }
}

export class ExperimentHandler {
    constructor() {

        ROUTER.route('experiment/:name', [this.handleExperiment])
    }

    handleExperiment = (name: string) => {
        SCREEN.setView(new ExperimentView(name))
        console.log("test")
    }
}