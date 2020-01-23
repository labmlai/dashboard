import * as PATH from 'path'
import * as PROCESS from 'process'
import { Lab } from './lab'

const CWD = PROCESS.cwd()

export const LAB = new Lab(CWD)
