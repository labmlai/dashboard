import * as PROCESS from 'process'
import {spawn} from "child_process"


export function openBrowser(url: string) {
    url = encodeURI(url)
    let command: string

    if (PROCESS.platform === 'darwin') {
        command = 'open'
    } else if (PROCESS.platform === 'linux') {
        command = 'xdg-open'
    }

    const subprocess = spawn(command, [url])

    subprocess.unref()

    return subprocess
}
