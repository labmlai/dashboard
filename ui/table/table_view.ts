import {ScreenView} from '../screen'
import {ROUTER, SCREEN} from '../app'
import {Weya as $, WeyaElement} from '../../lib/weya/weya'
import {Experiments} from '../../common/experiments'
import {getExperiments} from '../cache'
import {RunUI} from "../run_ui";
import {Cell} from "./cell";
import {CellOptions} from "../../common/cell";
import {Format} from "./format";
import {ControlsView} from "./controls";
import {RunView} from "./run_row";


export interface SelectListeners {
    onSelect(run: RunUI)

    onUnSelect(run: RunUI)
}


export interface SyncListeners {
    onSync(dashboard: string)

    onReload()

    onChanging()
}


class RunsView implements ScreenView, SyncListeners {
    elem: HTMLElement
    runsTable: HTMLElement
    runs: RunUI[]
    format: Format
    cells: Cell[]
    private controls: ControlsView;

    constructor(dashboard: string) {
        this.format = new Format(dashboard)
    }

    render(): WeyaElement {
        this.elem = <HTMLElement>$('div.full_container', $ => {
            let controls = <HTMLElement>$('div.controls')
            this.controls = new ControlsView(this.format, this)
            controls.appendChild(this.controls.render())
            this.runsTable = <HTMLElement>$('div.table')
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

    private getFormat(): CellOptions[] {
        let format: CellOptions[] = [
            {type: 'controls', name: '', 'key': ''},
            {type: 'experiment_name', name: 'Experiment', 'key': ''},
            {type: 'comment', name: 'Comment', 'key': ''},
            {type: 'date_time', name: 'Date Time', 'key': ''},
            {type: 'info', name: 'Commit Message', 'key': 'commit_message'},
            {type: 'info', name: 'Dirty', 'key': 'is_dirty'},
            {type: 'info', name: 'Tags', 'key': 'tags'},
            {type: 'size', name: 'Size', 'key': ''},
            {type: 'size', name: 'Checkpoints', 'key': 'checkpoints_size'},
            {type: 'size', name: 'SQLite', 'key': 'sqlite_size'},
            {type: 'size', name: 'Analytics', 'key': 'analytics_size'},
            {type: 'size', name: 'Tensorboard', 'key': 'tensorboard_size'},
        ]

        format.push({type: 'step', name: 'Step', 'key': ''})

        let indicators = new Set<string>()
        for (let r of this.runs) {
            for (let k in r.values) {
                indicators.add(k)
            }
        }

        for (let k of indicators.keys()) {
            format.push({type: 'value', name: k, 'key': k})
        }

        let configs = new Set<string>()
        for (let r of this.runs) {
            for (let k in r.configs.configs) {
                configs.add(k)
            }
        }

        for (let k of configs.keys()) {
            format.push({type: 'config_computed', name: k, 'key': k})
            format.push({type: 'config_options', name: `${k} Options`, 'key': k})
        }

        return format
    }

    private async renderExperiments() {
        await this.format.load()

        this.runs = RunsView.getRuns(await getExperiments())
        let promises = []
        for (let r of this.runs) {
            promises.push(r.loadConfigs())
            promises.push(r.loadValues())
        }

        await Promise.all(promises)

        this.format.defaults(this.getFormat())
        this.controls.updateFormat()
        this.cells = this.format.createCells()

        this.renderTable()
    }

    private sortRuns() {
        this.runs.sort((a, b) => {
            let minRank = 1e6
            let direction = 0

            for (let c of this.cells) {
                let s = c.compare(a, b)
                if (s === 0) {
                    continue
                }

                let r = Math.abs(s)
                if (s < minRank) {
                    minRank = s
                    direction = s / r
                }
            }

            return direction
        })
    }

    private renderTable() {
        this.runsTable.innerHTML = ''
        let views: RunView[] = []
        this.sortRuns()
        for (let c of this.cells) {
            c.update(this.runs)
        }
        for (let r of this.runs) {
            views.push(new RunView(r, this.controls))
        }

        $('div.header', this.runsTable, $ => {
            for (let c of this.cells) {
                c.renderHeader($)
            }
        })
        for (let v of views) {
            this.runsTable.append(v.render(this.cells))
        }
    }

    onSync(dashboard: string) {
        ROUTER.navigate(`table/${dashboard}`, {trigger: false})
        this.cells = this.format.createCells()

        this.renderTable()
    }

    async onReload() {
        this.runs = RunsView.getRuns(await getExperiments())
        let promises = []
        for (let r of this.runs) {
            promises.push(r.loadConfigs())
            promises.push(r.loadValues())
        }

        await Promise.all(promises)
        this.cells = this.format.createCells()

        this.renderTable()
    }

    onChanging() {
        this.runsTable.innerHTML = ''
    }
}

export class TableHandler {
    constructor() {
        ROUTER.route('table', [this.handleTable])
        ROUTER.route('table/:dashboard', [this.handleTable])
    }

    handleTable = (dashboard: string = "default") => {
        SCREEN.setView(new RunsView(dashboard))
    }
}
