import { SERVER } from './server'
import { LAB } from './consts'
import { listenAPI } from '../common/api_handler'
import { API } from './api_server'

listenAPI(SERVER, API)

LAB.load().then(() => {
    console.log(`http://localhost:${SERVER.port}`)
    console.log(LAB.path)
    SERVER.listen()
})
