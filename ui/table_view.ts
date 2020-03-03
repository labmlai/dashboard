import {ScreenView} from './screen'
import {ROUTER, SCREEN} from './app'
import {Weya as $, WeyaElement, WeyaElementFunction} from '../lib/weya/weya'
import {Experiments, Run} from '../common/experiments'
import {getExperiments} from './cache'

class RunView {
    elem: WeyaElement
    run: Run

    constructor(r: Run) {
        this.run = r
    }

    render(format: Cell[]) {
        this.elem = $(
            'tr',
            {on: {click: this.onClick}},
            $ => {
                for (let cell of format) {
                    cell.renderCell($, this.run)
                }
            }
        )

        return this.elem
    }

    onClick = (e: Event) => {
        e.preventDefault()
        e.stopPropagation()

        ROUTER.navigate(`/experiment/${this.run.experimentName}`)
    }
}

class Cell {
    renderHeader($: WeyaElementFunction) {
    }

    renderCell($: WeyaElementFunction, run: Run) {
    }
}

class InfoCell extends Cell {
    private readonly key: string

    constructor(key: string) {
        super()
        this.key = key;
    }

    renderHeader($: WeyaElementFunction) {
        $('th', this.key)
    }

    renderCell($: WeyaElementFunction, run: Run) {
        $('td', run.info[this.key])
    }
}

class ExperimentNameCell extends Cell {
    renderHeader($: WeyaElementFunction) {
        $('th', 'Experiment')
    }

    renderCell($: WeyaElementFunction, run: Run) {
        $('td', run.experimentName)
    }
}

class RunsView implements ScreenView {
    elem: HTMLElement
    runsTable: HTMLTableElement
    runs: Run[]
    format: Cell[]

    render(): WeyaElement {
        this.elem = <HTMLElement>$('div.full_container', $ => {
            $('h1', 'Runs')

            this.runsTable = <HTMLTableElement>$('table.runs')
        })
        this.renderExperiments().then()
        return this.elem
    }

    private static getRuns(experiments: Experiments) {
        let runUIs = []
        for (let e of experiments.sorted()) {
            for (let r of e.runs) {
                runUIs.push(r)
            }
        }

        return runUIs
    }

    private static getFormat(): Cell[] {
        return [
            new ExperimentNameCell(),
            new InfoCell('trial_time'),
            new InfoCell('trial_date')
        ]
    }

    private async renderExperiments() {
        this.runs = RunsView.getRuns(await getExperiments())
        this.format = RunsView.getFormat()

        let views: RunView[] = []
        for (let r of this.runs) {
            views.push(new RunView(r))
        }

        $('tr', this.runsTable, $ => {
            for (let c of this.format) {
                c.renderHeader($)
            }
        })
        for (let v of views) {
            this.runsTable.append(v.render(this.format))
        }
    }
}

export class TableHandler {
    constructor() {
        ROUTER.route('table', [this.handleTable])
    }

    handleTable = () => {
        SCREEN.setView(new RunsView())
    }
}
