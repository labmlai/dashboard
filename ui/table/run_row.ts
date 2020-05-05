import {Weya as $, WeyaElement} from "../../lib/weya/weya";
import {RunUI} from "../run_ui";
import {Cell} from "./cell";
import {ROUTER} from "../app";
import {SelectListeners} from "./table_view";

export class RunRowView {
    elem: WeyaElement
    run: RunUI
    cells: HTMLElement[] = []
    private controls: HTMLElement;
    private selectIcon: HTMLElement;
    private isSelected: boolean;
    private selectListeners: SelectListeners;
    private readonly index: number

    constructor(r: RunUI, index: number, selectListeners: SelectListeners) {
        this.run = r
        this.index = index
        this.selectListeners = selectListeners;
        this.isSelected = false
    }

    render(format: Cell[]) {
        let indexClass = this.index % 2 == 0 ? 'even' : 'odd'
        this.cells = []
        this.elem = $('div.row.' + indexClass,
            {on: {click: this.onSelect}}, $ => {
                for (let cell of format) {
                    let rendered = cell.renderCell($, this.run)
                    this.cells.push(rendered)
                    if (cell.type === 'controls') {
                        this.controls = rendered
                    }
                }
            })

        this.controls.innerHTML = ''
        $('span.controls', this.controls, $ => {
            this.selectIcon = <HTMLElement>$('i.fa.fa-square', {on: {click: this.onSelect}})
            $('a', {
                on: {click: this.onOpen},
                href: `/experiment/${this.run.run.experimentName}/${this.run.run.info.uuid}`
            }, $ => {
                $('i.fa.fa-file')
            })
        })

        return this.elem
    }

    onSelect = (e: Event) => {
        e.preventDefault()
        e.stopPropagation()

        this.setSelection(!this.isSelected)
    }

    setSelection(isSelected: boolean) {
        this.isSelected = isSelected

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