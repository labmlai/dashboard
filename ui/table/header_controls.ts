import {Weya as $} from '../../lib/weya/weya'
import {Cell} from "./cell";
import {Format} from "./format";

class ControlsView {
    private readonly container: HTMLElement;
    private elem: HTMLElement;
    private listener: EventsListener;

    constructor(container: HTMLElement, listener: EventsListener) {
        this.container = container;
        this.listener = listener;
    }

    render() {
        this.elem = <HTMLElement>$('div.header_controls', this.container,
            $ => {
                $('i.fa.fa-sort-amount-down', {on: {click: this.listener.onSortDescending}})
                $('i.fa.fa-sort-amount-up-alt', {on: {click: this.listener.onSortAscending}})
                $('i.fa.fa-arrow-left', {on: {click: this.listener.onMoveLeft}})
                $('i.fa.fa-arrow-right', {on: {click: this.listener.onMoveRight}})
                // $('i.fa.fa-compress')
                // $('i.fa.fa-expand')
            })
    }

    show(x: number, y: number) {
        this.elem.style.display = 'block'

        let width = this.elem.offsetWidth
        this.elem.style.top = `${y}px`
        this.elem.style.left = `${x - width / 2}px`
    }

    hide() {
        this.elem.style.display = null
    }
}

class BackgroundView {
    private readonly container: HTMLElement;
    private elem: HTMLElement;
    private listener: EventsListener;


    constructor(container: HTMLElement, listener: EventsListener) {
        this.container = container;
        this.listener = listener;
    }

    render() {
        this.elem = <HTMLElement>$('div.header_controls_background', this.container,
            {on: {click: this.onClick}})
    }

    show(x: number, y: number) {
        this.elem.style.display = 'block'
    }

    hide() {
        this.elem.style.display = null
    }

    onClick = (e: Event) => {
        e.stopPropagation()
        e.preventDefault()

        this.listener.onHide()
    }
}

interface EventsListener {
    onClickHeader(index: number)

    onHide()

    onSortAscending()

    onSortDescending()

    onMoveLeft()

    onMoveRight()
}

class HeaderCell {
    private elem: HTMLElement
    private controls: HeaderControls;
    private readonly index: number;
    private listener: EventsListener;

    constructor(index: number, elem: HTMLElement, listener: EventsListener) {
        this.elem = elem
        this.index = index
        this.listener = listener;
        if (elem != null) {
            this.elem.addEventListener('click', this.onClick)
        }
    }

    onClick = (e: Event) => {
        e.preventDefault()
        e.stopPropagation()

        if (this.controls != null) {
            return
        }

        this.listener.onClickHeader(this.index)
    }

    getXY(container: HTMLElement): [number, number] {
        let x = 0, y = 0
        let node = this.elem
        while (node != container) {
            y += node.offsetTop
            x += node.offsetLeft
            node = <HTMLElement>node.offsetParent
        }

        x += this.elem.offsetWidth / 2
        y += this.elem.offsetHeight

        return [x, y]
    }
}

export interface FormatUpdateListener {
    onFormatUpdated()
}

export class HeaderControls implements EventsListener {
    private readonly container: HTMLElement
    private controls: ControlsView;
    private headers: HeaderCell[];
    private background: BackgroundView;
    private readonly format: Format;
    private listener: FormatUpdateListener;
    private selected: number;

    constructor(container: HTMLElement, format: Format, listener: FormatUpdateListener) {
        this.container = container
        this.format = format;
        this.listener = listener;
        this.controls = new ControlsView(this.container, this)
        this.controls.render()
        this.background = new BackgroundView(this.container, this)
        this.background.render()
        this.headers = []
    }

    addCell(cell: Cell, elem: HTMLElement) {
        this.headers.push(new HeaderCell(this.headers.length, elem, this))
    }

    onClickHeader(index: number) {
        this.selected = index

        let [x, y] = this.headers[index].getXY(this.container)
        this.controls.show(x, y)
        this.background.show(x, y)
    }

    reset() {
        this.controls.hide()
        this.background.hide()
        this.headers = []
    }

    onHide() {
        this.controls.hide()
        this.background.hide()
    }

    onSortAscending = () => {
        this.format.sortAscending(this.selected)
        this.listener.onFormatUpdated()
    }

    onSortDescending = () => {
        this.format.sortDescending(this.selected)
        this.listener.onFormatUpdated()
    }

    onMoveLeft = () => {
        this.format.moveLeft(this.selected)
        this.listener.onFormatUpdated()
    }

    onMoveRight = () => {
        this.format.moveRight(this.selected)
        this.listener.onFormatUpdated()
    }
}