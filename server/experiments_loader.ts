import * as YAML from 'yaml'
import * as PATH from 'path'
import {Experiment, Experiments, Run, RunModel} from '../common/experiments'
import {LAB} from './consts'
import {getDiskUsage, readdir, readFile} from './util'
import {RunNodeJS} from "./run_nodejs";

class ExperimentsFactory {
    private static async getExperimentsNames(): Promise<string[]> {
        return await readdir(LAB.experiments)
    }

    private static async loadRun(
        name: string,
        runUuid: string
    ): Promise<RunModel> {
        let contents = await readFile(
            PATH.join(LAB.experiments, name, runUuid, 'run.yaml'),
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

        let run = RunNodeJS.create(new Run(name, res))
        res.values = await run.getValues()
        res.configs = (await run.getConfigs()).configs

        return res
    }

    static async loadExperiment(name: string): Promise<Experiment> {
        let runs = await readdir(PATH.join(LAB.experiments, name))
        let promises = runs.map(r => ExperimentsFactory.loadRun(name, r))
        let data: RunModel[] = await Promise.all(promises)
        return new Experiment({name: name, runs: data})
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

export {ExperimentsFactory}
