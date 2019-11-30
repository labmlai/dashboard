import * as YAML from "yaml"
import * as FS from "fs"
import * as PATH from "path"
import * as UTIL from "util"
import {Experiment, TrialModel, Experiments} from "./experiments"

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


class ExperimentFactory {
    static async load(name: string): Promise<Experiment> {
        let readFile = UTIL.promisify(FS.readFile)
        let contents = await readFile(PATH.join(EXPERIMENTS_FOLDER, name, 'trials.yaml'), { encoding: 'utf-8' })
        let data: TrialModel[] = YAML.parse(contents)
        return new Experiment({name: name, trials: data})
    }
}

class ExperimentsFactory {
    static async load(): Promise<Experiments> {
        let names = await getExperiemntsNames()
        let promises = names.map((name) => ExperimentFactory.load(name))
        let experimentsList = await Promise.all(promises)

        let experiments = {}
        for (let e of experimentsList) {
            experiments[e.name] = e
        }

        return new Experiments(experiments)
    }
}

export { ExperimentsFactory }