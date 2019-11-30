import * as YAML from "yaml"
import * as FS from "fs"
import * as PATH from "path"
import * as UTIL from "util"

let EXPERIMENTS_FOLDER = PATH.join('/Users/varuna/ml/lab3', 'logs')

function getExperiemntsNames(): Promise<string[]> {
    return new Promise((resolve, reject) => {
        FS.readdir(EXPERIMENTS_FOLDER, (err: NodeJS.ErrnoException, files: string[]) => {
            if (err) {
                reject(err)
            } else {
                resolve(files)
            }
        })
    })
}

interface TrialInfo {
    comment: string
    commit: string
    commit_message: string
    is_dirty: boolean,
    python_file: string
    start_step: number,
    trial_date: string  // '2019-11-29',
    trial_time: string // '09:05:24'
}
class Trial {
    info: TrialInfo

    constructor(info: TrialInfo) {
        this.info = info
    }
}

class Experiment {
    name: string
    trials: Trial[]

    constructor(name: string) {
        this.name = name
    }

    async loadTrials(): Promise<void> {
        this.trials = []
        let readFile = UTIL.promisify(FS.readFile)
        let contents = await readFile(PATH.join(EXPERIMENTS_FOLDER, this.name, 'trials.yaml'), { encoding: 'utf-8' })
        let data: TrialInfo[] = YAML.parse(contents)
        this.trials = data.map((d) => new Trial(d))

        return null
    }
}

async function getExperiments(): Promise<Experiment[]> {
    let names = await getExperiemntsNames()
    let experiments = names.map((name) => new Experiment(name))
    await Promise.all(experiments.map((e) => e.loadTrials()))
    return experiments
}

export { getExperiments, Experiment, Trial }