import {Weya as $, WeyaElement} from "../../lib/weya/weya";
import {RunUI} from "../run_ui";
import {Cell} from "./cell";
import {ROUTER} from "../app";
import {SelectListeners} from "./table_view";

export class RunView {
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