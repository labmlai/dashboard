import { IndicatorsModel, ExperimentsModel } from './experiments'

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
}

export const API = new Api()
