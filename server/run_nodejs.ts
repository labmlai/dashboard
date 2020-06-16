import * as sqlite3 from 'sqlite3'
import {Configs, Indicators, Run, RunModel, ScalarsModel} from '../common/experiments'
import * as PATH from 'path'
import * as YAML from 'yaml'
import {LAB} from './consts'
import {
    exists,
    mkdir,
    readdir,
    readFile,
    rename,
    rmtree,
    safeRemove,
    sqliteClose, sqliteRun,
    writeFile
} from './util'
import {ExperimentsFactory} from "./experiments/cache";

const UPDATABLE_KEYS = new Set(['comment', 'notes', 'tags'])
const USE_CACHE = true
const USE_VALUES_CACHE = false

interface ArtifactFilename {
    step: number
    filename: string
}

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
                    this.db = null
                    return reject(false)
                }
                this.db = new sqlite3.Database(path, sqlite3.OPEN_READONLY, (err: any) => {
                    if (err) {
                        console.log(
                            `SQLite connect failed ${this.run.name} : ${this.run.uuid}`,
                            err)
                        this.db = null
                        reject(err)
                    } else {
                        resolve()
                    }
                })
            })
        })
    }

    private collectLastValue(to_collect: string[]): Promise<any> {
        for (let i = 0; i < to_collect.length; ++i) {
            to_collect[i] = `"${to_collect[i]}"`
        }
        let sql = `SELECT a.* FROM scalars AS a
            INNER JOIN (
                SELECT indicator, MAX(step) AS step 
                FROM scalars
                WHERE indicator IN (${to_collect.join(',')})
                GROUP BY indicator
            ) b ON a.indicator = b.indicator AND a.step = b.step`

        return new Promise((resolve, reject) => {
            this.db.all(sql, (err, rows) => {
                if (err) {
                    reject(err)
                } else {
                    let values = {}
                    for (let row of rows) {
                        values[row.indicator] = row
                    }

                    resolve(values)
                }
            })
        })
    }

    private getLastStep(): Promise<any> {
        let sql = `SELECT MAX(step) as step FROM scalars`

        return new Promise((resolve, reject) => {
            this.db.all(sql, (err, rows) => {
                if (err) {
                    reject(err)
                } else {
                    let step = 0
                    for (let row of rows) {
                        step = row.step
                    }

                    resolve(step)
                }
            })
        })
    }

    private async migrateIndicatorsToSingleFile(): Promise<void> {
        console.log("Migrating indicators to a single file: ", this.run.name, this.run.uuid)
        let indicatorsFile = PATH.join(
            LAB.experiments,
            this.run.name,
            this.run.uuid,
            'indicators.yaml')
        let artifactsFile = PATH.join(
            LAB.experiments,
            this.run.name,
            this.run.uuid,
            'artifacts.yaml')

        let indicators
        try {
            indicators = YAML.parse(await readFile(indicatorsFile))
        } catch (e) {
            indicators = {}
        }

        let artifacts
        try {
            artifacts = YAML.parse(await readFile(artifactsFile))
        } catch (e) {
            artifacts = {}
        }

        for (let [k, v] of Object.entries(artifacts)) {
            indicators[k] = v
        }

        await writeFile(indicatorsFile, YAML.stringify({'indicators': indicators}))
        await safeRemove(artifactsFile)
    }

    async getIndicators(): Promise<Indicators> {
        // TODO: Caching
        if (!USE_CACHE || this.indicators == null) {
            let contents = YAML.parse(await readFile(
                PATH.join(
                    LAB.experiments,
                    this.run.name,
                    this.run.uuid,
                    'indicators.yaml'
                )))
            if (contents['indicators'] == null) {
                await this.migrateIndicatorsToSingleFile()

                try {
                    return this.getIndicators()
                } catch (e) {
                    this.indicators = new Indicators({})
                    return this.indicators
                }
            }

            this.indicators = new Indicators(contents['indicators'])
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
                const doc = YAML.parseDocument(contents);
                if (doc.errors.length > 0) {
                    throw doc.errors[0];
                }
                let configs = doc.toJSON();
                this.configs = new Configs(doc.toJSON())
                // this.configs = new Configs(YAML.parse(contents))
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
            return {}
        }
        let indicators = await this.getIndicators()

        let to_collect = []
        for (let ind of Object.values(indicators.indicators)) {
            if (ind.class_name == null) {
                continue
            }
            let key =
                ind.class_name.indexOf('Scalar') !== -1
                    ? ind.name
                    : `${ind.name}.mean`
            if (ind.is_print) {
                to_collect.push(key)
            }
        }

        let values = {}
        try {
            values = await this.collectLastValue(to_collect)
        } catch (e) {
            console.log(
                'Could not read from SQLite db',
                this.run.name,
                this.run.uuid,
                e
            )
            return {}
        }

        this.values = values
        values['step'] = await this.getLastStep()
        return values
    }

    async getLab() {
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

    private getArtifactFiles(): Promise<{ [name: string]: ArtifactFilename[] }> {
        let sql = 'SELECT indicator, step, filename FROM tensors'

        return new Promise((resolve, reject) => {
            this.db.all(sql, (err, rows) => {
                    if (err) {
                        reject(err)
                    } else {
                        let files: { [name: string]: ArtifactFilename[] } = {}
                        for (let row of rows) {
                            if (files[row.indicator] == null) {
                                files[row.indicator] = []
                            }
                            files[row.indicator].push({
                                step: row.step,
                                filename: row.filename
                            })
                        }

                        resolve(files)
                    }
                }
            )
        })
    }

    async cleanupArtifacts() {
        try {
            await this.loadDatabase()
        } catch (e) {
            return
        }


        let files = await this.getArtifactFiles()
        let stepsCount = {}
        let indicatorsCount = 0

        for (let fileList of Object.values(files)) {
            for (let file of fileList) {
                if (stepsCount[file.step] == null) {
                    stepsCount[file.step] = 0
                }
                stepsCount[file.step]++
            }
            indicatorsCount++
        }

        let steps = []
        for (let [s, c] of Object.entries(stepsCount)) {
            if (c === indicatorsCount) {
                steps.push(parseInt(s))
            }
        }

        steps.sort((a, b) => {
            return a - b
        })

        if (steps.length == 0) {
            return await this.removeArtifactsExcept(files, steps)
        }

        let last = steps[steps.length - 1]
        let interval = Math.max(1, Math.floor(last / 99))
        let condensed = [steps[0]]

        for (let i = 1; i < steps.length; ++i) {
            let s = steps[i]
            if (s - condensed[condensed.length - 1] >= interval) {
                condensed.push(s)
            }
        }

        if (last != condensed[condensed.length - 1]) {
            condensed.push(last)
        }

        return await this.removeArtifactsExcept(files, condensed)
    }

    private async removeArtifactsExcept(files: { [name: string]: ArtifactFilename[] },
                                        steps: number[]) {
        let stepSet = new Set()
        for (let s of steps) {
            stepSet.add(s)
        }
        let path = PATH.join(
            LAB.experiments,
            this.run.name,
            this.run.uuid,
            'sqlite.db'
        )

        let db: sqlite3.Database = await new Promise(((resolve, reject) => {
            let db = new sqlite3.Database(path, sqlite3.OPEN_READWRITE, (err: any) => {
                if (err) {
                    console.log(
                        `SQLite connect failed ${this.run.name} : ${this.run.uuid}`,
                        err)
                    this.db = null
                    reject(err)
                } else {
                    resolve(db)
                }
            })
        }))

        console.log('Cleaning up artifacts', (new Date()).getTime())
        db.run('BEGIN TRANSACTION')
        let promises = []
        for (let [name, fileList] of Object.entries(files)) {
            for (let file of fileList) {
                if (stepSet.has(file.step)) {
                    continue
                }

                let path = PATH.join(
                    LAB.experiments,
                    this.run.name,
                    this.run.uuid,
                    'artifacts',
                    file.filename
                )

                promises.push(safeRemove(path))
                let sql = 'DELETE FROM tensors WHERE indicator = ? AND step = ?'
                db.run(sql, name, file.step)
            }
        }

        console.log('Committing', (new Date()).getTime())
        await sqliteRun(db, 'COMMIT')
        console.log("Closing db", (new Date()).getTime())
        try {
            await sqliteClose(db)
        } catch (err) {
            console.log('Error closing db', this.run.uuid)
        }
        console.log('Deleting files', promises.length, (new Date()).getTime())
        await Promise.all(promises)
        console.log('Deleted files', (new Date()).getTime())
    }
}
