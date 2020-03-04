import {ScreenView} from './screen'
import {ROUTER, SCREEN} from './app'
import {Weya as $, WeyaElement, WeyaElementFunction} from '../lib/weya/weya'
import {Config, Experiments} from '../common/experiments'
import {getExperiments} from './cache'
import {formatInt, formatScalar, formatSize, formatValue} from "./view_components/format";
import {RunUI} from "./run_ui";

class RunView {
    elem: WeyaElement
    run: RunUI

    constructor(r: RunUI) {
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

        ROUTER.navigate(`/experiment/${this.run.run.experimentName}/${this.run.run.info.uuid}`)
    }
}

abstract class Cell {
    private readonly name: string
    private readonly header: number

    protected constructor(name: string, header: number = 0) {
        this.name = name
        this.header = header
    }

    renderHeader($: WeyaElementFunction) {
        if (this.header > 0) {
            $(`th.header.header_${this.header}`, this.name)
        } else {
            $('th', this.name)
        }
    }

    abstract renderCell($: WeyaElementFunction, run: RunUI)
}

class InfoCell extends Cell {
    private readonly key: string
    private readonly formatter: Function;

    constructor(key: string, name: string, formatter: Function = null) {
        super(name)
        this.key = key
        this.formatter = formatter;
    }

    renderCell($: WeyaElementFunction, run: RunUI) {
        if (this.formatter == null) {
            $('td', `${run.run.info[this.key]}`)
        } else {
            $('td', this.formatter(run.run.info[this.key]))
        }
    }
}

class ValueCell extends Cell {
    private readonly key: string
    private readonly formatter: Function;

    constructor(key: string, formatter: Function = formatScalar) {
        super(key)
        this.key = key
        this.formatter = formatter
    }

    renderCell($: WeyaElementFunction, run: RunUI) {
        if (run.values[this.key] == null) {
            $('td', ``)
            return
        }

        if (this.formatter == null) {
            $('td', `${run.values[this.key].value}`)
        } else {
            $('td', this.formatter(run.values[this.key].value))
        }
    }
}

class ConfigComputedCell extends Cell {
    private readonly key: string

    constructor(key: string) {
        super(key)
        this.key = key
    }

    renderCell($: WeyaElementFunction, run: RunUI) {
        if (run.configs[this.key] == null) {
            $('td', ``)
            return
        }

        let conf: Config = run.configs[this.key]

        if (conf.order < 0) {
            $('td', ``)
            return
        }

        if (typeof (conf.computed) === "string") {
            let computed: string = conf.computed
            computed = computed.replace('\n', '')
            $('td', computed)
        } else {
            $('td', formatValue(conf.computed))
        }
    }
}

class ConfigOptionCell extends Cell {
    private readonly key: string

    constructor(key: string) {
        super(key)
        this.key = key
    }

    renderCell($: WeyaElementFunction, run: RunUI) {
        if (run.configs.configs[this.key] == null) {
            $('td', ``)
            return
        }

        let conf: Config = run.configs.configs[this.key]

        if (conf.order < 0) {
            $('td', ``)
            return
        }

        let options = new Set()
        for (let opt of conf.options) {
            options.add(opt)
        }

        $('td', $ => {
            if (options.has(conf.value)) {
                options.delete(conf.value)
                if (options.size === 0) {
                    $('span.only_option', conf.value)
                } else {
                    $('span.picked', conf.value)
                }
            } else {
                $('span.custom', '-')
            }
            if (options.size > 0) {
                $('span.options', $ => {
                    for (let opt of options.keys()) {
                        if (typeof opt !== 'string') {
                            continue
                        }
                        $('span', <string>opt)
                    }
                })
            }
        })
    }
}

class StepCell extends Cell {
    private readonly formatter: Function;

    constructor() {
        super("Step")
    }

    renderCell($: WeyaElementFunction, run: RunUI) {
        let maxStep = 0

        for (let k in run.values) {
            maxStep = Math.max(run.values[k].step, maxStep)
        }

        $('td', formatInt(maxStep))
    }
}

class DateTimeCell extends Cell {
    constructor() {
        super("Date & Time")
    }

    renderCell($: WeyaElementFunction, run: RunUI) {
        $('td', `${run.run.info.trial_date} ${run.run.info.trial_time}`)
    }
}


class CommentCell extends Cell {
    constructor() {
        super("Comment", 2)
    }

    renderCell($: WeyaElementFunction, run: RunUI) {
        $('td.header.header_2', run.run.info.comment)
    }
}

class SizeCell extends Cell {
    constructor() {
        super("Size")
    }

    renderCell($: WeyaElementFunction, run: RunUI) {
        let info = run.run.info
        let size =
            info.sqlite_size +
            info.analytics_size +
            info.checkpoints_size +
            info.tensorboard_size

        $('td', formatSize(size))
    }
}

class ExperimentNameCell extends Cell {
    constructor() {
        super("Experiment", 1)
    }

    renderCell($: WeyaElementFunction, run: RunUI) {
        $('td.header.header_1', run.run.experimentName)
    }
}

class RunsView implements ScreenView {
    elem: HTMLElement
    runsTable: HTMLTableElement
    runs: RunUI[]
    format: Cell[]

    render(): WeyaElement {
        this.elem = <HTMLElement>$('div.full_container', $ => {
            $('h1', 'Runs')

            $('div.runs_container', $ => {
                this.runsTable = <HTMLTableElement>$('table.runs')
            })
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

    private getFormat(): Cell[] {
        let format: Cell[] = [
            new ExperimentNameCell(),
            new CommentCell(),
            new DateTimeCell(),
            new InfoCell('commit_message', "Commit Message"),
            new InfoCell('is_dirty', 'Dirty'),
            new InfoCell('python_file', 'Python File'),
            new InfoCell('tags', 'Tags'),
            new SizeCell(),
            new InfoCell('checkpoints_size', 'Checkpoints', formatSize),
            new InfoCell('sqlite_size', 'SQLite', formatSize),
            new InfoCell('analytics_size', 'Analytics', formatSize),
            new InfoCell('tensorboard_size', 'Tensorboard', formatSize)
        ]

        format.push(new StepCell())

        let indicators = new Set<string>()
        for (let r of this.runs) {
            for (let k in r.values) {
                indicators.add(k)
            }
        }

        for (let k of indicators.keys()) {
            format.push(new ValueCell(k))
        }

        let configs = new Set<string>()
        for (let r of this.runs) {
            for (let k in r.configs.configs) {
                configs.add(k)
            }
        }

        for (let k of configs.keys()) {
            format.push(new ConfigComputedCell(k))
            format.push(new ConfigOptionCell(k))
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

        this.format = this.getFormat()

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
