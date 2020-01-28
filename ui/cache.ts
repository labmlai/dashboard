import { PORT } from './app'
import { ExperimentsModel, Experiments } from './experiments'
import { API } from './api'

let EXPERIMENTS = null

export async function getExperiments(): Promise<Experiments> {
    if (EXPERIMENTS != null) {
        return EXPERIMENTS
    }

    return new Experiments(await API.getExperiments())
}

export function clearCache() {
    EXPERIMENTS = null
}
