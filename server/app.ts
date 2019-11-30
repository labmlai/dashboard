import { IOResponse, CallPacket, Data } from "./io"
import { ExperimentsFactory } from "./experiments_loader"
import { SERVER } from "./server"


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

SERVER.on('getExperiments', (data, packet, response) => {
  handleGetExperiments(data, packet, response)
})

SERVER.on('getIndicators', (data, packet, response) => {
  handleGetIndicators(data, packet, response)
})

SERVER.listen()
