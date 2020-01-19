import * as PATH from "path"
import * as PROCESS from "process"
import { Lab } from "./lab"

const CWD = PROCESS.cwd()

let LAB = new Lab(CWD)

console.log(LAB.path)

export let EXPERIMENTS_FOLDER: string = LAB.experiments
