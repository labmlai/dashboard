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
    index: string
    comment: string
    commit: string
    commit_message: string
    is_dirty: boolean,
    python_file: string
    start_step: number,
    trial_date: string  // '2019-11-29',
    trial_time: string // '09:05:24'
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
        this.runs = experiment.runs.map((t) => new Run(this.name, t))
        this.runs.sort((a, b) => parseInt(a.info.index) - parseInt(b.info.index))
    }

    get lastRunDateTime(): [string, string] {
        if (this.runs.length > 0) {
            return [this.runs[this.runs.length - 1].info.trial_date,
            this.runs[this.runs.length - 1].info.trial_time]
        }
        return ['-', '-']
    }

    getRun(index: string): Run {
        for(let run of this.runs) {
            if(run.info.index === index) {
                return run
            }
        }

        throw Error(`Unknown index ${index}`)
    }

    toJSON(): ExperimentModel {
        return {
            name: this.name,
            runs: this.runs.map((t) => t.toJSON())
        }
    }
}

export interface ExperimentsModel {
    [name: string]: ExperimentModel
}

export class Experiments {
    experiments: { [name: string]: Experiment }

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
        return res.sort((a, b) => (a.name < b.name ?
            -1 : (a.name > b.name ? 1 : 0)))
    }
    toJSON(): ExperimentsModel {
        let res = {}
        for (let k in this.experiments) {
            res[k] = this.experiments[k].toJSON()
        }

        return res
    }
}