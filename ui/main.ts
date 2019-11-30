import {Weya as $ } from "./weya"
import {AjaxHttpPort} from "./io_ajax"

$('div', document.body, $ => {
    $('p', "Hello")
})

let port = new AjaxHttpPort("http", "localhost", 8082, '/api')
port.send('getExperiments', null, (data, options) => {
    console.log('ppp', data, options)
})