import * as UTIL from 'util'
import * as FS from 'fs'
import * as PATH from 'path'

export async function rmtree(path: string) {
    let exists = UTIL.promisify(FS.exists)
    let lstat = UTIL.promisify(FS.lstat)
    let unlink = UTIL.promisify(FS.unlink)
    let readdir = UTIL.promisify(FS.readdir)
    let rmdir = UTIL.promisify(FS.rmdir)

    if (!(await exists(path))) {
        return
    }

    let stats = await lstat(path)

    if (stats.isDirectory()) {
        let files = await readdir(path)
        for (let f of files) {
            await rmtree(PATH.join(path, f))
        }
        rmdir(path)
    } else {
        await unlink(path)
    }
}

export async function getDiskUsage(path: string): Promise<number> {
    let exists = UTIL.promisify(FS.exists)
    let lstat = UTIL.promisify(FS.lstat)
    let readdir = UTIL.promisify(FS.readdir)

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
