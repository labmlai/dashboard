import { IOResponse, CallPacket, Data } from './io/io'
import { ExperimentsFactory } from './experiments_loader'
import { SERVER } from './server'
import { Tensorboard } from './tensorboard'
import { RunNodeJS } from './run_nodejs'
import { Jupyter } from './jupyter'
import { LAB } from './consts'
import { listenAPI } from './api_listener'
import { API } from './api_server'

listenAPI(SERVER, API)

LAB.load().then(() => {
    console.log(`http://localhost:${SERVER.port}`)
    console.log(LAB.path)
    SERVER.listen()
})
