import {ScreenView} from './screen'
import {ROUTER, SCREEN} from './app'
import {Weya as $, WeyaElement} from '../lib/weya/weya'
import {Experiments} from '../common/experiments'
import {getExperiments} from './cache'
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

    constructor(r: RunUI) {
        this.run = r
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
            this.selectIcon.classList.add('fa-check-square')
        } else {
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

    defaults(cells: CellOptions[]) {
        this.cells = cells
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
}

interface ControlsListeners {
    onSelect(run: RunUI)

    onUnSelect(run: RunUI)
}


interface SyncListeners {
    onSync(dashboard: string)
}

class ControlsView implements ControlsListeners {
    private elem: HTMLElement
    private codemirror: any
    private format: Format
    private syncListeners: SyncListeners;

    constructor(format: Format, syncListeners: SyncListeners) {
        this.format = format
        this.syncListeners = syncListeners;
    }

    onSelect(run: RunUI) {
    }

    onUnSelect(run: RunUI) {
    }

    render(): HTMLElement {
        let codemirrorDiv = null

        this.elem = <HTMLElement>$('div', $ => {
            $('div.editor_controls', $ => {
                $('i.fa.fa-sync', {on: {click: this.onSync}})
                $('i.fa.fa-save', {on: {click: this.onSave}})
            })
            codemirrorDiv = $('div')
        })

        this.codemirror = CodeMirror(codemirrorDiv, {
                mode: "yaml",
                theme: "darcula"
            }
        )

        return this.elem
    }

    updateFormat() {
        this.codemirror.setValue(this.format.toYAML())
    }

    onSync = (e: Event) => {
        e.preventDefault()
        e.stopPropagation()

        console.log("Sync")
        this.format.update(this.codemirror.getValue())
        this.syncListeners.onSync(this.format.dashboard)
    }

    onSave = (e: Event) => {
        e.preventDefault()
        e.stopPropagation()

        console.log("Sync")
        this.format.update(this.codemirror.getValue())
        this.syncListeners.onSync(this.format.dashboard)
        this.format.save()
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
            views.push(new RunView(r))
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
