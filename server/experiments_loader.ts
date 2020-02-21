import * as YAML from 'yaml'
import * as FS from 'fs'
import * as PATH from 'path'
import * as UTIL from 'util'
import {
    Experiment,
    RunModel,
    Experiments,
    DEFAULT_RUN_MODEL, Run
} from '../common/experiments'
import { LAB } from './consts'
import { getDiskUsage } from './util'

class ExperimentsFactory {
    private static async getExperimentsNames(): Promise<string[]> {
        let readDir = UTIL.promisify(FS.readdir)
        return await readDir(LAB.experiments)
    }

    private static async loadRun(
        name: string,
        runUuid: string
    ): Promise<RunModel> {
        let readFile = UTIL.promisify(FS.readFile)
        let contents = await readFile(
            PATH.join(LAB.experiments, name, runUuid, 'run.yaml'),
            { encoding: 'utf-8' }
        )
        let res: RunModel = YAML.parse(contents)
        res = Run.fixRunModel(name, res)

        res.uuid = runUuid
        res.checkpoints_size = await getDiskUsage(
            PATH.join(LAB.experiments, name, runUuid, 'checkpoints')
        )
        res.tensorboard_size = await getDiskUsage(
            PATH.join(LAB.experiments, name, runUuid, 'tensorboard')
        )
        res.sqlite_size = await getDiskUsage(
            PATH.join(LAB.experiments, name, runUuid, 'sqlite.db')
        )
        res.analytics_size = await getDiskUsage(
            PATH.join(LAB.analytics, name, runUuid)
        )

        return res
    }

    static async loadExperiment(name: string): Promise<Experiment> {
        let readDir = UTIL.promisify(FS.readdir)
        let runs = await readDir(PATH.join(LAB.experiments, name))
        let promises = runs.map(r => ExperimentsFactory.loadRun(name, r))
        let data: RunModel[] = await Promise.all(promises)
        return new Experiment({ name: name, runs: data })
    }

    static async load(): Promise<Experiments> {
        let names = await ExperimentsFactory.getExperimentsNames()
        let promises = names.map(name =>
            ExperimentsFactory.loadExperiment(name)
        )
        let experimentsList = await Promise.all(promises)

        let experiments = {}
        for (let e of experimentsList) {
            experiments[e.name] = e
        }

        return new Experiments(experiments)
    }
}

export { ExperimentsFactory }
