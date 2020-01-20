
import { ScreenView } from "./screen"
import { ROUTER, SCREEN } from "./app"
import { Weya as $, WeyaElement } from "./weya/weya"
import { Experiments, Experiment } from "./experiments"
import { getExperiments } from "./cache"

class ExperimentView {
    experiment: Experiment
    elem: WeyaElement

    constructor(e: Experiment) {
        this.experiment = e
    }

    render() {
        let run = this.experiment.lastRun

        this.elem = $('div.experiment', {
            on: { click: this.onClick }
        }, $ => {
            $('h3', this.experiment.name)
            if (run != null) {
                $('div', $ => {
                    $('i.fa.fa-calendar.key_icon')
                    $('span', ` ${run.info.trial_date} `)
                    $('span.key_split', '')
                    $('i.fa.fa-clock.key_icon')
                    $('span', ` ${run.info.trial_time}`)
                })
            }

        })

        return this.elem
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
        this.renderExperiments()
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
        SCREEN.setView(new ExperimentsView())
        console.log("test")
    }
}