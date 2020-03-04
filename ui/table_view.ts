import {ScreenView} from './screen'
import {ROUTER, SCREEN} from './app'
import {Weya as $, WeyaElement, WeyaElementFunction} from '../lib/weya/weya'
import {Config, Experiments} from '../common/experiments'
import {getExperiments} from './cache'
import {formatInt, formatScalar, formatSize, formatValue} from "./view_components/format";
import {RunUI} from "./run_ui";
import {
    Cell,
    CommentCell, ConfigComputedCell, ConfigOptionCell,
    DateTimeCell,
    ExperimentNameCell,
    InfoCell,
    SizeCell, StepCell, ValueCell
} from "./cells/cell";

class RunView {
    elem: WeyaElement
    run: RunUI

    constructor(r: RunUI) {
        this.run = r
    }

    render(format: Cell[]) {
        this.elem = $(
            'tr',
            {on: {click: this.onClick}},
            $ => {
                for (let cell of format) {
                    cell.renderCell($, this.run)
                }
            }
        )

        return this.elem
    }

    onClick = (e: Event) => {
        e.preventDefault()
        e.stopPropagation()

        ROUTER.navigate(`/experiment/${this.run.run.experimentName}/${this.run.run.info.uuid}`)
    }
}

class RunsView implements ScreenView {
    elem: HTMLElement
    runsTable: HTMLTableElement
    runs: RunUI[]
    format: Cell[]

    render(): WeyaElement {
        this.elem = <HTMLElement>$('div.full_container', $ => {
            $('h1', 'Runs')

            $('div.runs_container', $ => {
                this.runsTable = <HTMLTableElement>$('table.runs')
            })
        })
        this.renderExperiments().then()
        return this.elem
    }

    private static getRuns(experiments: Experiments) {
        let runUIs = []
        for (let e of experiments.sorted()) {
            for (let r of e.runs) {
                runUIs.push(RunUI.create(r))
            }
        }

        return runUIs
    }

    private getFormat(): Cell[] {
        let format: Cell[] = [
            new ExperimentNameCell(),
            new CommentCell(),
            new DateTimeCell(),
            new InfoCell('commit_message', "Commit Message"),
            new InfoCell('is_dirty', 'Dirty'),
            new InfoCell('python_file', 'Python File'),
            new InfoCell('tags', 'Tags'),
            new SizeCell(),
            new InfoCell('checkpoints_size', 'Checkpoints', formatSize),
            new InfoCell('sqlite_size', 'SQLite', formatSize),
            new InfoCell('analytics_size', 'Analytics', formatSize),
            new InfoCell('tensorboard_size', 'Tensorboard', formatSize)
        ]

        format.push(new StepCell())

        let indicators = new Set<string>()
        for (let r of this.runs) {
            for (let k in r.values) {
                indicators.add(k)
            }
        }

        for (let k of indicators.keys()) {
            format.push(new ValueCell(k))
        }

        let configs = new Set<string>()
        for (let r of this.runs) {
            for (let k in r.configs.configs) {
                configs.add(k)
            }
        }

        for (let k of configs.keys()) {
            format.push(new ConfigComputedCell(k))
            format.push(new ConfigOptionCell(k))
        }

        return format
    }

    private async renderExperiments() {
        this.runs = RunsView.getRuns(await getExperiments())
        let promises = []
        for (let r of this.runs) {
            promises.push(r.loadConfigs())
            promises.push(r.loadValues())
        }

        await Promise.all(promises)

        this.format = this.getFormat()

        let views: RunView[] = []
        for (let r of this.runs) {
            views.push(new RunView(r))
        }

        $('tr', this.runsTable, $ => {
            for (let c of this.format) {
                c.renderHeader($)
            }
        })
        for (let v of views) {
            this.runsTable.append(v.render(this.format))
        }
    }
}

export class TableHandler {
    constructor() {
        ROUTER.route('table', [this.handleTable])
    }

    handleTable = () => {
        SCREEN.setView(new RunsView())
    }
}
