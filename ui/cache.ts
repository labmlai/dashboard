import { PORT } from './app'
import { ExperimentsModel, Experiments } from './experiments'

let EXPERIMENTS = null

export async function getExperiments(): Promise<Experiments> {
    if (EXPERIMENTS != null) {
        return EXPERIMENTS
    }

    return new Promise((resolve, reject) => {
        PORT.send('getExperiments', null, (data: ExperimentsModel, _) => {
            EXPERIMENTS = new Experiments(data)
            resolve(EXPERIMENTS)
        })
    })
}

export function clearCache() {
    EXPERIMENTS = null
}
