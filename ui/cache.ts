import {API} from './app'
import {Experiments} from '../common/experiments'
import {RunUI} from "./run_ui";

let EXPERIMENTS = null

export async function getExperiments(): Promise<Experiments> {
    if (EXPERIMENTS != null) {
        return EXPERIMENTS
    }

    return new Experiments(await API.getExperiments())
}

export function clearCache() {
    EXPERIMENTS = null
    RunUI.clearCache()
}
