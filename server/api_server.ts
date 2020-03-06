import {
    ConfigsModel,
    ExperimentsModel,
    IndicatorsModel,
    Run,
    RunIdentifier,
    ScalarsModel
} from '../common/experiments'
import {Api} from '../common/api'
import {ExperimentsFactory} from './experiments_loader'
import {RunNodeJS} from './run_nodejs'
import {Tensorboard} from './tensorboard'
import {Jupyter} from './jupyter'
import {CellOptions} from "../common/cell";
import * as PATH from "path";
import {LAB} from "./consts";
import {readFile, writeFile} from "./util";
import * as YAML from "yaml";

let TENSORBOARD: Tensorboard = null
let JUPYTER: Jupyter = null

async function getRun(experimentName: string, runUuid: string) {
    let experiment = await ExperimentsFactory.loadExperiment(experimentName)
    return RunNodeJS.create(experiment.getRun(runUuid))
}

class ApiServer extends Api {
    async getExperiments(): Promise<ExperimentsModel> {
        let experiments = await ExperimentsFactory.load()
        return experiments.toJSON()
    }

    async getIndicators(
        experimentName: string,
        runUuid: string
    ): Promise<IndicatorsModel> {
        let run = await getRun(experimentName, runUuid)
        let indicators = await run.getIndicators()
        return indicators.toJSON()
    }

    async getConfigs(
        experimentName: string,
        runUuid: string
    ): Promise<ConfigsModel> {
        let run = await getRun(experimentName, runUuid)
        let configs = await run.getConfigs()
        return configs.toJSON()
    }

    async getDiff(experimentName: string, runUuid: string): Promise<string> {
        let run = await getRun(experimentName, runUuid)
        return await run.getDiff()
    }

    async getValues(
        experimentName: string,
        runUuid: string
    ): Promise<ScalarsModel> {
        let run = await getRun(experimentName, runUuid)
        return await run.getValues()
    }

    async launchTensorboard(
        experimentName: string,
        runUuid: string
    ): Promise<string> {
        let experiment = await ExperimentsFactory.loadExperiment(experimentName)
        let run = experiment.getRun(runUuid)
        if (TENSORBOARD != null) {
            TENSORBOARD.stop()
        }
        TENSORBOARD = new Tensorboard([run])
        try {
            await TENSORBOARD.start()
            return 'http://localhost:6006'
        } catch (e) {
            TENSORBOARD = null
            return ''
        }
    }

    async launchTensorboards(runs: RunIdentifier[]): Promise<string> {
        let runsList: Run[] = []
        for (let r of runs) {
            let experiment = await ExperimentsFactory.loadExperiment(r.experimentName)
            runsList.push(experiment.getRun(r.runUuid))
        }
        if (TENSORBOARD != null) {
            TENSORBOARD.stop()
        }
        TENSORBOARD = new Tensorboard(runsList)
        try {
            await TENSORBOARD.start()
            return 'http://localhost:6006'
        } catch (e) {
            TENSORBOARD = null
            return ''
        }
    }

    async launchJupyter(
        experimentName: string,
        runUuid: string,
        analyticsTemplate: string
    ): Promise<string> {
        let experiment = await ExperimentsFactory.loadExperiment(experimentName)
        let run = experiment.getRun(runUuid)

        if (JUPYTER == null) {
            JUPYTER = new Jupyter()
            try {
                await JUPYTER.start()
            } catch (e) {
                JUPYTER = null
                return ''
            }
        }

        return await JUPYTER.setupTemplate(run, analyticsTemplate)
    }

    async getAnalyticsTemplates(
        experimentName: string,
        runUuid: string
    ): Promise<string[]> {
        let run = await getRun(experimentName, runUuid)
        let templateNames = []
        let lab = await run.getLab()
        for (let k in lab.analyticsTemplates) {
            templateNames.push(k)
        }
        return templateNames
    }

    async removeRun(experimentName: string, runUuid: string): Promise<void> {
        let run = await getRun(experimentName, runUuid)
        await run.remove()
    }

    async cleanupCheckpoints(
        experimentName: string,
        runUuid: string
    ): Promise<void> {
        let run = await getRun(experimentName, runUuid)
        await run.cleanupCheckpoints()
    }

    async updateRun(
        experimentName: string,
        runUuid: string,
        data: { [key: string]: string }
    ): Promise<void> {
        let run = await getRun(experimentName, runUuid)
        await run.update(data)
    }

    async saveDashboard(name: string, cells: CellOptions[]): Promise<void> {
        let path = PATH.join(
            LAB.path,
            ".lab_dashboard.yaml"
        )

        let dashboards: { [dashboard: string]: CellOptions[] }
        try {
            let contents = await readFile(path)
            dashboards = YAML.parse(contents)
        } catch (e) {
            dashboards = {}
        }
        dashboards[name] = cells

        await writeFile(path, YAML.stringify(dashboards))
    }

    async loadDashboards(): Promise<{ [dashboard: string]: CellOptions[] }> {
        let path = PATH.join(
            LAB.path,
            ".lab_dashboard.yaml"
        )

        let dashboards: { [dashboard: string]: CellOptions[] }
        try {
            let contents = await readFile(path)
            dashboards = YAML.parse(contents)
        } catch (e) {
            dashboards = {}
        }

        return dashboards
    }
}

export const API = new ApiServer()
