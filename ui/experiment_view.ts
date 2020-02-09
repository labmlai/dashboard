import { ScreenView } from './screen'
import { ROUTER, SCREEN } from './app'
import { Weya as $, WeyaElement } from '../lib/weya/weya'
import { Experiment, Run, ScalarsModel, Configs } from './experiments'
import { getExperiments } from './cache'
import { RunUI } from './run_ui'
import { renderConfigs } from './configs'
import { renderValues } from './indicators'
import { formatSize } from './view_components/format'

class RunView {
    run: Run
    runUI: RunUI
    elem: WeyaElement
    indicatorsView: HTMLDivElement
    configsView: HTMLDivElement
    values: ScalarsModel
    configs: Configs

    constructor(run: Run) {
        this.run = run
        this.runUI = RunUI.create(this.run)
    }

    render() {
        this.elem = $(
            'div.run',
            {
                on: { click: this.onClick }
            },
            $ => {
                let info = this.run.info
                $('h3', $ => {
                    $('label', `${info.index}`)
                    if (info.comment.trim() !== '') {
                        $('span', ':')
                        $('span', info.comment)
                    }
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
            `/experiment/${this.run.experimentName}/${this.run.info.index}`
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

class ExperimentView implements ScreenView {
    elem: HTMLElement
    experiment: Experiment
    name: string
    experimentView: HTMLDivElement

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

        let runViews: RunView[] = []
        for (let t of this.experiment.runs) {
            let rv = new RunView(t)
            this.experimentView.append(rv.render())
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

export class ExperimentHandler {
    constructor() {
        ROUTER.route('experiment/:name', [this.handleExperiment])
    }

    handleExperiment = (name: string) => {
        SCREEN.setView(new ExperimentView(name))
    }
}
