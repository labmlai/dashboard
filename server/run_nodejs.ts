import * as sqlite3 from 'sqlite3'
import {Configs, Indicators, Run, RunModel, ScalarsModel} from '../common/experiments'
import * as PATH from 'path'
import * as YAML from 'yaml'
import {LAB} from './consts'
import {exists, mkdir, readdir, readFile, rename, rmtree, writeFile} from './util'
import {ExperimentsFactory} from "./experiments/cache";

const UPDATABLE_KEYS = new Set(['comment', 'notes', 'tags'])
const USE_CACHE = true
const USE_VALUES_CACHE = false

export class RunNodeJS {
    run: Run
    db: sqlite3.Database
    configs: Configs
    values: ScalarsModel
    indicators: Indicators

    private constructor(run: Run) {
        this.run = run
    }

    static create(run: Run) {
        return new RunNodeJS(run)
    }

    private loadDatabase(): Promise<void> {
        if (this.db != null) {
            return new Promise(resolve => {
                resolve()
            })
        }

        let path = PATH.join(
            LAB.experiments,
            this.run.name,
            this.run.uuid,
            'sqlite.db'
        )

        return new Promise((resolve, reject) => {
            exists(path).then((isExists) => {
                if (!isExists) {
                    return reject(false)
                }
                this.db = new sqlite3.Database(path, sqlite3.OPEN_READONLY, err => {
                    if (err) {
                        reject(err)
                    } else {
                        resolve()
                    }
                })
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
        if (!USE_CACHE || this.indicators == null) {
            let contents = await readFile(
                PATH.join(
                    LAB.experiments,
                    this.run.name,
                    this.run.uuid,
                    'indicators.yaml'
                ))
            this.indicators = new Indicators(YAML.parse(contents))
        }

        return this.indicators
    }

    async getConfigs(): Promise<Configs> {
        if (!USE_CACHE || this.configs == null) {
            try {
                let contents = await readFile(
                    PATH.join(
                        LAB.experiments,
                        this.run.name,
                        this.run.uuid,
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
                this.run.name,
                this.run.uuid,
                'source.diff'
            ))
    }

    async getCode(): Promise<string> {
        try {
            return await readFile(this.run.python_file)
        } catch (e) {
            return '# File missing'
        }
    }

    async getValues() {
        if (USE_VALUES_CACHE && this.values != null) {
            return this.values
        }

        // console.log("loading values")

        try {
            await this.loadDatabase()
        } catch (e) {
            this.db = null
            if (e === false) {
                // console.log(
                //     `SQLite db is missing ${this.run.experimentName} : ${this.run.info.uuid}`)
            } else {
                console.log(
                    `SQLite connect failed ${this.run.name} : ${this.run.uuid}`,
                    e)
            }
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
                this.run.name,
                this.run.uuid,
                e
            )
            return {}
        }

        for (let [k, ind] of Object.entries(indicators.indicators)) {
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
        // let lab = new Lab(this.run.info.python_file)
        // await lab.load()
        //
        // return lab
        return LAB
    }

    async remove() {
        let path = PATH.join(
            LAB.experiments,
            this.run.name,
            this.run.uuid
        )
        await rmtree(path)
        let analytics = PATH.join(
            LAB.analytics,
            this.run.name,
            this.run.uuid
        )
        await rmtree(analytics)
    }

    async update(data: { [key: string]: string }) {
        let name: string = null
        if (data['name'] != null) {
            name = data['name']
        }

        let path = PATH.join(
            LAB.experiments,
            this.run.name,
            this.run.uuid,
            'run.yaml'
        )
        let contents = await readFile(path)
        let run: RunModel = YAML.parse(contents)
        run = Run.fixRunModel(this.run.name, run)

        for (let k in data) {
            if (UPDATABLE_KEYS.has(k)) {
                run[k] = data[k]
            }
        }

        await writeFile(path, YAML.stringify(run))

        if (name != null) {
            await this.rename(name)
        }
    }

    async rename(name) {
        let oldPath = PATH.join(
            LAB.experiments,
            this.run.name,
            this.run.uuid
        )

        let folder = PATH.join(
            LAB.experiments,
            name,
        )

        let newPath = PATH.join(
            LAB.experiments,
            name,
            this.run.uuid
        )

        if (!await exists(folder)) {
            await mkdir(folder, {recursive: true})
        }

        await rename(oldPath, newPath)
        ExperimentsFactory.cacheReset(this.run.uuid)
    }

    async cleanupCheckpoints() {
        let path = PATH.join(
            LAB.experiments,
            this.run.name,
            this.run.uuid,
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
