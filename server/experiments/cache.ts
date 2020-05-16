import * as YAML from 'yaml'
import * as PATH from 'path'
import {Run, RunCollection, RunModel} from '../../common/experiments'
import {LAB} from '../consts'
import {getDiskUsage, readdir, readFile} from '../util'
import {RunNodeJS} from "../run_nodejs";

abstract class CacheEntry<T> {
    private lastLoaded: number
    private readonly minDelay: number = 5 * 1_000 // 5 seconds
    protected readonly maxDelay: number = 2 * 60 * 60 * 1_000 // 2 hours
    private readonly exponentialFactor: number = 1.5
    private delay: number
    protected cached: T

    protected constructor() {
        this.lastLoaded = 0
        this.delay = this.minDelay
    }

    protected abstract async load(): Promise<T>

    protected abstract isUpdated(original: T, loaded: T): boolean

    async get(): Promise<T> {
        let now = (new Date()).getTime()
        if (this.cached == null || this.lastLoaded + this.delay < now) {
            let loaded = await this.load()
            if (this.cached == null || this.isUpdated(this.cached, loaded)) {
                this.delay = Math.max(this.minDelay, this.delay / this.exponentialFactor)
                // console.log("Reduced checking time to ", this.delay)
            } else {
                this.delay = Math.min(this.maxDelay, this.delay * this.exponentialFactor)
                // console.log("Extended checking time to ", this.delay)
            }
            this.cached = loaded

            this.lastLoaded = now
        }

        return this.cached
    }

    reset() {
        this.cached = null
    }
}

class RunModelCacheEntry extends CacheEntry<RunModel> {
    private readonly name: string;
    private readonly uuid: string;

    constructor(name: string, uuid: string) {
        super();
        this.name = name;
        this.uuid = uuid;
    }

    private getMaxStep(run: RunModel) {
        let maxStep = 0
        for (let [k, value] of Object.entries(run.values)) {
            maxStep = Math.max(maxStep, value.step)
        }

        return maxStep
    }

    protected isUpdated(original: RunModel, loaded: RunModel): boolean {
        return this.getMaxStep(original) !== this.getMaxStep(loaded)
    }

    protected async load(): Promise<RunModel> {
        // console.log("loaded", this.experimentName, this.runUuid)
        let contents = await readFile(
            PATH.join(LAB.experiments, this.name, this.uuid, 'run.yaml'),
        )
        let res: RunModel = YAML.parse(contents)
        res.name = this.name
        res = Run.fixRunModel(res)

        res.uuid = this.uuid
        res.checkpoints_size = await getDiskUsage(
            PATH.join(LAB.experiments, this.name, this.uuid, 'checkpoints')
        )
        res.tensorboard_size = await getDiskUsage(
            PATH.join(LAB.experiments, this.name, this.uuid, 'tensorboard')
        )
        res.sqlite_size = await getDiskUsage(
            PATH.join(LAB.experiments, this.name, this.uuid, 'sqlite.db')
        )
        res.analytics_size = await getDiskUsage(
            PATH.join(LAB.analytics, this.name, this.uuid)
        )

        let run = RunNodeJS.create(new Run(res))
        res.values = await run.getValues()
        res.configs = (await run.getConfigs()).configs

        return res
    }
}

interface ExperimentRunsSet {
    [name: string]: Set<string>
}


class ExperimentRunsSetCacheEntry extends CacheEntry<ExperimentRunsSet> {
    protected readonly maxDelay: number = 30 * 1_000

    constructor() {
        super()
    }

    protected isUpdated(original: ExperimentRunsSet, loaded: ExperimentRunsSet): boolean {
        for (let [e, runs] of Object.entries(loaded)) {
            if (runs == null) {
                return true
            }
            for (let r of runs.keys()) {
                if (original[e][r] == null) {
                    return true
                }
            }
        }

        return false
    }

    protected async load(): Promise<ExperimentRunsSet> {
        let experiments = await readdir(LAB.experiments)
        let res: ExperimentRunsSet = {}

        for (let e of experiments) {
            res[e] = new Set<string>(await readdir(PATH.join(LAB.experiments, e)))
        }

        return res
    }
}

class Cache {
    experimentRunsSet: ExperimentRunsSetCacheEntry
    runs: { [uuid: string]: RunModelCacheEntry }

    constructor() {
        this.experimentRunsSet = new ExperimentRunsSetCacheEntry()
        this.runs = {}
    }

    async getRun(uuid: string): Promise<RunModel> {
        if (this.runs[uuid] == null) {
            let expSet = await this.experimentRunsSet.get()
            for (let [expName, runs] of Object.entries(expSet)) {
                if (runs.has(uuid)) {
                    this.runs[uuid] = new RunModelCacheEntry(expName, uuid)
                }
            }
        }
        return await this.runs[uuid].get()
    }

    private async getExperiment(name: string): Promise<Promise<RunModel>[]> {
        let promises: Promise<RunModel>[] = []

        for (let r of (await this.experimentRunsSet.get())[name].keys()) {
            promises.push(this.getRun(r))
        }
        return promises
    }

    async getAll(): Promise<RunCollection> {
        let promises: Promise<RunModel>[] = []

        for (let e of Object.keys(await this.experimentRunsSet.get())) {
            promises = promises.concat(await this.getExperiment(e))
        }
        let runs = await Promise.all(promises)

        return new RunCollection(runs)
    }

    resetRun(uuid: string) {
        if (this.runs[uuid] != null) {
            // console.log('resetCache', experimentName, runUuid)
            this.runs[uuid].reset()
        }
        this.experimentRunsSet.reset()
    }
}

const _CACHE = new Cache()

class ExperimentsFactory {
    static async load(): Promise<RunCollection> {
        return await _CACHE.getAll()
    }

    static cacheReset(uuid: string) {
        // console.log('reset', experimentName, runUuid)
        _CACHE.resetRun(uuid)
    }
}

export {ExperimentsFactory}
