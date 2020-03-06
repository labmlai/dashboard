import {ScreenView} from './screen'
import {ROUTER, SCREEN} from './app'
import {Weya as $, WeyaElement} from '../lib/weya/weya'
import {Experiments, RunIdentifier} from '../common/experiments'
import {clearCache, getExperiments} from './cache'
import {RunUI} from "./run_ui";
import {Cell, CellFactory} from "./cells/cell";
import {CodeMirror} from "./codemirror";
import {jsyaml} from "./jsyaml";
import {API} from "../common/api";
import {CellOptions} from "../common/cell";

class RunView {
    elem: WeyaElement
    run: RunUI
    private controls: HTMLElement;
    private selectIcon: HTMLElement;
    private isSelected: boolean;
    private selectListeners: SelectListeners;

    constructor(r: RunUI, selectListeners: SelectListeners) {
        this.run = r
        this.selectListeners = selectListeners;
        this.isSelected = false
    }

    render(format: Cell[]) {
        this.elem = $('div.row', $ => {
                for (let cell of format) {
                    if (cell.type === 'controls') {
                        this.controls = cell.renderCell($, this.run)
                    } else {
                        cell.renderCell($, this.run)
                    }
                }
            }
        )

        this.controls.innerHTML = ''
        $('span', this.controls, $ => {
            this.selectIcon = <HTMLElement>$('i.fa.fa-square', {on: {click: this.onSelect}})
        })

        return this.elem
    }

    onSelect = (e: Event) => {
        e.preventDefault()
        e.stopPropagation()

        this.isSelected = !this.isSelected

        this.selectIcon.classList.remove('fa-square')
        this.selectIcon.classList.remove('fa-check-square')
        if (this.isSelected) {
            this.selectListeners.onSelect(this.run)
            this.selectIcon.classList.add('fa-check-square')
        } else {
            this.selectListeners.onUnSelect(this.run)
            this.selectIcon.classList.add('fa-square')
        }
    }

    onOpen = (e: Event) => {
        e.preventDefault()
        e.stopPropagation()

        ROUTER.navigate(`/experiment/${this.run.run.experimentName}/${this.run.run.info.uuid}`)
    }

}

class Format {
    dashboard: string
    cells: CellOptions[]

    constructor(dashboard: string) {
        this.dashboard = dashboard
        this.cells = []
    }

    private hashCell(cell: CellOptions): string {
        return `${cell.type}-${cell.key}`
    }

    defaults(cells: CellOptions[]) {
        let has = new Set<string>()
        for (let c of this.cells) {
            has.add(this.hashCell(c))
        }

        for (let c of cells) {
            if (!has.has(this.hashCell(c))) {
                this.cells.push(c)
            }
        }
    }

    update(yaml: string) {
        let data = jsyaml.load(yaml)
        this.dashboard = data.dashboard
        this.cells = data.cells
    }

    createCells(): Cell[] {
        let res: Cell[] = []
        for (let opt of this.cells) {
            res.push(CellFactory.create(opt))
        }

        return res
    }

    toYAML() {
        return jsyaml.dump({dashboard: this.dashboard, cells: this.cells})
    }

    async save() {
        await API.saveDashboard(this.dashboard, this.cells)
    }

    async load() {
        let dashboards = await API.loadDashboards()
        console.log(dashboards, this.dashboard)
        if (dashboards[this.dashboard] != null) {
            this.cells = dashboards[this.dashboard]
        }
    }
}

interface SelectListeners {
    onSelect(run: RunUI)

    onUnSelect(run: RunUI)
}


interface SyncListeners {
    onSync(dashboard: string)

    onReload()
}

class ControlsView implements SelectListeners {
    private elem: HTMLElement
    private codemirror: any
    private format: Format
    private syncListeners: SyncListeners
    private codemirrorDiv: HTMLElement
    private selectedCountElem: HTMLElement
    private readonly selectedRuns: { [hash: string]: RunUI }
    private tensorboardBtn: HTMLButtonElement

