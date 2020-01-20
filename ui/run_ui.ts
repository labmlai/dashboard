import { PORT } from "./app"
import { Run, IndicatorsModel, Indicators, Configs, ConfigsModel, ScalarsModel } from "./experiments"

export class RunUI {
    private static cache: {[run: string]: RunUI} = {}
    run: Run

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
        return new Promise((resolve) => {
            PORT.send('getIndicators', {
                experimentName: this.run.experimentName,
                runIndex: this.run.info.index
            }, (data: IndicatorsModel, _) => {
                resolve(new Indicators(data))
            })
        })
    }

    async getConfigs(): Promise<Configs> {
        return new Promise((resolve) => {
            PORT.send('getConfigs', {
                experimentName: this.run.experimentName,
                runIndex: this.run.info.index
            }, (data: ConfigsModel, _) => {
                resolve(new Configs(data))
            })
        })
    }
    async getValues(): Promise<ScalarsModel> {
        return new Promise((resolve) => {
            PORT.send('getValues', {
                experimentName: this.run.experimentName,
                runIndex: this.run.info.index
            }, (data: ScalarsModel, _) => {
                resolve(data)
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
}
