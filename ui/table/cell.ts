import {WeyaElementFunction} from "../../lib/weya/weya";
import {RunUI} from "../run_ui";
import {formatFixed, formatInt, formatSize, formatValue} from "../view_components/format";
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
    private readonly visible: boolean
    protected cssClasses: string = ''

    constructor(opt: CellOptions) {
        this.options = opt
        this.name = opt.name
        this.key = opt.key
        this.type = opt.type
        this.sortRank = opt.sortRank
        this.visible = !(opt.visible === false)
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
        return !this.visible || this.isEmpty
    }

    renderHeader($: WeyaElementFunction): HTMLElement {
        if (this.isHidden) {
            return
        }

        let tag = 'div.cell'
        tag += this.cssClasses

        if (this.isSame) {
            tag += '.same'
        }
        let elem = <HTMLElement>$(tag, $ => {
            if (this.name != null) {
                if (this.name.trim() !== '') {
                    $('span', this.name, {title: this.name})
                }
            } else {
                this.renderHeaderContent($)
            }
        })
        if (elem.childElementCount === 0) {
            elem.innerHTML = '&nbsp;'
        }

        elem.style.width = this.width

        return elem
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
        tag += this.cssClasses
        tag += `.${this.align}`

        let elem = <HTMLElement>$(tag, $ => {
            let value = this.getString(run)
            if (value != null) {
                if (value.trim() !== '') {
                    $('span', value, {title: value})
                }
            } else {
                this.renderCellContent($, run)
            }
        })

        if (elem.childElementCount === 0) {
            elem.innerHTML = '&nbsp;'
        }

        elem.style.width = this.width

        return elem
    }

    updateCellState(runs: RunUI[]) {
        if (!this.visible) {
            return
        }
        this.update(runs)
    }

    protected update(runs: RunUI[]) {
    }

    compare(a: RunUI, b: RunUI) {
        if (this.sortRank == null) {
            return 0
        } else {
            return this.compareDirection(this.sortRank, a, b)
        }
    }

    protected compareDirection(rank: number, a: RunUI, b: RunUI) {
        let av = this.getValue(a)
        let bv = this.getValue(b)
        if (av === '') {
            av = null
        }
        if (bv === '') {
            bv = null
        }
        if (av == null && bv == null) {
            return 0
        } else if (av == null && bv != null) {
            return Math.abs(rank)
        } else if (av != null && bv == null) {
            return -Math.abs(rank)
        } else if (av < bv) {
            return -rank
        } else if (av > bv) {
            return +rank
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
    protected cssClasses = '.info'

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
    protected cssClasses = '.value'
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

    protected update(runs: RunUI[]) {
        let min = null
        let max = null
        let count = 0

        for (let r of runs) {
            let v = this.getValue(r)
            if (v == null) {
                continue
            }

            count++
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

        this.isEmpty = count <= 0;

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

    protected update(runs: RunUI[]) {
        this.isSame = true
        this.isEmpty = true

        if (runs.length === 0) {
            return
        }
        let value = this.getValue(runs[0])

        for (let run of runs) {
            let v = this.getValue(run)
            if (v !== value) {
                this.isSame = false
            }
            if (v != null) {
                this.isEmpty = false
            }
        }
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

    protected update(runs: RunUI[]) {
        this.isEmpty = true
        this.isSame = true

        if (runs.length === 0) {
            return
        }

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

            this.isEmpty = false
        }

        let value = this.getValue(runs[0])

        for (let run of runs) {
            let v = this.getValue(run)
            if (v !== value) {
                this.isSame = false
            }
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

        return conf.value
    }
}

export class ConfigCalculatedCell extends Cell {
    protected cssClasses = '.config'

    renderCellContent($: WeyaElementFunction, run: RunUI) {
        if (run.configs.configs[this.key] == null) {
            return
        }

        let conf = run.configs.configs[this.key]

        if (conf.order < 0) {
            $('span.ignored', `ignored`)
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
            if (typeof (conf.computed) === "string") {
                let computed: string = conf.computed
                computed = computed.replace('\n', '')
                $('span.computed', computed, {title: computed})
            } else {
                $('span.computed', {title: `${conf.computed}`}, formatValue(conf.computed))
            }
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

        let options = new Set()
        for (let opt of conf.options) {
            options.add(opt)
        }

        if (options.has(conf.value)) {
            return conf.value
        }

        return conf.computed
    }

    protected update(runs: RunUI[]) {
        this.isSame = true
        this.isEmpty = true

        if (runs.length === 0) {
            return
        }
        let value = this.getValue(runs[0])

        for (let run of runs) {
            let v = this.getValue(run)
            if (value == null) {
                value = v
            }
            if (v != null && v !== value) {
                this.isSame = false
            }
            if (v != null) {
                let conf = run.configs.configs[this.key]
                if (conf.is_hyperparam === true ||
                    (conf.is_hyperparam == null && conf.is_explicitly_specified)) {
                    this.isEmpty = false
                }
            }
        }
    }
}

export class StepCell extends Cell {
    protected cssClasses = '.step'
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
    protected cssClasses = '.date-time'

    protected getString(run: RunUI): string {
        return `${run.run.info.trial_date} ${run.run.info.trial_time}`
    }
}


export class CommentCell extends Cell {
    protected cssClasses = '.comment'

    protected getString(run: RunUI): string {
        return run.run.info.comment
    }
}

export class SizeCell extends Cell {
    protected cssClasses = '.size'
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
    protected cssClasses = '.experiment-name'

    protected getString(run: RunUI): string {
        return run.run.experimentName
    }
}

export class ControlsCell extends Cell {
    protected cssClasses = '.controls'

    protected defaultWidth = '3em'

    protected getString(run: RunUI): string {
        return ""
    }
}

export class GenerationsCell extends Cell {
    protected defaultWidth = '3em'

    renderCellContent($: WeyaElementFunction, run: RunUI) {
        for (let i = 0; i < run.generations; ++i) {
            $('i.generation.fas.fa-circle')
        }
        if (run.children > 0) {
            $('i.generation.fas.fa-circle')
        } else {
            $('i.generation.far.fa-circle')
        }
    }
}

export class CellFactory {
    static create(opt: CellOptions) {
        switch (opt.type) {
            case "controls":
                return new ControlsCell(opt)
            case "generations":
                return new GenerationsCell(opt)
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
            case "config_calculated":
                return new ConfigCalculatedCell(opt)
            default:
                throw new Error("Unknown Cell Type" + opt.type)
        }
    }
}
