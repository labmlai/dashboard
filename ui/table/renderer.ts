import {Cell} from "./cell";
import {RunRowView} from "./run_row";

const ADJUST_CELL_WIDTH_MARGIN = 2

export class RunsRenderer {
    private readonly runsTable: HTMLElement
    private readonly cells: Cell[]
    private readonly runRows: RunRowView[];
    private readonly headerCells: HTMLElement[];
    private cancelled: boolean;

    constructor(runsTable: HTMLElement, runRows: RunRowView[], headerCells: HTMLElement[],
                cells: Cell[]) {
        this.headerCells = headerCells
        this.runRows = runRows
        this.runsTable = runsTable
        this.cells = cells
        this.cancelled = false
    }

    private static getCellWidth(elem: HTMLElement) {
        let children = elem.children
        let width = 0
        for (let x of children) {
            width += (<HTMLElement>x).offsetWidth
        }

        return width
    }

    cancel() {
        this.cancelled = true
    }

    async render(): Promise<void> {
        let start = new Date().getTime()
        for (let j = 0; j < this.runRows.length;) {
            j = await this.renderRows(j, 5)
            if (this.cancelled) {
                return
            }
        }
        console.log("Render Rows", new Date().getTime() - start)

        start = new Date().getTime()
        for (let i = 0; i < this.cells.length; ++i) {
            await this.adjustCellWidth(i)
            if (this.cancelled) {
                return
            }
        }
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

    private async adjustCellWidth(i: number): Promise<void> {
        let header = this.headerCells[i]
        if (header == null) {
            return
        }

        let defaultWidth = header.offsetWidth
        let maxWidth = RunsRenderer.getCellWidth(header)
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
            maxWidth = Math.max(RunsRenderer.getCellWidth(c), maxWidth)
            if (defaultWidth <= maxWidth) {
                return
            }
        }

        maxWidth += ADJUST_CELL_WIDTH_MARGIN

        header.style.width = `${maxWidth}px`
        for (let r of this.runRows) {
            let c = r.cells[i]
            if (c == null) {
                continue
            }
            c.style.width = `${maxWidth}px`
        }

        return new Promise<void>((resolve) => {
            window.requestAnimationFrame(() => {
                resolve()
            })
        })
    }
}
