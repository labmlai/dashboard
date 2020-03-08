import {WeyaElementFunction} from "../../lib/weya/weya";
import {RunUI} from "../run_ui";
import {
    formatFixed,
    formatInt,
    formatScalar,
    formatSize,
    formatValue
} from "../view_components/format";
import {CellOptions} from "../../common/cell";


export abstract class Cell {
    type: string
    name?: string
    key: string
    options: CellOptions
    specifiedWidth: string
    protected isEmpty = false
    protected isSame = false
    protected sortRank?: number = null
    protected defaultWidth = '10em'
    protected align = 'left'

    constructor(opt: CellOptions) {
        this.options = opt
        this.name = opt.name
        this.key = opt.key
        this.type = opt.type
        this.sortRank = opt.sortRank
        this.specifiedWidth = opt.width
    }

    get width(): string {
        if (this.specifiedWidth == null) {
            return this.defaultWidth
        } else {
            return this.specifiedWidth
        }
    }

    get isHidden(): boolean {
        return this.isEmpty
    }

    renderHeader($: WeyaElementFunction) {
        if (this.isHidden) {
            return
        }

        let tag = 'div.cell'
        if (this.isSame) {
            tag += '.same'
        }
        let elem = $(tag, $ => {
            if (this.name != null) {
                $('span', this.name, {title: this.name})
            } else {
                this.renderHeaderContent($)
            }
        })
        elem.style.width = this.width
    }

    protected renderHeaderContent($: WeyaElementFunction) {
    }

    protected renderCellContent($: WeyaElementFunction, run: RunUI) {
    }

    protected getString(run: RunUI): string {
        return null
    }

    renderCell($: WeyaElementFunction, run: RunUI): HTMLElement {
        if (this.isHidden) {
            return null
        }

        let tag = 'div.cell'
        if (this.isSame) {
            tag += '.same'
        }
        tag += `.${this.align}`

        let elem = <HTMLElement>$(tag, $ => {
            let value = this.getString(run)
            if (value != null) {
                $('span', value, {title: value})
            } else {
                this.renderCellContent($, run)
            }
        })
        elem.style.width = this.width

        return elem
    }

    update(runs: RunUI[]) {
    }

    compare(a: RunUI, b: RunUI) {
        if (this.sortRank == null) {
            return 0
        } else {
            return this.sortRank * this.compareDirection(a, b)
        }
    }

    protected compareDirection(a: RunUI, b: RunUI) {
        let av = this.getValue(a)
        let bv = this.getValue(b)
        if (av < bv) {
            return -1
        } else if (av > bv) {
            return +1
        } else {
            return 0
        }
    }

    protected getValue(run: RunUI): any {
        return this.getString(run)
    }

    isFiltered(run: RunUI, t: string): boolean {
        let s = this.getString(run)
        if (s == null) {
            return false
        }

        return s.includes(t)
    }
}

export class InfoCell extends Cell {
    constructor(opt: CellOptions) {
        super(opt)
        if (opt.key === 'is_dirty') {
            this.defaultWidth = '3em'
        }
    }

    protected getString(run: RunUI): string {
        return `${run.run.info[this.key]}`
    }

    protected getValue(run: RunUI): any {
        return run.run.info[this.key]
    }
}

export class ValueCell extends Cell {
    private decimals = 7
    protected align = 'right'

    renderCellContent($: WeyaElementFunction, run: RunUI) {
        if (run.values[this.key] != null) {
            $('span', formatFixed(run.values[this.key].value, this.decimals))
        }
    }

    protected getValue(run: RunUI): any {
        if (run.values[this.key] != null) {
            return run.values[this.key].value
        } else {
            return null
        }
    }

    update(runs: RunUI[]) {
        let min = null
        let max = null
        for (let r of runs) {
            let v = this.getValue(r)
            if (v == null) {
                continue
            }
            if (min == null) {
                min = max = v
            }
            if (v < min) {
                min = v
            }
            if (v > max) {
                max = v
            }
        }

        let estimate = Math.max(Math.abs(max), Math.abs(min))

        let lg: number
        if (estimate < 1e-9) {
            lg = 0
        } else {
            lg = Math.ceil(Math.log10(estimate)) + 1
        }

        let decimals = 7 - lg
        decimals = Math.max(1, decimals)
        decimals = Math.min(6, decimals)

        this.decimals = decimals
    }
}

