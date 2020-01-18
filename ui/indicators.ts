import { Weya as $ } from "./weya/weya"
import { ScalarsModel, Indicators } from "./experiments"
import { InfoList } from "./view_components/info_list";

export function renderValues(elem: HTMLElement, values: ScalarsModel) {
    $(elem, $ => {
        let maxStep = 0
        for (let k in values) {
            new InfoList([['.key', k],
            ['.value', `${values[k].value}`]], '.highlight.mono').render($)
            maxStep = Math.max(values[k].step, maxStep)
        }
        new InfoList([['.key', 'step'],
        ['.value', `${maxStep}`]], '.highlight.mono').render($)
    })
}


export function renderIndicators(elem: HTMLElement, indicators: Indicators) {
    let inds = indicators.indicators

    $(elem, $ => {
        for (let k in inds) {
            new InfoList([['.key', k],
            ['.value', `${inds[k].class_name}`]]).render($)
        }
    })
}


