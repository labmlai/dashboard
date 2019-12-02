
import { ScreenView } from "./screen"
import { ROUTER, SCREEN, PORT } from "./app"
import { Weya as $, WeyaElement } from "./weya"
import { Experiment, Run, IndicatorsModel, Indicators } from "./experiments"
import { getExperiments } from "./cache"
import { KeyValue } from "./view_components/key_value"

class RunView {
    run: Run
    elem: WeyaElement
    tensorboardBtn: HTMLButtonElement
    indicatorsView: HTMLDivElement

    constructor(t: Run) {
        this.run = t
    }

    render() {
        this.elem = $('div.run.up', {
            on: { click: this.onClick }
        }, $ => {
            let info = this.run.info
            new KeyValue('.secondary').render($, 'Index', info.index)
            new KeyValue().render($, 'Comment', info.comment)
            if(info.is_dirty) {
                new KeyValue('.mono.secondary').render($, 'Commit', info.commit)
            } else {
                new KeyValue('.mono.secondary').render($, 'Commit', `${info.commit}*`)
            }
            new KeyValue().render($, 'Commit Message', info.commit_message)
            new KeyValue('.mono.secondary').render($, 'Python File', info.python_file)
            new KeyValue().render($, 'Run Date', info.trial_date)
            new KeyValue().render($, 'Run Time', info.trial_time)

            this.indicatorsView = <HTMLDivElement>$('div.indicators')
            this.tensorboardBtn = <HTMLButtonElement>$('button', 'Launch Tensorboard', {
                on: {
                    click: this.onTensorboardClick
                }
            })
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

    private async getValues(): Promise<any> {
        return new Promise((resolve, reject) => {
            PORT.send('getValues', {
                experimentName: this.run.experimentName,
                runIndex: this.run.info.index
            }, (data: any, _) => {
                resolve(data)
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
        let values: any = await this.getValues()

        $(this.indicatorsView, $ => {
            for(let k in values) {
                new KeyValue('.highlight').render($, k, `${values[k]}`)
            }
            for (let k in indicators.indicators) {
                // $('p', `${k}: ${indicators.indicators[k].indicator_type}`)
            }
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