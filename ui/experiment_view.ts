import {ScreenView} from './screen'
import {ROUTER, SCREEN} from './app'
import {Weya as $, WeyaElement} from '../lib/weya/weya'
import {Experiment, Run, ScalarsModel, Configs, RunModel} from '../common/experiments'
import {getExperiments} from './cache'
import {RunUI} from './run_ui'
import {renderConfigs} from './configs'
import {renderValues} from './indicators'
import {formatSize} from './view_components/format'

class RunView {
    run: Run
    runUI: RunUI
    elem: WeyaElement
    indicatorsView: HTMLDivElement
    configsView: HTMLDivElement
    values: ScalarsModel
    configs: Configs
    private isShowExperimentName: boolean

    constructor(run: Run, isShowExperimentName: boolean) {
        this.run = run
        this.isShowExperimentName = isShowExperimentName
        this.runUI = RunUI.create(this.run)
    }

    render() {
        this.elem = $(
            'div.run',
            {
                on: {click: this.onClick}
            },
            $ => {
                let info = this.run.info
                if(this.isShowExperimentName) {
                    $('h4', this.run.experimentName)
                }

                if (info.comment.trim() !== '') {
                    $('h3', info.comment)
                }
                $('h4', $ => {
                    $('label', `${info.uuid}`)
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
                $('div', $ => {
                    $('i.fa.fa-save.key_icon')
                    let size =
                        info.sqlite_size +
                        info.analytics_size +
                        info.checkpoints_size +
                        info.tensorboard_size
                    $('span', formatSize(size))
                })

                this.indicatorsView = <HTMLDivElement>$('div.indicators.block')
                this.configsView = <HTMLDivElement>$('div.configs.block')
            }
        )

        return this.elem
    }

    private onClick = (e: Event) => {
        e.preventDefault()
        e.stopPropagation()

        ROUTER.navigate(
            `/experiment/${this.run.experimentName}/${this.run.info.uuid}`
        )
    }

    async load() {
        this.values = await this.runUI.getValues()
        this.configs = await this.runUI.getConfigs()
    }

    renderValues() {
        renderValues(this.indicatorsView, this.values)
    }

    renderConfigs(common: Set<string>) {
        renderConfigs(this.configsView, this.configs, common)
    }
}

export class RunsView {
    private readonly runs: Run[];
    private elem: HTMLDivElement;
    private isShowExperimentName: boolean

    constructor(runs: Run[], isShowExperimentName: boolean) {
        this.runs = runs
        this.isShowExperimentName = isShowExperimentName
    }

    async render(elem: HTMLDivElement) {
        this.elem = elem
        let runViews: RunView[] = []
        for (let t of this.runs) {
            let rv = new RunView(t, this.isShowExperimentName)
            this.elem.append(rv.render())
            runViews.push(rv)
        }

        if (runViews.length == 0) {
            return
        }

        await Promise.all(runViews.map(rv => rv.load()))

        let configs = {}
        let differentConfigs = new Set<string>()
        for (let k in runViews[0].configs.configs) {
            configs[k] = runViews[0].configs.configs[k].value
        }

        for (let rv of runViews) {
            for (let k in rv.configs.configs) {
                if (differentConfigs.has(k)) {
                    continue
                }
                if (configs[k] !== rv.configs.configs[k].value) {
                    differentConfigs.add(k)
                }
            }
        }

        let common = new Set<string>()
        for (let k in configs) {
            if (!differentConfigs.has(k)) {
                common.add(k)
            }
        }

        for (let rv of runViews) {
            rv.renderValues()
            rv.renderConfigs(common)
        }
    }
}

class ExperimentView implements ScreenView {
    elem: HTMLElement
    experiment: Experiment
    name: string
    experimentView: HTMLDivElement
    private runsView: RunsView

    constructor(name: string) {
        this.name = name
    }

    render(): WeyaElement {
        this.elem = <HTMLElement>$('div.container', $ => {
            this.experimentView = <HTMLDivElement>$('div.experiment_single', '')
        })
        this.renderExperiment()
        return this.elem
    }

    private async renderExperiment() {
        this.experiment = (await getExperiments()).get(this.name)

        this.experimentView.append(
            $('div.info', $ => {
                $('h1', this.experiment.name)
            })
        )

        this.runsView = new RunsView(this.experiment.runs, false)
        this.runsView.render(this.experimentView)
    }
}

export class ExperimentHandler {
    constructor() {
        ROUTER.route('experiment/:name', [this.handleExperiment])
    }

    handleExperiment = (name: string) => {
        SCREEN.setView(new ExperimentView(name))
    }
}
