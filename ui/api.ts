import {
    IndicatorsModel,
    ExperimentsModel,
    Configs,
    ConfigsModel,
    ScalarsModel
} from './experiments'

class Api {
    async getExperiments(): Promise<ExperimentsModel> {
        return null
    }

    async getIndicators(
        experimentName: string,
        runIndex: string
    ): Promise<IndicatorsModel> {
        return null
    }

    async getConfigs(
        experimentName: string,
        runIndex: string
    ): Promise<ConfigsModel> {
        return null
    }

    async getDiff(experimentName: string, runIndex: string): Promise<string> {
        return null
    }

    async getValues(
        experimentName: string,
        runIndex: string
    ): Promise<ScalarsModel> {
        return null
    }

    async launchTensorboard(
        experimentName: string,
        runIndex: string
    ): Promise<string> {
        return null
    }

    async launchJupyter(
        experimentName: string,
        runIndex: string,
        analyticsTemplate: string
    ): Promise<string> {
        return null
    }

    async getAnalyticsTemplates(
        experimentName: string,
        runIndex: string
    ): Promise<string[]> {
        return null
    }

    async remove(experimentName: string, runIndex: string): Promise<void> {
        return null
    }
}

export const API = new Api()
