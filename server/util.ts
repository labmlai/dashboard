import * as UTIL from 'util'
import * as FS from 'fs'
import {MakeDirectoryOptions} from 'fs'
import * as PATH from 'path'
import exp = require("constants");
import * as sqlite3 from 'sqlite3'

export let readdir = UTIL.promisify(FS.readdir)

export function readFile(path: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        FS.readFile(path, {flag: 'r', encoding: 'utf-8'}, (err, contents) => {
            if (err != null) {
                reject(err)
            } else {
                resolve(contents)
            }
        })
    })
}

export function writeFile(path: string, content: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        FS.writeFile(path, content, {flag: 'w', encoding: 'utf-8'}, () => {
            resolve()
        })
    })
}

export let lstat = UTIL.promisify(FS.lstat)
let unlink = UTIL.promisify(FS.unlink)
let rmdir = UTIL.promisify(FS.rmdir)

export function mkdir(path: string, options: MakeDirectoryOptions | null = null): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        FS.mkdir(path, options, (err) => {
            if (err != null) {
                reject(err)
            } else {
                resolve()
            }
        })
    })
}

export let copyFile = UTIL.promisify(FS.copyFile)
export let symlink = UTIL.promisify(FS.symlink)

export async function rename(oldPath: string, newPath: string) {
    return new Promise<void>(((resolve, reject) => {
        FS.rename(oldPath, newPath, (err) => {
            if (err != null) {
                reject(err)
            } else {
                resolve()
            }
        })
    }))
}

export async function exists(path: string) {
    try {
        await lstat(path)
    } catch (e) {
        return false
    }

    return true
}

export async function safeRemove(path: string): Promise<void> {
    if (!await exists(path)) {
        return
    }

    await unlink(path)
}


export async function rmtree(path: string) {
    let stats: FS.Stats

    try {
        stats = await lstat(path)
    } catch (e) {
        return
    }

    if (stats.isDirectory()) {
        let files = await readdir(path)
        for (let f of files) {
            await rmtree(PATH.join(path, f))
        }
        await rmdir(path)
    } else {
        await unlink(path)
    }
}

export async function getDiskUsage(path: string): Promise<number> {
    let stats: FS.Stats

    try {
        stats = await lstat(path)
    } catch (e) {
        return 0
    }

    if (stats.isDirectory()) {
        let files = await readdir(path)
        let size = 0
        for (let f of files) {
            size += await getDiskUsage(PATH.join(path, f))
        }
        return size
    } else {
        return stats.size
    }
}

export async function sqliteRun(db: sqlite3.Database, sql: string) {
    return new Promise(((resolve, reject) => {
        db.run(sql, (res, err) => {
            if (err) {
                reject(err)
            } else {
                resolve(res)
            }
        })
    }))
}

export async function sqliteClose(db: sqlite3.Database) {
    return new Promise(((resolve, reject) => {
        db.close(err => {
            if (err) {
                reject(err)
            } else {
                resolve()
            }
        })
    }))
}