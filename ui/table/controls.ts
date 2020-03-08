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
    private selectedRuns: { [hash: string]: RunUI }
    private tensorboardBtn: HTMLButtonElement
    private searchInput: HTMLInputElement;
    private syncControls: HTMLElement
    private editorControls: HTMLElement;

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

    private resetSelection() {
        this.selectedRuns = {}
        this.updateSelectedRunsCount()
    }

    render(): HTMLElement {
        this.elem = <HTMLElement>$('div.control_panel', $ => {
            this.editorControls = $('div.editor_controls', $ => {
                $('i.fa.fa-edit', {on: {click: this.onEdit}})
                this.syncControls = $('span', $ => {
                    $('i.fa.fa-sync', {on: {click: this.onSync}})
                    $('i.fa.fa-save', {on: {click: this.onSave}})
                })
            })
            this.codemirrorDiv = <HTMLElement>$('div.editor')

            $('div.search', $ => {
                this.searchInput = <HTMLInputElement>$('input', {
                    type: 'text',
                    on: {
                        keyup: this.onSearchKeyUp
                    }
                })

            })

            this.selectedCountElem = <HTMLElement>$('div.selected_count', 'No runs selected')

            $('div.actions', $ => {
                this.tensorboardBtn = <HTMLButtonElement>(
                    $('button',
                        {on: {click: this.onTensorboard}},
                        $ => {
                            $('i.fa.fa-chart-bar')
                            $('span', ' Launch Tensorboard')
                        })
                )

                $('button.danger',
                    {on: {click: this.onRemove}},
                    $ => {
                        $('i.fa.fa-trash')
                        $('span', ' Remove')
                    }
                )

                $('button.danger',
                    {on: {click: this.onCleanupCheckpoints}},
                    $ => {
                        $('i.fa.fa-trash')
                        $('span', ' Cleanup Checkpoints')
                    }
                )
            })
        })

        this.codemirror = CodeMirror(this.codemirrorDiv, {
                mode: "yaml",
                theme: "darcula"
            }
        )

        this.codemirrorDiv.style.display = 'none'
        this.syncControls.style.display = 'none'
        this.editorControls.style.float = 'right'

        return this.elem
    }

    onSearchKeyUp = async (e: KeyboardEvent) => {
        // if (e.key === 'Enter') {
        //     this.saveComment(this.commentInput.value)
        // }
        let search = this.searchInput.value
        let terms: string[] = []
        for (let t of search.split(' ')) {
            t = t.trim()
            if (t !== '') {
                terms.push(t)
            }
        }

        this.resetSelection()

        this.syncListeners.setFilter(terms)
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
            this.syncListeners.onChanging()
            for (let r in this.selectedRuns) {
                let run = this.selectedRuns[r]
                await run.remove()
            }
            this.resetSelection()
            clearCache()
            this.syncListeners.onReload()
        }
    }

    onCleanupCheckpoints = async (e: Event) => {
        this.syncListeners.onChanging()
        for (let r in this.selectedRuns) {
            let run = this.selectedRuns[r]
            await run.cleanupCheckpoints()
        }
        this.resetSelection()
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
            this.syncControls.style.display = null
            this.codemirrorDiv.style.display = null
            this.editorControls.style.float = null
            this.codemirror.setValue(this.format.toYAML())
            this.codemirror.focus()
        } else {
            this.syncControls.style.display = 'none'
            this.codemirrorDiv.style.display = 'none'
            this.editorControls.style.float = 'right'
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