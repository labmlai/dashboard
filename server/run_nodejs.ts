import * as sqlite3 from 'sqlite3'
import { Run, Indicators, Configs } from './experiments'
import * as PATH from 'path'
import * as UTIL from 'util'
import * as FS from 'fs'
import * as YAML from 'yaml'
import { LAB } from './consts'
import { Lab } from './lab'
import { rmtree } from './util'

export class RunNodeJS {
    private static cache: { [run: string]: RunNodeJS } = {}
    run: Run
    db: sqlite3.Database

    private constructor(run: Run) {
        this.run = run
    }

    static create(run: Run) {
        if (!(run.hash() in RunNodeJS.cache)) {
            RunNodeJS.cache[run.hash()] = new RunNodeJS(run)
        }
        return RunNodeJS.cache[run.hash()]
    }

    private loadDatabase(): Promise<void> {
        if (this.db != null) {
            return new Promise((resolve, reject) => {
                resolve()
            })
        }

        let path = PATH.join(
            LAB.experiments,
            this.run.experimentName,
            this.run.info.index,
            'sqlite.db'
        )
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(path, sqlite3.OPEN_READONLY, err => {
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
                if (err) {
                    reject(err)
                } else {
                    resolve(row)
                }
            })
        })
    }

    private getLastValue(key: string): Promise<any> {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT a.* FROM scalars AS a
            INNER JOIN (
                SELECT indicator, MAX(step) AS step 
                FROM scalars
                GROUP BY indicator
            ) b ON a.indicator = b.indicator AND a.step = b.step`,
                (err, rows) => {
                    if (err) {
                        reject(err)
                    } else {
                        let values = {}
                        for (let row of rows) {
                            values[row.indicator] = row
                        }

                        resolve(values)
                    }
                }
            )
        })
    }

    async getIndicators(): Promise<Indicators> {
        let readFile = UTIL.promisify(FS.readFile)
        let contents = await readFile(
            PATH.join(
                LAB.experiments,
                this.run.experimentName,
                this.run.info.index,
                'indicators.yaml'
            ),
            { encoding: 'utf-8' }
        )
        return new Indicators(YAML.parse(contents))
    }

    async getConfigs(): Promise<Configs> {
        let readFile = UTIL.promisify(FS.readFile)
        let contents = await readFile(
            PATH.join(
                LAB.experiments,
                this.run.experimentName,
                this.run.info.index,
                'configs.yaml'
            ),
            { encoding: 'utf-8' }
        )
        return new Configs(YAML.parse(contents))
    }

    async getDiff(): Promise<string> {
        let readFile = UTIL.promisify(FS.readFile)
        let contents = await readFile(
            PATH.join(
                LAB.experiments,
                this.run.experimentName,
                this.run.info.index,
                'source.diff'
            ),
            { encoding: 'utf-8' }
        )
        return contents
    }

    async getValues() {
        try {
            await this.loadDatabase()
        } catch (e) {
            this.db = null
            console.log(e)
            return {}
        }
        let indicators = await this.getIndicators()

        // console.log(indicators)
        let values = await this.getLastValue('')

        for (let k in indicators.indicators) {
            let ind = indicators.indicators[k]
            let key =
                ind.class_name.indexOf('Scalar') !== -1
                    ? ind.name
                    : `${ind.name}.mean`
            if (!ind.is_print) {
                delete values[key]
            }
        }

        return values
    }

    async getLab() {
        let lab = new Lab(this.run.info.python_file)
        await lab.load()

        return lab
    }

    async remove() {
        let path = PATH.join(
            LAB.experiments,
            this.run.experimentName,
            this.run.info.index
        )
        await rmtree(path)
        let analytics = PATH.join(
            LAB.analytics,
            this.run.experimentName,
            this.run.info.index
        )
        await rmtree(analytics)
    }
}
