export interface Indicator {
    name: string
    class_name: string

    [key: string]: any
}

export interface IndicatorsModel {
    [name: string]: Indicator
}

export class Indicators {
    indicators: IndicatorsModel

    constructor(indicators: IndicatorsModel) {
        this.indicators = indicators
    }

    toJSON(): IndicatorsModel {
        return this.indicators
    }
}

export interface Scalar {
    indicator: string
    value: number
    step: number
}

export interface ScalarsModel {
    [name: string]: Scalar
}

export interface Config {
    name: string
    computed: any
    value: any
    options: string[]
    order: number
    type: string
    is_hyperparam?: boolean
    is_explicitly_specified: boolean
}

export interface ConfigsModel {
    [name: string]: Config
}

export class Configs {
    configs: ConfigsModel

    constructor(configs: ConfigsModel) {
        for (let [k, v] of Object.entries(configs)) {
            if (v.is_explicitly_specified == null) {
                v.is_explicitly_specified = false
            }
        }
        this.configs = configs
    }

    toJSON(): ConfigsModel {
        return this.configs
    }
}

export interface RunModel {
    uuid: string
    name: string
    comment: string
    tags: string[]
    commit: string
    commit_message: string
    notes: string
    is_dirty: boolean
    python_file: string
    start_step: number
    trial_date: string // '2019-11-29',
    trial_time: string // '09:05:24',

    load_run?: string

    tensorboard_size: number // folder size
    checkpoints_size: number
    sqlite_size: number
    analytics_size: number
    configs?: ConfigsModel
    values?: ScalarsModel
    indicators?: IndicatorsModel
}

export const DEFAULT_RUN_MODEL: RunModel = {
    uuid: '',
    name: '',
    comment: '',
    tags: [],
    commit: '',
    commit_message: '',
    notes: '',
    is_dirty: false,
    python_file: '',
    start_step: 0,
    trial_date: '2000-01-01',
    trial_time: '00:00:00',
    tensorboard_size: 0,
    checkpoints_size: 0,
    sqlite_size: 0,
    analytics_size: 0
}

export class Run {
    private readonly info: RunModel

    constructor(info: RunModel) {
        this.info = info
    }

    get uuid(): string {
        return this.info.uuid
    }

    get name(): string {
        return this.info.name
    }

    get comment(): string {
        return this.info.comment
    }

    get tags(): string[] {
        return this.info.tags
    }

    get commit(): string {
        return this.info.commit
    }

    get commit_message(): string {
        return this.info.commit_message
    }

    get notes(): string {
        return this.info.notes
    }

    get is_dirty(): boolean {
        return this.info.is_dirty
    }

    get python_file(): string {
        return this.info.python_file
    }

    get start_step(): number {
        return this.info.start_step
    }

    get trial_date(): string {
        return this.info.trial_date
    }

    get trial_time(): string {
        return this.info.trial_time
    }

    get load_run(): string {
        return this.info.load_run
    }

    get tensorboard_size(): number {
        return this.info.tensorboard_size
    }

    get checkpoints_size(): number {
        return this.info.checkpoints_size
    }

    get sqlite_size(): number {
        return this.info.sqlite_size
    }

    get analytics_size(): number {
        return this.info.analytics_size
    }

    get configs(): ConfigsModel {
        return this.info.configs
    }

    get values(): ScalarsModel {
        return this.info.values
    }

    get indicators(): IndicatorsModel {
        return this.info.indicators
    }

    get(key: string): any {
        return this.info[key]
    }

    update(data: { [key: string]: any }) {
        for (let [k, v] of Object.entries(data)) {
            this.info[k] = v
        }
    }

    toJSON() {
        return this.info
    }

    hash() {
        return `${this.info.uuid}`
    }

    static fixRunModel(run: RunModel) {
        let copy = JSON.parse(JSON.stringify(DEFAULT_RUN_MODEL))
        if (run == null) {
            return copy
        }

        if (run.tags == null) {
            run.tags = run.name.split('_')
        }

        for (let k of Object.keys(DEFAULT_RUN_MODEL)) {
            if (run[k] == null) {
                run[k] = copy[k]
            }
        }

        return run
    }
}

export class RunCollection {
    runs: Run[]

    constructor(runs: RunModel[]) {
        this.runs = runs.map(t => new Run(t))
        this.runs.sort(
            (a, b) => {
                if (a.trial_date < b.trial_date) {
                    return -1;
                } else if (a.trial_date > b.trial_date) {
                    return +1;
                } else {
                    if (a.trial_time < b.trial_time) {
                        return -1;
                    } else if (a.trial_time > b.trial_time) {
                        return +1;
                    } else {
                        return 0;
                    }
                }
            }
        )
    }

    get lastRun(): Run {
        if (this.runs.length > 0) {
            return this.runs[this.runs.length - 1]
        }
        return null
    }

    getRun(uuid: string): Run {
        for (let run of this.runs) {
            if (run.uuid === uuid) {
                return run
            }
        }

        throw Error(`Unknown run ${uuid}`)
    }

    toJSON(): RunModel[] {
        return this.runs.map(t => t.toJSON())
    }
}
