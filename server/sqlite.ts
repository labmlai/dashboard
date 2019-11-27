import * as sqlite3 from "sqlite3"
let sqlite = sqlite3.verbose()
let dbPath = '/Users/varuna/ml/lab3/logs/mnist_pytorch/data.sqlite'
// console.log(sqlite)

let db = new sqlite.Database(dbPath, (err) => {
    console.log(err)
})

let sql = `SELECT * FROM scalars`

db.all(sql, [], (err, rows) => {
    console.log(err)
    console.log(rows)
    getCurrentStep()
})

function getCurrentStep() {
    db.all('SELECT MAX(step) FROM scalars', [], (err, rows) => {
        console.log(err)
        console.log(rows)
        setTimeout(getCurrentStep, 300)
    })
}
