import { IOResponse, CallPacket, Data } from "./io"
import { Experiments } from "./experiments"
import { SERVER } from "./server"

let EXPERIMENTS = new Experiments()

async function handleGetExperiments(data: Data, packet: CallPacket, response: IOResponse) {
  console.log('getExperiments', data, packet)
  await EXPERIMENTS.load()
  response.success(EXPERIMENTS.toJSON())
}

SERVER.on('getExperiments', (data, packet, response) => {
  handleGetExperiments(data, packet, response)
})

SERVER.listen()
