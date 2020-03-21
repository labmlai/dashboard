import * as UTIL from 'util'
import * as FS from 'fs'
import * as PATH from 'path'
import {MakeDirectoryOptions} from "fs";

export let exists = UTIL.promisify(FS.exists)
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

export async function rmtree(path: string) {

    if (!(await exists(path))) {
        return
    }

    let stats = await lstat(path)

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
    if (!(await exists(path))) {
        return 0
    }

    let stats = await lstat(path)

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
