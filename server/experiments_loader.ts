import * as YAML from "yaml"
import * as FS from "fs"
import * as PATH from "path"
import * as UTIL from "util"
import { Experiment, RunModel, Experiments, Indicators } from "./experiments"
import { LAB } from "./consts"

class ExperimentsFactory {
    private static async getExperimentsNames(): Promise<string[]> {
        let readDir = UTIL.promisify(FS.readdir)
        return await readDir(LAB.experiments)
    }

    private static async loadRun(name: string, runIndex: string): Promise<RunModel> {
        let readFile = UTIL.promisify(FS.readFile)
        let contents = await readFile(PATH.join(LAB.experiments, name, runIndex, 'run.yaml'), { encoding: 'utf-8' })
        let res: RunModel = YAML.parse(contents)
        res.index = runIndex

        return res
    }

    static async loadExperiment(name: string): Promise<Experiment> {
        let readDir = UTIL.promisify(FS.readdir)
        let runs = await readDir(PATH.join(LAB.experiments, name))
        let promises = runs.map((r) => ExperimentsFactory.loadRun(name, r))
        let data: RunModel[] = await Promise.all(promises)
        return new Experiment({ name: name, runs: data })
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