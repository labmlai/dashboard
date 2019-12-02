import * as sqlite3 from "sqlite3"
import { Run, Indicators } from "./experiments"
import * as PATH from "path"
import * as UTIL from "util"
import * as FS from "fs"
import * as YAML from "yaml"
import { EXPERIMENTS_FOLDER } from "./consts"

let sqlite = sqlite3.verbose()

export class RunNodeJS {
    run: Run
    db: sqlite3.Database

    constructor(run: Run) {
        this.run = run
    }

    private loadDatabase(): Promise<void> {
        let path = PATH.join(EXPERIMENTS_FOLDER, this.run.experimentName, this.run.info.index, 'sqlite.db')
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(path, sqlite3.OPEN_READONLY, (err) => {
                if (err) {
                    reject(err)
                } else {
                    resolve()
                }
            })
        })
    }

    private getMaxStep(): Promise<any> {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT MAX(step) FROM scalars', (err, row) => {
                if(err) {
                    reject(err)
                } else {
                    resolve(row)
                }
            })
        })
    }

    private getLastValue(key: string): Promise<any> {
        let tableName = this.keyToTableName(key)
        return new Promise((resolve, reject) => {
            this.db.get(`SELECT * FROM ${tableName} ORDER BY step DESC LIMIT 1`, (err, row) => {
                if(err) {
                    reject(err)
                } else {
                    resolve(row)
                }
            })
        })
    }

    async getIndicators(): Promise<Indicators> {
        let readFile = UTIL.promisify(FS.readFile)
        let contents = await readFile(PATH.join(EXPERIMENTS_FOLDER, this.run.experimentName, this.run.info.index, 'indicators.yaml'),
            { encoding: 'utf-8' })
        return new Indicators(YAML.parse(contents))
    }

    private keyToTableName(key: string) {
        return `values_${key.replace(/\./g, '_')}`
    }

    async getValues() {
        await this.loadDatabase()
        let indicators = await this.getIndicators()
        let promises = []
        let keys = []
        for(let k in indicators.indicators) {
            let ind = indicators.indicators[k]
            let key = ind.type == 'scalar' ? ind.name : `${ind.name}.mean`
            if(!ind.options.is_print) {
                continue
            }

            promises.push(this.getLastValue(key))
            keys.push(ind.name)
        }
        let values = await Promise.all(promises)

        let keyValues = {}
        for(let i = 0; i < keys.length; ++i) {
            keyValues[keys[i]] = values[i]
        }

        return keyValues
    }
}
