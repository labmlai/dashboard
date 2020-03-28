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
import {RunRowView} from "./run_row";
import {RunsTree} from "./tree";


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


class RunsView implements ScreenView, SyncListeners {
    elem: HTMLElement
    runsTable: HTMLElement
    runs: RunUI[]
    format: Format
    cells: Cell[]
    private controls: ControlsView;
    private filterTerms: string[]
    private controlsCell: HTMLElement;
    private selectAllIcon: HTMLElement;
    private isAllSelected: boolean = false
    private runRows: RunRowView[];
    private headerCells: HTMLElement[];

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

    render(): WeyaElement {
        this.elem = <HTMLElement>$('div.full_container', $ => {
            let controls = <HTMLElement>$('div.controls')
            this.controls = new ControlsView(this.format, this)
            controls.appendChild(this.controls.render())
            this.runsTable = <HTMLElement>$('div.table')
        })

        this.controls.setSearch(this.filterTerms.join(' '))
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
            {type: 'generations', name: '', 'key': ''},
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
        let start = new Date().getTime()
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

        console.log('Get Experiments', new Date().getTime() - start)
        this.renderTable()
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
            c.update(runs)
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
        $('div.header', this.runsTable, $ => {
            for (let c of this.cells) {
                let rendered = c.renderHeader($)
                this.headerCells.push(rendered)
                if (c.type === 'controls') {
                    this.controlsCell = rendered
                }
            }
        })

        this.renderControlsCell()

        console.log("Render Header", new Date().getTime() - start)

        start = new Date().getTime()
        for(let j = 0; j < this.runRows.length; ) {
            j = await this.renderRows(j, 5)
        }
        console.log("Render Rows", new Date().getTime() - start)

        start = new Date().getTime()
        this.adjustCellWidths()
        console.log("Adjust widths", new Date().getTime() - start)
    }

    private async renderRows(offset: number, count: number): Promise<number> {
        let to = Math.min(offset + count, this.runRows.length)

        for (let i = offset; i < to; ++i) {
            let v = this.runRows[i]
            this.runsTable.append(v.render(this.cells))
        }

        return new Promise<number>((resolve => {
            window.requestAnimationFrame(() => {
                resolve(to)
            })
        }))
    }

    private getCellWidth(elem: HTMLElement) {
        let children = elem.children
        let width = 0
        for (let x of children) {
            width += (<HTMLElement>x).offsetWidth
        }

        return width
    }

    private async adjustCellWidth(i: number): Promise<void> {
        let header = this.headerCells[i]
        if (header == null) {
            return
        }

        let defaultWidth = header.offsetWidth
        let maxWidth = this.getCellWidth(header)
        if (defaultWidth <= maxWidth) {
        }

        if (this.cells[i].specifiedWidth != null) {
            return
        }

        for (let r of this.runRows) {
            let c = r.cells[i]
            if (c == null) {
                continue
            }
            maxWidth = Math.max(this.getCellWidth(c), maxWidth)
            if (defaultWidth <= maxWidth) {
                return
            }
        }

        header.style.width = `${maxWidth}px`
        for (let r of this.runRows) {
            let c = r.cells[i]
            if (c == null) {
                continue
            }
            c.style.width = `${maxWidth}px`
        }

        return new Promise<void>((resolve, reject) => {
            window.requestAnimationFrame(() => {
                resolve()
            })
        })
    }

    private async adjustCellWidths() {
        let start = new Date().getTime()
        for (let i = 0; i < this.cells.length; ++i) {
            await this.adjustCellWidth(i)
        }
        console.log((new Date().getTime()) - start)
    }

    setFilter(filterTerms: string[]) {
        const isReplaceUrl = this.filterTerms.length === filterTerms.length
        this.filterTerms = filterTerms
        ROUTER.navigate(`table/${this.format.dashboard}/${this.filterTerms.join(' ')}`,
            {trigger: false, replace: isReplaceUrl})
        this.renderTable()
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
        ROUTER.route('table', [this.handleTableDefault])
        ROUTER.route('table/:dashboard', [this.handleTable])
        ROUTER.route('table/:dashboard/:search', [this.handleTable])
    }

    handleTableDefault = () => {
        ROUTER.navigate('table/default', {trigger: true, replace: true})
    }

    handleTable = (dashboard: string, search: string = '') => {
        SCREEN.setView(new RunsView(dashboard, search))
    }
}
