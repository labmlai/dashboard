import * as sqlite3 from "sqlite3"
import { Run } from "./experiments"
let sqlite = sqlite3.verbose()
import * as PATH from "path"
import * as UTIL from "util"
import { EXPERIMENTS_FOLDER } from "./consts"

export class RunSQLite {
    run: Run
    db: sqlite3.Database

    constructor(run: Run) {
        this.run = run
    }

    loadDatabase(): Promise<void> {
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

    getMaxStep(): Promise<number> {
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

    async getValues() {
        await this.loadDatabase()
        return await this.getMaxStep()
    }
}

// let dbPath = '/Users/varuna/ml/lab3/logs/mnist_pytorch/data.sqlite'
// // console.log(sqlite)

// let db = new sqlite.Database(dbPath, (err) => {
//     console.log(err)
// })

// let sql = `SELECT * FROM scalars`

// db.all(sql, [], (err, rows) => {
//     // console.log(err)
//     // console.log(rows)
//     db.all('SELECT * FROM indicators', [], (err, rows) => {
//         console.log(err)
//         console.log(rows)
//         getCurrentStep()
//     })
// })

// /* It will connect to db during query if the DB didn't exist before */
// function getCurrentStep() {
//     db.all('SELECT MAX(step) FROM scalars', [], (err, rows) => {
//         console.log(err)
//         console.log(rows)
//         setTimeout(getCurrentStep, 300)
//     })
// }
