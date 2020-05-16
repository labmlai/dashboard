import {ScreenView} from '../screen'
import {ROUTER, SCREEN} from '../app'
import {Weya as $, WeyaElement} from '../../lib/weya/weya'
import {getRuns} from '../cache'
import {RunUI} from "../run_ui";
import {Cell} from "./cell";
import {CellOptions} from "../../common/cell";
import {Format} from "./format";
import {ControlsView} from "./controls";
import {RunRowView} from "./run_row";
import {RunsTree} from "./tree";
import {RunsRenderer} from "./renderer";
import {FormatUpdateListener, HeaderControls} from "./header_controls";
import {RunCollection} from "../../common/experiments";


export interface SelectListeners {
    onSelect(run: RunUI)

    onUnSelect(run: RunUI)
}


export interface SyncListeners {
    onSync(dashboard: string)

    onReload()

    onChanging()

    setFilter(filterTerms: string[])
}


class RunsView implements ScreenView, SyncListeners, FormatUpdateListener {
    private elem: HTMLElement
    private runsTable: HTMLElement
    private runs: RunUI[]
    private readonly format: Format
    cells: Cell[]
    private controls: ControlsView;
    private filterTerms: string[]
    private controlsCell: HTMLElement;
    private selectAllIcon: HTMLElement;
    private isAllSelected: boolean = false
    private runRows: RunRowView[];
    private headerCells: HTMLElement[];
    private renderer: RunsRenderer;
    private headerControls: HeaderControls;
    private tableContainer: HTMLElement;

    constructor(dashboard: string, search: string) {
        this.format = new Format(dashboard)
        this.filterTerms = []
        for (let t of search.split(' ')) {
            t = t.trim()
            if (t !== '') {
                this.filterTerms.push(t)
            }
        }
    }

    private static getRuns(runs: RunCollection) {
        let runUIs = []
        for (let r of runs.runs) {
            runUIs.push(RunUI.create(r))
        }

        return runUIs
    }

    render(): WeyaElement {
        this.elem = <HTMLElement>$('div.full_container', $ => {
            let controls = <HTMLElement>$('div.controls')
            this.controls = new ControlsView(this.format, this)
            controls.appendChild(this.controls.render())
            this.tableContainer = <HTMLElement>$('div.table_container', $ => {
                this.runsTable = <HTMLElement>$('div.table')
            })
        })

        this.headerControls = new HeaderControls(this.tableContainer, this.format, this)

        this.controls.setSearch(this.filterTerms.join(' '))
        this.renderExperiments().then()
        return this.elem
    }

    onSelectAll = (e: Event) => {
        e.preventDefault()
        e.stopPropagation()

        this.isAllSelected = !this.isAllSelected

        this.selectAllIcon.classList.remove('fa-square')
        this.selectAllIcon.classList.remove('fa-check-square')
        if (this.isAllSelected) {
            for (let r of this.runRows) {
                r.setSelection(true)
            }
            this.selectAllIcon.classList.add('fa-check-square')
        } else {
            for (let r of this.runRows) {
                r.setSelection(false)
            }
            this.selectAllIcon.classList.add('fa-square')
        }
    }

    setFilter(filterTerms: string[]) {
        const isReplaceUrl = this.filterTerms.length === filterTerms.length
        this.filterTerms = filterTerms
        ROUTER.navigate(`table/${this.format.dashboard}/${this.filterTerms.join(' ')}`,
            {trigger: false, replace: isReplaceUrl})
        this.renderTable().then()
    }

    onSync(dashboard: string) {
        ROUTER.navigate(`table/${dashboard}`, {trigger: false})
        this.cells = this.format.createCells()

        this.renderTable().then()
    }

    async onReload() {
        this.runs = RunsView.getRuns(await getRuns())
        let promises = []
        for (let r of this.runs) {
            promises.push(r.loadConfigs())
            promises.push(r.loadValues())
        }

        await Promise.all(promises)

        this.cells = this.format.createCells()

        this.renderTable().then()
    }

    onChanging() {
        this.runsTable.innerHTML = ''
    }

