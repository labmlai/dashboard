import { PORT } from "./app"
import { Run, IndicatorsModel, Indicators, Configs, ConfigsModel, ScalarsModel } from "./experiments"

export class RunUI {
    run: Run

    constructor(run: Run) {
        this.run = run
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

    async launchTensorboard(): Promise<void> {
        return new Promise((resolve, reject) => {
            PORT.send('launchTensorboard', {
                experimentName: this.run.experimentName,
                runIndex: this.run.info.index
            }, (data, _) => {
                resolve()
            })
        })
    }
}
