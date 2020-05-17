import {
    IndicatorsModel,
    ConfigsModel,
    ScalarsModel,
    RunModel
} from './experiments'
import {CellOptions} from "./cell";

export class Api {
    async getRuns(): Promise<RunModel[]> {
        return null
    }

    async getIndicators(uuid: string): Promise<IndicatorsModel> {
        return null
    }

    async getConfigs(uuid: string): Promise<ConfigsModel> {
        return null
    }

    async getDiff(uuid: string): Promise<string> {
        return null
    }

    async getCode(uuid: string): Promise<string> {
        return null
    }

    async getValues(uuid: string): Promise<ScalarsModel> {
        return null
    }

    async launchTensorboard(uuid: string): Promise<string> {
        return null
    }

    async launchTensorboards(uuids: string[]): Promise<string> {
        return null
    }

    async launchJupyter(uuid: string, analyticsTemplate: string): Promise<string> {
        return null
    }

    async getAnalyticsTemplates(uuid: string): Promise<string[]> {
        return null
    }

    async removeRun(uuid: string): Promise<void> {
        return null
    }

    async cleanupCheckpoints(uuid: string): Promise<void> {
        return null
    }

    async updateRun(uuid: string, data: { [key: string]: string }): Promise<void> {
        return null
    }

    async saveDashboard(name: string, cells: CellOptions[]): Promise<void> {
        return null
    }

    async loadDashboards(): Promise<{ [dashboard: string]: CellOptions[] }> {
        return null
    }
}

export const API_SPEC = new Api()
