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
}

export interface ConfigsModel {
    [name: string]: Config
}

export class Configs {
    configs: ConfigsModel

    constructor(configs: ConfigsModel) {
        this.configs = configs
    }

    toJSON(): ConfigsModel {
        return this.configs
    }
}

export interface RunModel {
    uuid: string
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

export interface RunIdentifier {
    experimentName: string
    runUuid: string
}

export class Run {
    experimentName: string
    info: RunModel

    constructor(experimentName: string, info: RunModel) {
        this.experimentName = experimentName
        this.info = info
    }

    toJSON() {
        return this.info
    }

    hash() {
        return `${this.experimentName}-${this.info.uuid}`
    }

    static fixRunModel(experimentName: string, run: RunModel) {
        let copy = JSON.parse(JSON.stringify(DEFAULT_RUN_MODEL))
        if (run == null) {
            return copy
        }

        if (run.tags == null) {
            run.tags = experimentName.split('_')
        }

        for (let k in DEFAULT_RUN_MODEL) {
            if (run[k] == null) {
                run[k] = copy[k]
            }
        }

        return run
    }
}

export interface ExperimentModel {
    name: string
    runs: RunModel[]
}

export class Experiment {
    name: string
    runs: Run[]

    constructor(experiment: ExperimentModel) {
        this.name = experiment.name
        this.runs = experiment.runs.map(t => new Run(this.name, t))
        this.runs.sort(
            (a, b) => {
                if (a.info.trial_date < b.info.trial_date) {
                    return -1;
                } else if (a.info.trial_date > b.info.trial_date) {
                    return +1;
                } else {
                    if (a.info.trial_time < b.info.trial_time) {
                        return -1;
                    } else if (a.info.trial_time > b.info.trial_time) {
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
            if (run.info.uuid === uuid) {
                return run
            }
        }

        throw Error(`Unknown run ${uuid}`)
    }

    toJSON(): ExperimentModel {
        return {
            name: this.name,
            runs: this.runs.map(t => t.toJSON())
        }
    }
}

export interface ExperimentsModel {
    [name: string]: ExperimentModel
}

export class Experiments {
    private readonly experiments: { [name: string]: Experiment }

    constructor(experiments: ExperimentsModel) {
        this.experiments = {}
        for (let k in experiments) {
            this.experiments[k] = new Experiment(experiments[k])
        }
    }

    sorted(): Experiment[] {
        let res: Experiment[] = []
        for (let k in this.experiments) {
            res.push(this.experiments[k])
        }
        return res.sort((a, b) =>
            a.name < b.name ? -1 : a.name > b.name ? 1 : 0
        )
    }

    toJSON(): ExperimentsModel {
        let res = {}
        for (let k in this.experiments) {
            res[k] = this.experiments[k].toJSON()
        }

        return res
    }

    get(experimentName: string): Experiment {
        return this.experiments[experimentName]
    }

    getByTag(name: string): Run[] {
        let runs: Run[] = []
        for(let k in this.experiments) {
            let exp = this.experiments[k];
            for(let r of exp.runs) {
                if(r.info.tags.includes(name)) {
                    runs.push(r)
                }
            }
        }

        return runs
    }
}
