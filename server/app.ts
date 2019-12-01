import { IOResponse, CallPacket, Data } from "./io"
import { ExperimentsFactory } from "./experiments_loader"
import { SERVER } from "./server"
import { Tensorboard } from "./tensorboard"

let TENSORBOARD: Tensorboard = null

async function handleGetExperiments(data: Data, packet: CallPacket, response: IOResponse) {
  console.log('getExperiments', data, packet)
  let experiments = await ExperimentsFactory.load()
  response.success(experiments.toJSON())
}

async function handleGetIndicators(data: Data, packet: CallPacket, response: IOResponse) {
  console.log('getIndicators', data, packet)
  let getIndicators = await ExperimentsFactory.loadIndicators(data.experimentName, data.runIndex)
  response.success(getIndicators.toJSON())
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

SERVER.on('launchTensorboard', (data, packet, response) => {
  handleLaunchTensorboard(data, packet, response)
})

SERVER.listen()
