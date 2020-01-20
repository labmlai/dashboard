import { PORT } from "./app"
import { Run, IndicatorsModel, Indicators, Configs, ConfigsModel, ScalarsModel } from "./experiments"

export class RunUI {
    private static cache: {[run: string]: RunUI} = {}
    private run: Run
    private configs: Configs
    private values: ScalarsModel
    private indicators: Indicators

    private constructor(run: Run) {
        this.run = run
    }

    static create(run: Run) {
        if(!(run.hash() in RunUI.cache)) {
            RunUI.cache[run.hash()] = new RunUI(run)
        }
        return RunUI.cache[run.hash()]
    }

    async getIndicators(): Promise<Indicators> {
        if(this.indicators != null) {
            return this.indicators
        }

        return new Promise((resolve) => {
            PORT.send('getIndicators', {
                experimentName: this.run.experimentName,
                runIndex: this.run.info.index
            }, (data: IndicatorsModel, _) => {
                this.indicators = new Indicators(data)
                resolve(this.indicators)
            })
        })
    }

    async getConfigs(): Promise<Configs> {
        if(this.configs != null) {
            return this.configs
        }

        return new Promise((resolve) => {
            PORT.send('getConfigs', {
                experimentName: this.run.experimentName,
                runIndex: this.run.info.index
            }, (data: ConfigsModel, _) => {
                this.configs = new Configs(data)
                resolve(this.configs)
            })
        })
    }

    async getValues(): Promise<ScalarsModel> {
        if(this.values != null) {
            return this.values
        }

        return new Promise((resolve) => {
            PORT.send('getValues', {
                experimentName: this.run.experimentName,
                runIndex: this.run.info.index
            }, (data: ScalarsModel, _) => {
                this.values = data
                resolve(this.values)
            })
        })
    }

    async launchTensorboard(): Promise<string> {
        return new Promise((resolve, reject) => {
            PORT.send('launchTensorboard', {
                experimentName: this.run.experimentName,
                runIndex: this.run.info.index
            }, (url, _) => {
                resolve(url)
            })
        })
    }

    async launchJupyter(templateName: string): Promise<string> {
        return new Promise((resolve, reject) => {
            PORT.send('launchJupyter', {
                experimentName: this.run.experimentName,
                runIndex: this.run.info.index,
                analyticsTemplate: templateName
            }, (url, _) => {
                resolve(url)
            })
        })
    }

    async getAnalyticsTemplates(): Promise<string[]> {
        return new Promise((resolve, reject) => {
            PORT.send('getAnalyticsTemplates', {
                experimentName: this.run.experimentName,
                runIndex: this.run.info.index
            }, (data: string[], _) => {
                resolve(data)
            })
        })
    }

    async remove() {
        return new Promise((resolve, reject) => {
            PORT.send('removeRun', {
                experimentName: this.run.experimentName,
                runIndex: this.run.info.index
            }, (data: any, _) => {
                resolve()
            })
        })
    }
}
