import { ScreenView } from "./screen"
import { ROUTER, SCREEN, PORT } from "./app"
import { Weya as $, WeyaElement } from "./weya"
import { Experiment, Run, IndicatorsModel, Indicators } from "./experiments"
import { getExperiments } from "./cache"
import { KeyValue } from "./view_components/key_value"
import { RunUI } from "./run_ui"

class RunView {
    run: Run
    runUI: RunUI
    elem: WeyaElement
    indicatorsView: HTMLDivElement

    constructor(run: Run) {
        this.run = run
        this.runUI = new RunUI(this.run)
    }

    render() {
        this.elem = $('div.run.up', {
            on: { click: this.onClick }
        }, $ => {
            let info = this.run.info
            $('h3', $ => {
                $('label', `${info.index}: `)
                $('span', info.comment)
            })
            $('div.small', $ => {
                $('i.fa.fa-history')
                $('span', ` ${info.commit_message}`)
            })
            $('div.small', $ => {
                $('i.fa.fa-calendar')
                $('span', ` ${info.trial_date} `)
                $('i.fa.fa-clock')
                $('span', ` ${info.trial_time}`)
            })

            this.indicatorsView = <HTMLDivElement>$('div.indicators')
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

        $(this.indicatorsView, $ => {
            let maxStep = 0
            for(let k in values) {
                new KeyValue('.highlight').render($, k, `${values[k].value}`)
                maxStep = Math.max(values[k].step, maxStep)
            }
            new KeyValue('.highlight').render($, 'step', `${maxStep}`)
        })
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