export class ConfigComputedCell extends Cell {
    renderCellContent($: WeyaElementFunction, run: RunUI) {
        if (run.configs.configs[this.key] == null) {
            return
        }

        let conf = run.configs.configs[this.key]

        if (conf.order < 0) {
            $('span.ignored', `ignored`)
            return
        }

        if (typeof (conf.computed) === "string") {
            let computed: string = conf.computed
            computed = computed.replace('\n', '')
            $('span', computed, {title: computed})
        } else {
            $('span', {title: `${conf.computed}`}, formatValue(conf.computed))
        }
    }

    protected getValue(run: RunUI): any {
        if (run.configs.configs[this.key] == null) {
            return null
        }

        let conf = run.configs.configs[this.key]

        if (conf.order < 0) {
            return null
        }

        return conf.computed
    }

    update(runs: RunUI[]) {
        this.isSame = false
        if (runs.length === 0) {
            this.isSame = true
            return
        }
        let value = this.getValue(runs[0])

        for (let run of runs) {
            let v = this.getValue(run)
            if (v == null) {
                if (value != null) {
                    return
                }
            } else if (v !== value) {
                return
            }
        }

        this.isSame = true
    }
}

export class ConfigOptionCell extends Cell {
    renderCellContent($: WeyaElementFunction, run: RunUI) {
        if (run.configs.configs[this.key] == null) {
            return
        }

        let conf = run.configs.configs[this.key]

        if (conf.order < 0) {
            return
        }

        let options = new Set()
        for (let opt of conf.options) {
            options.add(opt)
        }

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
    }

    update(runs: RunUI[]) {
        let count = 0

        for (let run of runs) {
            if (run.configs.configs[this.key] == null) {
                continue
            }

            let conf = run.configs.configs[this.key]

            if (conf.order < 0) {
                continue
            }

            let options = new Set()
            for (let opt of conf.options) {
                options.add(opt)
            }

            if (options.size === 0) {
                continue
            }

            count++
        }

        this.isEmpty = count <= 0;
    }

    protected getValue(run: RunUI): any {
        if (run.configs.configs[this.key] == null) {
            return null
        }

        let conf = run.configs.configs[this.key]

        if (conf.order < 0) {
            return null
        }

        return conf.value
    }
}

export class StepCell extends Cell {
    protected defaultWidth = '6em'
    protected align = 'right'

    private getMaxStep(run: RunUI) {
        let maxStep = 0

        for (let k in run.values) {
            maxStep = Math.max(run.values[k].step, maxStep)
        }

        return maxStep
    }

    renderCellContent($: WeyaElementFunction, run: RunUI) {
        let maxStep = this.getMaxStep(run)
        $('span', formatInt(maxStep))
    }

    protected getValue(run: RunUI): any {
        return this.getMaxStep(run)
    }
}

export class DateTimeCell extends Cell {
    protected getString(run: RunUI): string {
        return `${run.run.info.trial_date} ${run.run.info.trial_time}`
    }
}


export class CommentCell extends Cell {
    protected getString(run: RunUI): string {
        return run.run.info.comment
    }
}

export class SizeCell extends Cell {
    protected defaultWidth = '5em'
    protected align = 'right'

    private getSize(run: RunUI) {
        let info = run.run.info
        let size: number
        if (this.key === '') {
            size =
                info.sqlite_size +
                info.analytics_size +
                info.checkpoints_size +
                info.tensorboard_size
        } else {
            size = info[this.key]
        }

        return size
    }

    renderCellContent($: WeyaElementFunction, run: RunUI) {
        let size = this.getSize(run)
        $('span', formatSize(size))
    }

    protected getValue(run: RunUI): any {
        return this.getSize(run)
    }
}

export class ExperimentNameCell extends Cell {
    protected getString(run: RunUI): string {
        return run.run.experimentName
    }
}

export class ControlsCell extends Cell {
    protected defaultWidth = '3em'

    protected getString(run: RunUI): string {
        return ""
    }
}

export class CellFactory {
    static create(opt: CellOptions) {
        switch (opt.type) {
            case "controls":
                return new ControlsCell(opt)
            case "experiment_name":
                return new ExperimentNameCell(opt)
            case "comment":
                return new CommentCell(opt)
            case "date_time":
                return new DateTimeCell(opt)
            case "info":
                return new InfoCell(opt)
            case "size":
                return new SizeCell(opt)
            case "step":
                return new StepCell(opt)
            case "value":
                return new ValueCell(opt)
            case "config_computed":
                return new ConfigComputedCell(opt)
            case "config_options":
                return new ConfigOptionCell(opt)
            default:
                throw new Error("Unknown Cell Type" + opt.type)
        }
    }
}
