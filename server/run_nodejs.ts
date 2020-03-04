import * as sqlite3 from 'sqlite3'
import {Configs, Indicators, Run, RunModel, ScalarsModel} from '../common/experiments'
import * as PATH from 'path'
import * as YAML from 'yaml'
import {LAB} from './consts'
import {Lab} from './lab'
import {exists, readdir, readFile, rmtree, writeFile} from './util'

const UPDATABLE_KEYS = new Set(['comment', 'notes', 'tags'])

export class RunNodeJS {
    private static cache: { [run: string]: RunNodeJS } = {}
    run: Run
    db: sqlite3.Database
    configs: Configs
    values: ScalarsModel
    indicators: Indicators

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
            return new Promise(resolve => {
                resolve()
            })
        }

        let path = PATH.join(
            LAB.experiments,
            this.run.experimentName,
            this.run.info.uuid,
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

    private getLastValue(): Promise<any> {
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
        // TODO: Caching
        if (true && this.indicators == null) {
            let contents = await readFile(
                PATH.join(
                    LAB.experiments,
                    this.run.experimentName,
                    this.run.info.uuid,
                    'indicators.yaml'
                ))
            this.indicators = new Indicators(YAML.parse(contents))
        }

        return this.indicators
    }

    async getConfigs(): Promise<Configs> {
        if (true || this.configs == null) {
            try {
                let contents = await readFile(
                    PATH.join(
                        LAB.experiments,
                        this.run.experimentName,
                        this.run.info.uuid,
                        'configs.yaml'
                    ))
                this.configs = new Configs(YAML.parse(contents))
            } catch (e) {
                return new Configs({})
            }
        }

        return this.configs
    }

    async getDiff(): Promise<string> {
        return await readFile(
            PATH.join(
                LAB.experiments,
                this.run.experimentName,
                this.run.info.uuid,
                'source.diff'
            ))
    }

    async getValues() {
        if(false && this.values != null) {
            return this.values
        }

        // console.log("loading values")

        try {
            await this.loadDatabase()
        } catch (e) {
            this.db = null
            console.log(
                'Couldnt connect to SQLite db',
                this.run.experimentName,
                this.run.info.uuid,
                e
            )
            return {}
        }
        let indicators = await this.getIndicators()

        // console.log(indicators)
        let values = {}
        try {
            values = await this.getLastValue()
        } catch (e) {
            console.log(
                'Couldnt read from SQLite db',
                this.run.experimentName,
                this.run.info.uuid,
                e
            )
            return {}
        }

        for (let k in indicators.indicators) {
            let ind = indicators.indicators[k]
            if (ind.class_name == null) {
                continue
            }
            let key =
                ind.class_name.indexOf('Scalar') !== -1
                    ? ind.name
                    : `${ind.name}.mean`
            if (!ind.is_print) {
                delete values[key]
            }
        }

        this.values = values
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
            this.run.info.uuid
        )
        await rmtree(path)
        let analytics = PATH.join(
            LAB.analytics,
            this.run.experimentName,
            this.run.info.uuid
        )
        await rmtree(analytics)
    }

    async update(data: { [key: string]: string }) {
        for (let k in data) {
            if (!UPDATABLE_KEYS.has(k)) {
                return
            }
        }

        let path = PATH.join(
            LAB.experiments,
            this.run.experimentName,
            this.run.info.uuid,
            'run.yaml'
        )
        let contents = await readFile(path)
        let run: RunModel = YAML.parse(contents)
        run = Run.fixRunModel(this.run.experimentName, run)

        for (let k in data) {
            run[k] = data[k]
        }

        await writeFile(path, YAML.stringify(run))
    }

    async cleanupCheckpoints() {
        let path = PATH.join(
            LAB.experiments,
            this.run.experimentName,
            this.run.info.uuid,
            'checkpoints'
        )

        if (!(await exists(path))) {
            return
        }
        let checkpoints = await readdir(path)

        if (checkpoints.length == 0) {
            return
        }
        let last = parseInt(checkpoints[0])
        for (let c of checkpoints) {
            if (last < parseInt(c)) {
                last = parseInt(c)
            }
        }

        for (let c of checkpoints) {
            if (last !== parseInt(c)) {
                await rmtree(PATH.join(path, c))
            }
        }
    }
}
