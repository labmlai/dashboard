import {Format} from "./format";
import {RunUI} from "../run_ui";
import {Weya as $} from "../../lib/weya/weya";
import {CodeMirror} from "../codemirror";
import {RunIdentifier} from "../../common/experiments";
import {clearCache} from "../cache";
import {SelectListeners, SyncListeners} from "./table_view";
import {API} from "../app";

export class ControlsView implements SelectListeners {
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