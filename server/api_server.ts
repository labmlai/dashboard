import {
    IndicatorsModel,
    ExperimentsModel,
    ConfigsModel,
    ScalarsModel
} from './experiments'
import { Api } from './api'
import { ExperimentsFactory } from './experiments_loader'
import { RunNodeJS } from './run_nodejs'
import { Tensorboard } from './tensorboard'
import { Jupyter } from './jupyter'

let TENSORBOARD: Tensorboard = null
let JUPYTER: Jupyter = null

class ApiServer extends Api {
    async getExperiments(): Promise<ExperimentsModel> {
        let experiments = await ExperimentsFactory.load()
        return experiments.toJSON()
    }

    async getIndicators(
        experimentName: string,
        runIndex: string
    ): Promise<IndicatorsModel> {
        let experiment = await ExperimentsFactory.loadExperiment(experimentName)
        let run = RunNodeJS.create(experiment.getRun(runIndex))
        let indicators = await run.getIndicators()
        return indicators.toJSON()
    }

    async getConfigs(
        experimentName: string,
        runIndex: string
    ): Promise<ConfigsModel> {
        let experiment = await ExperimentsFactory.loadExperiment(experimentName)
        let run = RunNodeJS.create(experiment.getRun(runIndex))
        let configs = await run.getConfigs()
        return configs.toJSON()
    }

    async getDiff(experimentName: string, runIndex: string): Promise<string> {
        let experiment = await ExperimentsFactory.loadExperiment(experimentName)
        let run = RunNodeJS.create(experiment.getRun(runIndex))
        return await run.getDiff()
    }

    async getValues(
        experimentName: string,
        runIndex: string
    ): Promise<ScalarsModel> {
        let experiment = await ExperimentsFactory.loadExperiment(experimentName)
        let run = RunNodeJS.create(experiment.getRun(runIndex))
        return await run.getValues()
    }

    async launchTensorboard(
        experimentName: string,
        runIndex: string
    ): Promise<string> {
        let experiment = await ExperimentsFactory.loadExperiment(experimentName)
        let run = experiment.getRun(runIndex)
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

    async launchJupyter(
        experimentName: string,
        runIndex: string,
        analyticsTemplate: string
    ): Promise<string> {
        let experiment = await ExperimentsFactory.loadExperiment(experimentName)
        let run = experiment.getRun(runIndex)

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
        runIndex: string
    ): Promise<string[]> {
        let experiment = await ExperimentsFactory.loadExperiment(experimentName)
        let run = RunNodeJS.create(experiment.getRun(runIndex))
        let templateNames = []
        let lab = await run.getLab()
        for (let k in lab.analyticsTemplates) {
            templateNames.push(k)
        }
        return templateNames
    }

    async removeRun(experimentName: string, runIndex: string): Promise<void> {
        let experiment = await ExperimentsFactory.loadExperiment(experimentName)
        let run = RunNodeJS.create(experiment.getRun(runIndex))
        await run.remove()
    }
}

export const API = new ApiServer()
