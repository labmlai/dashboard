import {WeyaElementFunction} from "../../lib/weya/weya";
import {RunUI} from "../run_ui";
import {formatInt, formatScalar, formatSize, formatValue} from "../view_components/format";

export abstract class Cell {
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

export class InfoCell extends Cell {
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

export class ValueCell extends Cell {
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

export class ConfigComputedCell extends Cell {
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

        let conf = run.configs.configs[this.key]

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

export class ConfigOptionCell extends Cell {
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

        let conf = run.configs.configs[this.key]

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

export class StepCell extends Cell {
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

export class DateTimeCell extends Cell {
    constructor() {
        super("Date & Time")
    }

    renderCell($: WeyaElementFunction, run: RunUI) {
        $('td', `${run.run.info.trial_date} ${run.run.info.trial_time}`)
    }
}


export class CommentCell extends Cell {
    constructor() {
        super("Comment", 2)
    }

    renderCell($: WeyaElementFunction, run: RunUI) {
        $('td.header.header_2', run.run.info.comment)
    }
}

export class SizeCell extends Cell {
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

export class ExperimentNameCell extends Cell {
    constructor() {
        super("Experiment", 1)
    }

    renderCell($: WeyaElementFunction, run: RunUI) {
        $('td.header.header_1', run.run.experimentName)
    }
}

