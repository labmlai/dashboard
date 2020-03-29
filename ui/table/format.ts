import {CellOptions} from "../../common/cell";
import {jsyaml} from "../jsyaml";
import {Cell, CellFactory} from "./cell";
import {API} from "../app";

export class Format {
    dashboard: string
    cells: CellOptions[]

    constructor(dashboard: string) {
        this.dashboard = dashboard
        this.cells = []
    }

    defaults(cells: CellOptions[]) {
        let has = new Set<string>()
        for (let c of this.cells) {
            has.add(Format.hashCell(c))
        }

        for (let c of cells) {
            if (!has.has(Format.hashCell(c))) {
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

    private static hashCell(cell: CellOptions): string {
        return `${cell.type}-${cell.key}`
    }
}