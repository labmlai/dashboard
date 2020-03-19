import * as YAML from 'yaml'
import * as PATH from 'path'
import {Experiment, Experiments, Run, RunModel} from '../../common/experiments'
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
    private readonly experimentName: string;
    private readonly runUuid: string;

    constructor(experimentName: string, runUuid: string) {
        super();
        this.experimentName = experimentName;
        this.runUuid = runUuid;
    }

    private getMaxStep(run: RunModel) {
        let maxStep = 0
        for (let k in run.values) {
            let value = run.values[k]
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
            PATH.join(LAB.experiments, this.experimentName, this.runUuid, 'run.yaml'),
        )
        let res: RunModel = YAML.parse(contents)
        res = Run.fixRunModel(this.experimentName, res)

        res.uuid = this.runUuid
        res.checkpoints_size = await getDiskUsage(
            PATH.join(LAB.experiments, this.experimentName, this.runUuid, 'checkpoints')
        )
        res.tensorboard_size = await getDiskUsage(
            PATH.join(LAB.experiments, this.experimentName, this.runUuid, 'tensorboard')
        )
        res.sqlite_size = await getDiskUsage(
            PATH.join(LAB.experiments, this.experimentName, this.runUuid, 'sqlite.db')
        )
        res.analytics_size = await getDiskUsage(
            PATH.join(LAB.analytics, this.experimentName, this.runUuid)
        )

        let run = RunNodeJS.create(new Run(this.experimentName, res))
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
        for (let e in loaded) {
            if (original[e] == null) {
                return true
            }
            for (let r in loaded[e].keys()) {
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
    runs: { [name: string]: { [runUUID: string]: RunModelCacheEntry } }

    constructor() {
        this.experimentRunsSet = new ExperimentRunsSetCacheEntry()
        this.runs = {}
    }

    async getRun(experimentName: string, runUuid: string): Promise<RunModel> {
        if (this.runs[experimentName] == null) {
            this.runs[experimentName] = {}
        }
        if (this.runs[experimentName][runUuid] == null) {
            this.runs[experimentName][runUuid] = new RunModelCacheEntry(experimentName, runUuid)
        }

        return await this.runs[experimentName][runUuid].get()
    }

    async getExperiment(name: string): Promise<Experiment> {
        let promises: Promise<RunModel>[] = []

        for (let r of (await this.experimentRunsSet.get())[name].keys()) {
            promises.push(this.getRun(name, r))
        }
        let data: RunModel[] = await Promise.all(promises)
        return new Experiment({name: name, runs: data})
    }

    async getAll(): Promise<Experiments> {
        let promises: Promise<Experiment>[] = []

        for (let e in await this.experimentRunsSet.get()) {
            promises.push(this.getExperiment(e))
        }
        let experimentsList = await Promise.all(promises)

        let experiments = {}
        for (let e of experimentsList) {
            experiments[e.name] = e
        }

        return new Experiments(experiments)
    }

    resetRun(experimentName: string, runUuid: string) {
        if (this.runs[experimentName] != null && this.runs[experimentName][runUuid] != null) {
            // console.log('resetCache', experimentName, runUuid)
            this.runs[experimentName][runUuid].reset()
        }
        this.experimentRunsSet.reset()
    }
}

const _CACHE = new Cache()

class ExperimentsFactory {
    static async loadExperiment(name: string): Promise<Experiment> {
        return await _CACHE.getExperiment(name)
    }

    static async load(): Promise<Experiments> {
        return await _CACHE.getAll()
    }

    static cacheReset(experimentName: string, runUuid: string) {
        // console.log('reset', experimentName, runUuid)
        _CACHE.resetRun(experimentName, runUuid)
    }
}

export {ExperimentsFactory}