    constructor(format: Format, syncListeners: SyncListeners) {
        this.format = format
        this.syncListeners = syncListeners
        this.selectedRuns = {}
    }

    private updateSelectedRunsCount() {
        let count = 0
        for (let r in this.selectedRuns) {
            count++
        }

        this.selectedCountElem.textContent = `${count} runs selected`
    }

    onSelect(run: RunUI) {
        this.selectedRuns[run.run.hash()] = run
        this.updateSelectedRunsCount()
    }

    onUnSelect(run: RunUI) {
        delete this.selectedRuns[run.run.hash()]
        this.updateSelectedRunsCount()
    }

    render(): HTMLElement {
        this.elem = <HTMLElement>$('div', $ => {
            $('div.editor_controls', $ => {
                $('i.fa.fa-edit', {on: {click: this.onEdit}})
                $('i.fa.fa-sync', {on: {click: this.onSync}})
                $('i.fa.fa-save', {on: {click: this.onSave}})
            })
            this.codemirrorDiv = <HTMLElement>$('div')
            this.selectedCountElem = <HTMLElement>$('div.test')

            this.tensorboardBtn = <HTMLButtonElement>(
                $('button.small',
                    {on: {click: this.onTensorboard}},
                    $ => {
                        $('i.fa.fa-chart-bar')
                        $('span', ' Launch Tensorboard')
                    })
            )

            $('button.small.danger',
                {on: {click: this.onRemove}},
                $ => {
                    $('i.fa.fa-trash')
                    $('span', ' Remove')
                }
            )

            $('button.small.danger',
                {on: {click: this.onCleanupCheckpoints}},
                $ => {
                    $('i.fa.fa-trash')
                    $('span', ' Cleanup Checkpoints')
                }
            )

        })

        this.codemirror = CodeMirror(this.codemirrorDiv, {
                mode: "yaml",
                theme: "darcula"
            }
        )

        this.codemirrorDiv.style.display = 'none'

        return this.elem
    }

    updateFormat() {
        this.codemirror.setValue(this.format.toYAML())
    }

    onTensorboard = async () => {
        let runs: RunIdentifier[] = []
        for (let r in this.selectedRuns) {
            let run = this.selectedRuns[r].run
            runs.push({experimentName: run.experimentName, runUuid: run.info.uuid})
        }

        let url = await API.launchTensorboards(runs)
        if (url === '') {
            alert("Couldn't start Tensorboard")
        } else {
            window.open(url, '_blank')
        }
    }

    onRemove = async (e: Event) => {
        if (confirm('Are you sure')) {
            for (let r in this.selectedRuns) {
                let run = this.selectedRuns[r]
                await run.remove()
            }
            clearCache()
            this.syncListeners.onReload()
        }
    }

    onCleanupCheckpoints = async (e: Event) => {
        for (let r in this.selectedRuns) {
            let run = this.selectedRuns[r]
            await run.cleanupCheckpoints()
        }
        clearCache()
        this.syncListeners.onReload()
    }

    onSync = (e: Event) => {
        e.preventDefault()
        e.stopPropagation()

        console.log("Sync")
        this.format.update(this.codemirror.getValue())
        this.syncListeners.onSync(this.format.dashboard)
    }

    onEdit = (e: Event) => {
        e.preventDefault()
        e.stopPropagation()

        if (this.codemirrorDiv.style.display === 'none') {
            this.codemirrorDiv.style.display = null
            this.codemirror.setValue(this.format.toYAML())
            this.codemirror.focus()
        } else {
            this.codemirrorDiv.style.display = 'none'
        }
    }

    onSave = (e: Event) => {
        e.preventDefault()
        e.stopPropagation()

        console.log("Sync")
        this.format.update(this.codemirror.getValue())
        this.syncListeners.onSync(this.format.dashboard)
        this.format.save().then()
    }
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

    private renderTable() {
        this.runsTable.innerHTML = ''
        let views: RunView[] = []
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
