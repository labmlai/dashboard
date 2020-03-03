import {Configs, Indicators, Run, ScalarsModel} from '../common/experiments'
import {API} from '../common/api'

export class RunUI {
    private static cache: { [run: string]: RunUI } = {}
    run: Run
    configs: Configs
    values: ScalarsModel
    indicators: Indicators
    diff: string

    private constructor(run: Run) {
        this.run = run
    }

    static create(run: Run) {
        if (!(run.hash() in RunUI.cache)) {
            RunUI.cache[run.hash()] = new RunUI(run)
        }
        return RunUI.cache[run.hash()]
    }

    async loadIndicators(): Promise<Indicators> {
        if (this.indicators == null) {
            this.indicators = new Indicators(
                await API.getIndicators(
                    this.run.experimentName,
                    this.run.info.uuid
                )
            )
        }
        return this.indicators
    }

    async loadConfigs(): Promise<Configs> {
        if (this.configs == null) {
            this.configs = new Configs(
                await API.getConfigs(
                    this.run.experimentName,
                    this.run.info.uuid
                )
            )
        }

        return this.configs
    }

    async loadDiff(): Promise<string> {
        if (this.diff == null) {
            this.diff = await API.getDiff(
                this.run.experimentName,
                this.run.info.uuid
            )
        }

        return this.diff
    }

    async loadValues(): Promise<ScalarsModel> {
        if (this.values == null) {
            this.values = await API.getValues(
                this.run.experimentName,
                this.run.info.uuid
            )
        }

        return this.values
    }

    async launchTensorboard(): Promise<string> {
        return await API.launchTensorboard(
            this.run.experimentName,
            this.run.info.uuid
        )
    }

    async launchJupyter(templateName: string): Promise<string> {
        return await API.launchJupyter(
            this.run.experimentName,
            this.run.info.uuid,
            templateName
        )
    }

    async getAnalyticsTemplates(): Promise<string[]> {
        return await API.getAnalyticsTemplates(
            this.run.experimentName,
            this.run.info.uuid
        )
    }

    async remove() {
        return await API.removeRun(this.run.experimentName, this.run.info.uuid)
    }

    async cleanupCheckpoints() {
        return await API.cleanupCheckpoints(
            this.run.experimentName,
            this.run.info.uuid
        )
    }

    async update(data: { [key: string]: any }) {
        return await API.updateRun(
            this.run.experimentName,
            this.run.info.uuid,
            data
        )
    }
}
