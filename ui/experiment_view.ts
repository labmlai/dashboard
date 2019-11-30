
import { ScreenView } from "./screen"
import { ROUTER, SCREEN } from "./app"
import { Weya as $, WeyaElement } from "./weya"
import { Experiment, Trial } from "./experiments"
import { getExperiments } from "./cache"

class TrialView {
    trial: Trial
    elem: WeyaElement

    constructor(t: Trial) {
        this.trial = t
    }

    render() {
        this.elem = $('div.trial', {
            on: {click: this.onClick}
        }, $ => {
            $('p', this.trial.info.comment)
            $('p', this.trial.info.commit)
            $('p', this.trial.info.commit_message)
            $('p', this.trial.info.python_file)
            $('p', this.trial.info.trial_date)
            $('p', this.trial.info.trial_time)
        })

        return this.elem
    }

    onClick = (e: Event) => {
        e.preventDefault()
        e.stopPropagation()
    }

}

class ExperimentView implements ScreenView {
    elem: HTMLElement
    experiment: Experiment
    name: string

    constructor(name: string) {
        this.name = name
    }

    render(): WeyaElement {
        getExperiments().then((experiments) => {
            this.experiment = experiments.experiments[this.name]
            this.renderExperiment()
        })
        
        this.elem = <HTMLElement>$('div.experiment', '')
        return this.elem
    }

    private renderExperiment() {
        this.elem.append($('div.content', $ => {
            $('h1', this.experiment.name)
            $('span', this.experiment.lastTrialDateTime[0])
        }))

        for(let t of this.experiment.trials) {
            this.elem.append(new TrialView(t).render())
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