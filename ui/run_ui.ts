import { PORT } from "./app"
import { Run, IndicatorsModel, Indicators } from "./experiments"

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

    async getValues(): Promise<any> {
        return new Promise((resolve) => {
            PORT.send('getValues', {
                experimentName: this.run.experimentName,
                runIndex: this.run.info.index
            }, (data: any, _) => {
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
