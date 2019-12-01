
import { ScreenView } from "./screen"
import { ROUTER, SCREEN, PORT } from "./app"
import { Weya as $, WeyaElement } from "./weya"
import { Experiment, Run, IndicatorsModel, Indicators } from "./experiments"
import { getExperiments } from "./cache"

class RunView {
    run: Run
    elem: WeyaElement
    tensorboardBtn: HTMLButtonElement

    constructor(t: Run) {
        this.run = t
    }

    render() {
        this.elem = $('div.trial', {
            on: { click: this.onClick }
        }, $ => {
            this.tensorboardBtn = <HTMLButtonElement>$('button', 'Tensorboard', {on: {
                click: this.onTensorboardClick
            }})
            $('p', this.run.info.comment)
            $('p', this.run.info.commit)
            $('p', this.run.info.commit_message)
            $('p', this.run.info.python_file)
            $('p', this.run.info.trial_date)
            $('p', this.run.info.trial_time)
        })

        return this.elem
    }

    onTensorboardClick = (e: Event) => {
        e.preventDefault()
        e.stopPropagation()

        this.launchTensorboard()
    }

    onClick = (e: Event) => {
        e.preventDefault()
        e.stopPropagation()
    }

    private async getIndicators(): Promise<Indicators> {
        return new Promise((resolve, reject) => {
            PORT.send('getIndicators', {
                experimentName: this.run.experimentName,
                runIndex: this.run.info.index
            }, (data: IndicatorsModel, _) => {
                resolve(new Indicators(data))
            })
        })
    }

    private async launchTensorboard(): Promise<void> {
        return new Promise((resolve, reject) => {
            PORT.send('launchTensorboard', {
                experimentName: this.run.experimentName,
                runIndex: this.run.info.index
            }, (data: IndicatorsModel, _) => {
                resolve()
            })
        })
    }

    async renderIndicators() {
        let indicators: Indicators = await this.getIndicators()

        $('div.indicators', this.elem, $ => {
            for (let k in indicators.indicators) {
                $('p', `${k}: ${indicators.indicators[k].indicator_type}`)
            }
        })
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
            $('span', this.experiment.lastRunDateTime[0])
        }))

        for (let t of this.experiment.runs) {
            let rv = new RunView(t);
            this.elem.append(rv.render());
            rv.renderIndicators()
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