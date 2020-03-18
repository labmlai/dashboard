import {SERVER} from './server'
import {LAB} from './consts'
import {listenAPI} from '../common/api_handler'
import {API} from './api_server'
import {openBrowser} from "./browser";

listenAPI(SERVER, API)

LAB.load().then(() => {
    let url = `http://localhost:${SERVER.port}`
    console.log(`Server running at: ${url}`)
    console.log(`Analysing project: ${LAB.path}`)
    SERVER.listen()
    openBrowser(url)
})
