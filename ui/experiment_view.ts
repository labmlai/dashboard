
import { ScreenView } from "./screen"
import { ROUTER, SCREEN } from "./app"
import { Weya as $, WeyaElement } from "./weya"
import { Experiment } from "./experiments"
import { getExperiments } from "./cache"

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