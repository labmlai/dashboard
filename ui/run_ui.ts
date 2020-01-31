import { PORT } from './app'
import {
    Run,
    IndicatorsModel,
    Indicators,
    Configs,
    ConfigsModel,
    ScalarsModel
} from './experiments'
import { API } from './api'

export class RunUI {
    private static cache: { [run: string]: RunUI } = {}
    private run: Run
    private configs: Configs
    private values: ScalarsModel
    private indicators: Indicators
    private diff: string

    private constructor(run: Run) {
        this.run = run
    }

    static create(run: Run) {
        if (!(run.hash() in RunUI.cache)) {
            RunUI.cache[run.hash()] = new RunUI(run)
        }
        return RunUI.cache[run.hash()]
    }

    async getIndicators(): Promise<Indicators> {
        if (this.indicators == null) {
            this.indicators = new Indicators(
                await API.getIndicators(
                    this.run.experimentName,
                    this.run.info.index
                )
            )
        }
        return this.indicators
    }

    async getConfigs(): Promise<Configs> {
        if (this.configs == null) {
            this.configs = new Configs(
                await API.getConfigs(
                    this.run.experimentName,
                    this.run.info.index
                )
            )
        }

        return this.configs
    }

    async getDiff(): Promise<string> {
        if (this.diff == null) {
            this.diff = await API.getDiff(
                this.run.experimentName,
                this.run.info.index
            )
        }

        return this.diff
    }

    async getValues(): Promise<ScalarsModel> {
        if (this.values == null) {
            this.values = await API.getValues(
                this.run.experimentName,
                this.run.info.index
            )
        }

        return this.values
    }

    async launchTensorboard(): Promise<string> {
        return await API.launchTensorboard(
            this.run.experimentName,
            this.run.info.index
        )
    }

    async launchJupyter(templateName: string): Promise<string> {
        return await API.launchJupyter(
            this.run.experimentName,
            this.run.info.index,
            templateName
        )
    }

    async getAnalyticsTemplates(): Promise<string[]> {
        return await API.getAnalyticsTemplates(
            this.run.experimentName,
            this.run.info.index
        )
    }

    async remove() {
        return await API.removeRun(this.run.experimentName, this.run.info.index)
    }

    async cleanupCheckpoints() {
        return await API.cleanupCheckpoints(
            this.run.experimentName,
            this.run.info.index
        )
    }
}
