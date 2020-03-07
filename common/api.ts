import {
    IndicatorsModel,
    ExperimentsModel,
    ConfigsModel,
    ScalarsModel, RunIdentifier
} from './experiments'
import {CellOptions} from "./cell";

export class Api {
    async getExperiments(): Promise<ExperimentsModel> {
        return null
    }

    async getIndicators(
        experimentName: string,
        runUuid: string
    ): Promise<IndicatorsModel> {
        return null
    }

    async getConfigs(
        experimentName: string,
        runUuid: string
    ): Promise<ConfigsModel> {
        return null
    }

    async getDiff(experimentName: string, runUuid: string): Promise<string> {
        return null
    }

    async getValues(
        experimentName: string,
        runUuid: string
    ): Promise<ScalarsModel> {
        return null
    }

    async launchTensorboard(
        experimentName: string,
        runUuid: string
    ): Promise<string> {
        return null
    }

    async launchTensorboards(runs: RunIdentifier[]): Promise<string> {
        return null
    }

    async launchJupyter(
        experimentName: string,
        runUuid: string,
        analyticsTemplate: string
    ): Promise<string> {
        return null
    }

    async getAnalyticsTemplates(
        experimentName: string,
        runUuid: string
    ): Promise<string[]> {
        return null
    }

    async removeRun(experimentName: string, runUuid: string): Promise<void> {
        return null
    }

    async cleanupCheckpoints(
        experimentName: string,
        runUuid: string
    ): Promise<void> {
        return null
    }

    async updateRun(
        experimentName: string,
        runUuid: string,
        data: { [key: string]: string }
    ): Promise<void> {
        return null
    }

    async saveDashboard(
        name: string,
        cells: CellOptions[]
    ): Promise<void> {
        return null
    }

    async loadDashboards(): Promise<{[dashboard: string]: CellOptions[]}> {
        return null
    }
}

export const API_SPEC = new Api()
