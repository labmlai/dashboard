import * as sqlite3 from "sqlite3"
import { Run, Indicators } from "./experiments"
import * as PATH from "path"
import * as UTIL from "util"
import * as FS from "fs"
import * as YAML from "yaml"
import { EXPERIMENTS_FOLDER } from "./consts"

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
        return new Promise((resolve, reject) => {
            this.db.all(`SELECT a.* FROM scalars AS a
            INNER JOIN (
                SELECT indicator, MAX(step) AS step 
                FROM scalars
                GROUP BY indicator
            ) b ON a.indicator = b.indicator AND a.step = b.step`, (err, rows) => {
               if(err) {
                   reject(err)
               } else {
                    let values = {}
                    for(let row of rows) {
                        values[row.indicator] = row
                    }

                    resolve(values)
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

    async getValues() {
        await this.loadDatabase()
        let indicators = await this.getIndicators()
        
        console.log(indicators)
        let values = await this.getLastValue('')

        for(let k in indicators.indicators) {
            let ind = indicators.indicators[k]
            let key = ind.class_name == 'Scalar' ? ind.name : `${ind.name}.mean`
            if(!ind.is_print) {
                delete values[key]
            }
        }

        return values
    }
}
