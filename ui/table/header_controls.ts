import {Weya as $} from '../../lib/weya/weya'
import {Cell} from "./cell";

class HeaderControlsView {
    private readonly container: HTMLElement;
    private elem: HTMLElement;

    constructor(container: HTMLElement) {
        this.container = container;
    }

    render() {
        this.elem = <HTMLElement>$('div.header_controls', this.container, "Controls")
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

class HeaderControlsBackgroundView {
    private readonly container: HTMLElement;
    private elem: HTMLElement;
    private listener: HeaderControlsClickListener;


    constructor(container: HTMLElement, listener: HeaderControlsClickListener) {
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

interface HeaderControlsClickListener {
    onClickHeader(index: number)

    onHide()
}

class HeaderCell {
    private elem: HTMLElement
    private controls: HeaderControls;
    private readonly index: number;
    private listener: HeaderControlsClickListener;

    constructor(index: number, elem: HTMLElement, listener: HeaderControlsClickListener) {
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

export class HeaderControls implements HeaderControlsClickListener {
    private readonly container: HTMLElement
    private controls: HeaderControlsView;
    private headers: HeaderCell[];
    private background: HeaderControlsBackgroundView;

    constructor(container: HTMLElement) {
        this.container = container
        this.controls = new HeaderControlsView(this.container)
        this.controls.render()
        this.background = new HeaderControlsBackgroundView(this.container, this)
        this.background.render()
        this.headers = []
    }

    addCell(cell: Cell, elem: HTMLElement) {
        this.headers.push(new HeaderCell(this.headers.length, elem, this))
    }

    onClickHeader(index: number) {
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
}