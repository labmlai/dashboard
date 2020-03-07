import { ScreenContainer } from './screen'
import { Router } from '../lib/weya/router'
import { AjaxHttpPort } from '../lib/io/ajax'
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

export let PORT = new AjaxHttpPort('http', 'localhost', 8082, '/api')

wrapAPI(PORT, API_SPEC)

export const API = API_SPEC