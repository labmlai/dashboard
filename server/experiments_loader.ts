import * as YAML from "yaml"
import * as FS from "fs"
import * as PATH from "path"
import * as UTIL from "util"
import {Experiment, RunModel, Experiments} from "./experiments"

let EXPERIMENTS_FOLDER = PATH.join('/Users/varuna/ml/lab3', 'logs')

class ExperimentsFactory {
    private static async getExperimentsNames(): Promise<string[]> {
        let readDir = UTIL.promisify(FS.readdir)
        return await readDir(EXPERIMENTS_FOLDER)
    }
    
    private static async loadRun(name: string, run: string): Promise<RunModel> {
        let readFile = UTIL.promisify(FS.readFile)
        let contents = await readFile(PATH.join(EXPERIMENTS_FOLDER, name, run, 'run.yaml'), { encoding: 'utf-8' })
        return YAML.parse(contents)
    }

    private static async loadExperiment(name: string): Promise<Experiment> {
        let readDir = UTIL.promisify(FS.readdir)
        let runs = await readDir(PATH.join(EXPERIMENTS_FOLDER, name))
        let promises = runs.map((r) => ExperimentsFactory.loadRun(name, r))
        let data: RunModel[] = await Promise.all(promises)
        return new Experiment({name: name, runs: data})
    }

    static async load(): Promise<Experiments> {
        let names = await ExperimentsFactory.getExperimentsNames()
        let promises = names.map((name) => ExperimentsFactory.loadExperiment(name))
        let experimentsList = await Promise.all(promises)

        let experiments = {}
        for (let e of experimentsList) {
            experiments[e.name] = e
        }

        return new Experiments(experiments)
    }
}

export { ExperimentsFactory }