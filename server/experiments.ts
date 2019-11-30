interface RunModel {
    comment: string
    commit: string
    commit_message: string
    is_dirty: boolean,
    python_file: string
    start_step: number,
    trial_date: string  // '2019-11-29',
    trial_time: string // '09:05:24'
}

class Run {
    info: RunModel

    constructor(info: RunModel) {
        this.info = info
    }

    toJSON() {
        return this.info
    }
}

interface ExperimentModel {
    name: string
    runs: RunModel[]
}

class Experiment {
    name: string
    runs: Run[]

    constructor(experiment: ExperimentModel) {
        this.name = experiment.name
        this.runs = experiment.runs.map((t) => new Run(t))
    }

    get lastRunDateTime(): [string, string] {
        if (this.runs.length > 0) {
            return [this.runs[this.runs.length - 1].info.trial_date,
            this.runs[this.runs.length - 1].info.trial_time]
        }
        return ['-', '-']
    }

    toJSON(): ExperimentModel {
        return {
            name: this.name,
            runs: this.runs.map((t) => t.toJSON())
        }
    }
}

interface ExperimentsModel {
    [name: string]: ExperimentModel
}

class Experiments {
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

export { ExperimentModel, ExperimentsModel, RunModel, Experiments, Experiment, Run }