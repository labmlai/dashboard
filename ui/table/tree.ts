import {RunUI} from "../run_ui";

interface RunNode {
    run: RunUI,
    children: RunNode[]
}


export class RunsTree {
    private readonly runs: RunUI[];
    private readonly tree: RunNode[]
    private readonly fullMap: { [p: string]: RunUI }
    private readonly treeMap: { [p: string]: RunNode }

    constructor(allRuns: RunUI[], runs: RunUI[]) {
        this.runs = runs;
        this.fullMap = RunsTree.getRunIndexes(allRuns)
        this.treeMap = {}
        this.tree = []
    }

    private static getRunIndexes(runs: RunUI[]): { [p: string]: RunUI } {
        let indexes = {}

        for (let runUI of runs) {
            let r = runUI.run
            indexes[r.uuid] = runUI
        }

        return indexes
    }

    getList() {
        this.buildTree()

        let runs: RunUI[] = []

        for (let node of this.tree) {
            runs = runs.concat(this.nodeToList(node))
        }

        return runs
    }

    private getParent(run: RunUI): RunUI {
        let uuid = run.run.load_run
        if (uuid == null) {
            return null
        }
        return this.fullMap[uuid]
    }

    private addRun(run: RunUI) {
        let uuid = run.run.uuid
        if (this.treeMap[uuid] != null) {
            return
        }

        let parentRun = this.getParent(run)
        let node = {run: run, children: []}

        if (parentRun == null) {
            run.generations = 0
            this.tree.push(node)
        } else {
            run.generations = parentRun.generations + 1
            parentRun.children++
            this.addRun(parentRun)
            this.treeMap[parentRun.run.uuid].children.push(node)
        }

        this.treeMap[uuid] = node
    }

    private buildTree() {
        for (let run of this.runs) {
            this.addRun(run)
        }
    }

    private nodeToList(node: RunNode): RunUI[] {
        let runs = [node.run]

        for (let r of node.children) {
            runs = runs.concat(this.nodeToList(r))
        }

        return runs
    }
}