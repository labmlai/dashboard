import * as PATH from "path"
import * as PROCESS from "process"

const CWD = PROCESS.cwd()

console.log(CWD)

export let EXPERIMENTS_FOLDER: string = PATH.join(CWD, 'logs')