    private getFormat(): CellOptions[] {
        let format: CellOptions[] = [
            {type: 'controls', name: '', 'key': ''},
            {type: 'generations', name: '', 'key': ''},
            {type: 'experiment_name', name: 'Experiment', 'key': ''},
            {type: 'comment', name: 'Comment', 'key': ''},
            {type: 'date_time', name: 'Date Time', 'key': ''},
            {type: 'info', name: 'Commit Message', 'key': 'commit_message'},
            {type: 'info', name: 'Dirty', 'key': 'is_dirty', visible: false},
            {type: 'info', name: 'Tags', 'key': 'tags'},
            {type: 'size', name: 'Size', 'key': ''},
            {type: 'size', name: 'Checkpoints', 'key': 'checkpoints_size', visible: false},
            {type: 'size', name: 'SQLite', 'key': 'sqlite_size', visible: false},
            {type: 'size', name: 'Analytics', 'key': 'analytics_size', visible: false},
            {type: 'size', name: 'Tensorboard', 'key': 'tensorboard_size', visible: false},
        ]

        format.push({type: 'step', name: 'Step', 'key': ''})

        let indicators = new Set<string>()
        for (let r of this.runs) {
            for (let k of Object.keys(r.values)) {
                indicators.add(k)
            }
        }

        for (let k of indicators.keys()) {
            format.push({type: 'value', name: k, 'key': k})
        }

        let configs = new Set<string>()
        for (let r of this.runs) {
            for (let k of Object.keys(r.configs.configs)) {
                configs.add(k)
            }
        }

        for (let k of configs.keys()) {
            format.push({type: 'config_calculated', name: k, 'key': k})
            // format.push({type: 'config_computed', name: k, 'key': k})
            // format.push({type: 'config_options', name: `${k} Options`, 'key': k})
        }

        return format
    }

    private async renderExperiments() {
        let start = new Date().getTime()
        await this.format.load()

        this.runs = RunsView.getRuns(await getRuns())
        let promises = []
        for (let r of this.runs) {
            promises.push(r.loadConfigs())
            promises.push(r.loadValues())
        }

        await Promise.all(promises)

        this.format.defaults(this.getFormat())
        this.controls.updateFormat()
        this.cells = this.format.createCells()

        console.log('Get Experiments', new Date().getTime() - start)
        this.renderTable().then()
    }

    private sortRuns(runs: RunUI[]) {
        runs.sort((a, b) => {
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

    private isFiltered(run: RunUI): boolean {
        for (let t of this.filterTerms) {
            let matched = false
            for (let c of this.cells) {
                if (c.isFiltered(run, t)) {
                    matched = true
                    break
                }
            }

            if (!matched) {
                return false
            }
        }
        return true
    }

    private filterRuns(runs: RunUI[]) {
        let filtered: RunUI[] = []
        for (let r of runs) {
            if (this.isFiltered(r)) {
                filtered.push(r)
            }
        }

        return filtered
    }

    private addParentRuns(runs: RunUI[]) {
        let tree = new RunsTree(this.runs, runs)
        return tree.getList()
    }

    private renderControlsCell() {
        $('span', this.controlsCell, $ => {
            this.selectAllIcon = <HTMLElement>$('i.fa.fa-square', {on: {click: this.onSelectAll}})
        })
    }

    private async renderTable(): Promise<void> {
        let start = new Date().getTime()
        this.runsTable.innerHTML = ''
        this.runRows = []
        console.log("Render table")
        let runs = this.filterRuns(this.runs)
        console.log("Filter", new Date().getTime() - start)
        start = new Date().getTime()
        this.sortRuns(runs)
        console.log("Sort", new Date().getTime() - start)
        start = new Date().getTime()
        runs = this.addParentRuns(runs)
        console.log("Add parent", new Date().getTime() - start)
        start = new Date().getTime()
        for (let c of this.cells) {
            c.updateCellState(runs)
        }
        console.log("Update cells", new Date().getTime() - start)
        start = new Date().getTime()
        for (let i = 0; i < runs.length; ++i) {
            let r = runs[i]
            this.runRows.push(new RunRowView(r, i, this.controls))
        }

        console.log("Create Views", new Date().getTime() - start)
        start = new Date().getTime()
        this.headerCells = []
        this.headerControls.reset()
        $('div.header', this.runsTable, $ => {
            for (let c of this.cells) {
                let rendered = c.renderHeader($)
                this.headerControls.addCell(c, rendered)
                this.headerCells.push(rendered)
                if (c.type === 'controls') {
                    this.controlsCell = rendered
                }
            }
        })

        this.renderControlsCell()
        console.log("Render Header", new Date().getTime() - start)

        if (this.renderer != null) {
            this.renderer.cancel()
        }
        this.renderer = new RunsRenderer(this.runsTable, this.runRows, this.headerCells, this.cells)
        await this.renderer.render()
    }

    async onFormatUpdated() {
        this.cells = this.format.createCells()

        await this.renderTable()
    }

}

export class TableHandler {
    constructor() {
        ROUTER.route('', [this.handleRoot])
        ROUTER.route('table', [this.handleTableDefault])
        ROUTER.route('table/:dashboard', [this.handleTable])
        ROUTER.route('table/:dashboard/', [this.handleTable])
        ROUTER.route('table/:dashboard/:search', [this.handleTable])
    }

    handleTableDefault = () => {
        ROUTER.navigate('table/default', {trigger: true, replace: true})
    }

    handleTable = (dashboard: string, search: string = '') => {
        SCREEN.setView(new RunsView(dashboard, search))
    }
    handleRoot = () => {
        ROUTER.navigate('table', {replace: true, trigger: true})
    }
}
