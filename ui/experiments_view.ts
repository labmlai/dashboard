/*
This is not used anymore
 */

import {ScreenView} from './screen'
import {ROUTER} from './app'
import {Weya as $, WeyaElement} from '../lib/weya/weya'
import {Experiments, Experiment, Run} from '../common/experiments'
import {getExperiments} from './cache'
import {RunUI} from './run_ui'
import {renderValues} from './indicators'

class ExperimentView {
    experiment: Experiment
    elem: WeyaElement

    constructor(e: Experiment) {
        this.experiment = e
    }

    render() {
        let run = this.experiment.lastRun

        this.elem = $(
            'div.experiment',
            {
                on: {click: this.onClick}
            },
            $ => {
                $('h3', this.experiment.name)
                if (run != null) {
                    this.renderRun(run).then();
                }
            }
        )

        return this.elem
    }

    private async renderRun(run: Run) {
        let runUI = RunUI.create(run)
        let values = await runUI.loadValues()
        // let configs = await runUI.getConfigs()

        $(this.elem, $ => {
            $('div', $ => {
                $('i.fa.fa-calendar.key_icon')
                $('span', ` ${run.info.trial_date} `)
                $('span.key_split', '')
                $('i.fa.fa-clock.key_icon')
                $('span', ` ${run.info.trial_time}`)
            })

            let indicatorsView = <HTMLDivElement>$('div.indicators.block')
            // let configsView = <HTMLDivElement>$('div.configs.block')

            renderValues(indicatorsView, values)
            // renderConfigs(configsView, configs)
        })
    }

    onClick = (e: Event) => {
        e.preventDefault()
        e.stopPropagation()

        ROUTER.navigate(`/experiment/${this.experiment.name}`)
    }
}

class ExperimentsView implements ScreenView {
    elem: HTMLElement
    experimentsList: HTMLDivElement
    experiments: Experiments

    render(): WeyaElement {
        this.elem = <HTMLElement>$('div.container', $ => {
            $('h1', 'Experiments')
            this.experimentsList = <HTMLDivElement>$('div.experiments_list', '')
        })
        this.renderExperiments().then()
        return this.elem
    }

    private async renderExperiments() {
        this.experiments = await getExperiments()

        let views: ExperimentView[] = []
        for (let e of this.experiments.sorted()) {
            views.push(new ExperimentView(e))
        }

        for (let v of views) {
            this.experimentsList.append(v.render())
        }
    }
}

export class ExperimentsHandler {
    constructor() {
        ROUTER.route('', [this.handleExperiments])
    }

    handleExperiments = () => {
        ROUTER.navigate('table', {replace: true, trigger: true})
    }
}
