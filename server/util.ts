import * as PATH from "path"
import * as UTIL from "util"
import * as FS from "fs"

export async function rmtree(path: string) {
    let exists = UTIL.promisify(FS.exists)
    let lstat = UTIL.promisify(FS.lstat)
    let unlink = UTIL.promisify(FS.unlink)
    let readdir = UTIL.promisify(FS.readdir)

    if (!(await exists(path))) {
        return
    }

    let stats = await lstat(path)

    if (stats.isDirectory()) {
        let files = await readdir(path)
        for (let f of files) {
            await rmtree(f)
        }

    }
    
    await unlink(path)
};