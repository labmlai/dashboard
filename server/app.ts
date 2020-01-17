import { IOResponse, CallPacket, Data } from "./io/io"
import { ExperimentsFactory } from "./experiments_loader"
import * as PROCESS from "process"
import { SERVER } from "./server"
import { Tensorboard } from "./tensorboard"
import { RunNodeJS } from "./run_nodejs"

console.log(`http://localhost:${SERVER.port}`)

let TENSORBOARD: Tensorboard = null

async function handleGetExperiments(data: Data, packet: CallPacket, response: IOResponse) {
  console.log('getExperiments', data, packet)
  let experiments = await ExperimentsFactory.load()
  response.success(experiments.toJSON())
}

async function handleGetIndicators(data: Data, packet: CallPacket, response: IOResponse) {
  console.log('getIndicators', data, packet)
  let experiment = await ExperimentsFactory.loadExperiment(data.experimentName)
  let run = new RunNodeJS(experiment.getRun(data.runIndex))
  let indicators = await run.getIndicators()
  response.success(indicators.toJSON())
}

async function handleGetConfigs(data: Data, packet: CallPacket, response: IOResponse) {
    console.log('getConfigs', data, packet)
    let experiment = await ExperimentsFactory.loadExperiment(data.experimentName)
    let run = new RunNodeJS(experiment.getRun(data.runIndex))
    let configs = await run.getConfigs()
    response.success(configs.toJSON())
  }
  
async function handleGetValues(data: Data, packet: CallPacket, response: IOResponse) {
  console.log('getValues', data, packet)
  let experiment = await ExperimentsFactory.loadExperiment(data.experimentName)
  let run = new RunNodeJS(experiment.getRun(data.runIndex))
  response.success(await run.getValues())
}

async function handleLaunchTensorboard(data: Data, packet: CallPacket, response: IOResponse) {
  console.log('launchTensorboard', data, packet)
  let experiment = await ExperimentsFactory.loadExperiment(data.experimentName)
  let run = experiment.getRun(data.runIndex)
  if(TENSORBOARD != null) {
    TENSORBOARD.stop()
  }
  TENSORBOARD = new Tensorboard([run])
  TENSORBOARD.start()
  response.success(null)
}

SERVER.on('getExperiments', (data, packet, response) => {
  handleGetExperiments(data, packet, response)
})

SERVER.on('getIndicators', (data, packet, response) => {
  handleGetIndicators(data, packet, response)
})

SERVER.on('getConfigs', (data, packet, response) => {
    handleGetConfigs(data, packet, response)
  })
  
SERVER.on('getValues', (data, packet, response) => {
  handleGetValues(data, packet, response)
})

SERVER.on('launchTensorboard', (data, packet, response) => {
  handleLaunchTensorboard(data, packet, response)
})

SERVER.listen()
