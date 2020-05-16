import {Configs, Indicators, Run, ScalarsModel} from '../common/experiments'
import {API} from "./app";
import {clearCache} from "./cache";

export class RunUI {
    private static cache: { [run: string]: RunUI } = {}
    run: Run
    configs: Configs
    values: ScalarsModel
    indicators: Indicators
    diff: string
    generations: number = 0
    children: number = 0

    private constructor(run: Run) {
        this.run = run
    }

    static create(run: Run) {
        if (!(run.hash() in RunUI.cache)) {
            RunUI.cache[run.hash()] = new RunUI(run)
        }
        return RunUI.cache[run.hash()]
    }

    static clearCache() {
        this.cache = {}
    }

    async loadIndicators(): Promise<Indicators> {
        if (this.indicators != null) {
            return this.indicators
        }

        if (this.run.indicators != null) {
            this.indicators = new Indicators(this.run.indicators)
            return this.indicators
        }

        this.indicators = new Indicators(
            await API.getIndicators(this.run.uuid)
        )

        return this.indicators
    }

    async loadConfigs(): Promise<Configs> {
        if (this.configs != null) {
            return this.configs
        }

        if (this.run.configs != null) {
            this.configs = new Configs(this.run.configs)
            return this.configs
        }

        this.configs = new Configs(
            await API.getConfigs(this.run.uuid)
        )

        return this.configs
    }

    async loadDiff(): Promise<string> {
        if (this.diff == null) {
            this.diff = await API.getDiff(this.run.uuid)
        }

        return this.diff
    }

    async loadValues(): Promise<ScalarsModel> {
        if (this.values != null) {
            return this.values
        }

        if (this.run.values != null) {
            this.values = this.run.values
            return this.values
        }

        this.values = await API.getValues(this.run.uuid)

        return this.values
    }

    async launchTensorboard(): Promise<string> {
        return await API.launchTensorboard(this.run.uuid)
    }

    async launchJupyter(templateName: string): Promise<string> {
        return await API.launchJupyter(
            this.run.uuid,
            templateName
        )
    }

    async getAnalyticsTemplates(): Promise<string[]> {
        return await API.getAnalyticsTemplates(this.run.uuid)
    }

    async remove() {
        return await API.removeRun(this.run.uuid)
    }

    async cleanupCheckpoints() {
        return await API.cleanupCheckpoints(this.run.uuid)
    }

    async update(data: { [key: string]: any }) {
        clearCache()

        this.run.update(data)

        return await API.updateRun(this.run.uuid, data)
    }
}
