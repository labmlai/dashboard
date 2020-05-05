import {ScreenContainer} from './screen'
import {Router} from '../lib/weya/router'
import {AjaxHttpPort} from '../lib/io/ajax'
import {wrapAPI} from "../common/api_handler";
import {API_SPEC} from "../common/api";

export let ROUTER = new Router({
    emulateState: false,
    hashChange: false,
    pushState: true,
    root: '/',
    onerror: e => {
        console.error('Error', e)
    }
})

export let SCREEN = new ScreenContainer()

const protocol = window.location.protocol === 'http:' ? 'http' : 'https'

export let PORT = new AjaxHttpPort(
    protocol,
    window.location.hostname,
    parseInt(window.location.port),
    '/api')

wrapAPI(PORT, API_SPEC)

export const API = API_SPEC