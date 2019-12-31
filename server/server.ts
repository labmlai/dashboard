import { NodeHttpServerPort } from "./io/node"
import { StaticServer } from "./io/static"

let SERVER = new NodeHttpServerPort(8082, null, true)
let STATIC_SERVER = new StaticServer('/Users/varuna/ml/lab_dashboard/ui/out', new Set(['/api']))
SERVER.handleRequest = STATIC_SERVER.handleRequest

export { SERVER, STATIC_SERVER }
