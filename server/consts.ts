import * as PATH from "path"
import * as PROCESS from "process"
import { Lab } from "./lab"

export const CWD = PROCESS.cwd()

let LAB = new Lab(CWD)

console.log(LAB.path)

export const EXPERIMENTS_FOLDER: string = LAB.experiments
export const ANALYTICS_FOLDER: string = LAB.analytics
