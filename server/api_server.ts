import {ConfigsModel, IndicatorsModel, Run, RunModel, ScalarsModel} from '../common/experiments'
import {Api} from '../common/api'
import {ExperimentsFactory} from './experiments/cache'
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

async function getRun(runUuid: string) {
    let runs = await ExperimentsFactory.load()
    return RunNodeJS.create(runs.getRun(runUuid))
}

class ApiServer extends Api {
    async getRuns(): Promise<RunModel[]> {
        let runs = await ExperimentsFactory.load()
        return runs.toJSON()
    }

    async getIndicators(uuid: string): Promise<IndicatorsModel> {
        let run = await getRun(uuid)
        let indicators = await run.getIndicators()
        return indicators.toJSON()
    }

    async getConfigs(uuid: string): Promise<ConfigsModel> {
        let run = await getRun(uuid)
        let configs = await run.getConfigs()
        return configs.toJSON()
    }

    async getDiff(uuid: string): Promise<string> {
        let run = await getRun(uuid)
        return await run.getDiff()
    }

    async getValues(uuid: string): Promise<ScalarsModel> {
        let run = await getRun(uuid)
        return await run.getValues()
    }

    async launchTensorboard(uuid: string): Promise<string> {
        let runs = await ExperimentsFactory.load()
        let run = runs.getRun(uuid)
        if (TENSORBOARD != null) {
            TENSORBOARD.stop()
        }
        TENSORBOARD = new Tensorboard([run])
        try {
            await TENSORBOARD.start()
            return 'http://localhost:6006'
        } catch (e) {
            console.log(e)
            TENSORBOARD = null
            return ''
        }
    }

    async launchTensorboards(uuids: string[]): Promise<string> {
        let runsList: Run[] = []
        for (let r of uuids) {
            let runs = await ExperimentsFactory.load()
            runsList.push(runs.getRun(r))
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

    async launchJupyter(uuid: string, analyticsTemplate: string): Promise<string> {
        let runs = await ExperimentsFactory.load()
        let run = runs.getRun(uuid)

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

    async getAnalyticsTemplates(uuid: string): Promise<string[]> {
        let run = await getRun(uuid)
        let templateNames = []
        let lab = await run.getLab()
        for (let k in lab.analyticsTemplates) {
            templateNames.push(k)
        }
        return templateNames
    }

    async removeRun(uuid: string): Promise<void> {
        try {
            let run = await getRun(uuid)
            await run.remove()
            ExperimentsFactory.cacheReset(uuid)
        } catch (e) {
        }
    }

    async cleanupCheckpoints(uuid: string): Promise<void> {
        let run = await getRun(uuid)
        await run.cleanupCheckpoints()
        ExperimentsFactory.cacheReset(uuid)
    }

    async updateRun(uuid: string, data: { [key: string]: string }): Promise<void> {
        let run = await getRun(uuid)
        await run.update(data)
        ExperimentsFactory.cacheReset(uuid)
    }

    async saveDashboard(name: string, cells: CellOptions[]): Promise<void> {
        let path = PATH.join(
            LAB.path,
            ".labml_dashboard.yaml"
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
            ".labml_dashboard.yaml"
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
