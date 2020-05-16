import {API} from './app'
import {RunCollection} from '../common/experiments'
import {RunUI} from "./run_ui";

export async function getRuns(): Promise<RunCollection> {
    console.log("Reloading all")
    return new RunCollection(await API.getRuns())
}

export function clearCache() {
    RunUI.clearCache()
}
