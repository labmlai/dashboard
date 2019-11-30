import { NodeHttpServerPort } from "./io_node"
import {IOResponse} from "./io"
import * as URL from "url"
import * as PATH from "path"
import * as FS from "fs"
import * as HTTP from "http"

let server = new NodeHttpServerPort(8082, null, true)
server.handleRequest = function handleRequest(req: HTTP.IncomingMessage, res: HTTP.ServerResponse) {
    let url = URL.parse(req.url)
    if (url.pathname === '/api') {
        return false;
    }
    let path = url.pathname;

    if ((path.indexOf('/')) === 0) {
        path = path.substr('/'.length);
    }

    if (path.length > 0 && path[0] === '.') {
        res.writeHead(403)
        res.end()
    }

    if (path === '') {
        path = 'index.html';
    }

    console.log(path)
    let ext = PATH.extname(path);
    path = PATH.join('/Users/varuna/ml/lab_dashboard/ui/out', path);
    FS.readFile(path, function(err, content) {
      if (err != null) {
        res.writeHead(404)
        res.end()
      } else {
        res.writeHead(200, {
          'Content-Type': getContentType(ext),
          'Content-Length': content.length
        });
        return res.end(content, 'utf-8');
      }
    })

    return true
}

server.on('getExperiments', (data, packet, response) => {
  console.log('getExperiments')
  console.log(data)
  console.log(packet)
  response.success("done!!")
})

server.listen()

let CONTENT_TYPES = {
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.html': 'text/html'
}

function getContentType(ext) {
    let type = CONTENT_TYPES[ext]
    if (type == null)
        return 'text/plain'
    else
        return type
}
