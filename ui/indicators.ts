import { Weya as $ } from '../lib/weya/weya'
import { ScalarsModel, Indicators } from '../common/experiments'
import { InfoList } from './view_components/info_list'
import { formatScalar, formatInt } from './view_components/format'

export function renderValues(elem: HTMLElement, values: ScalarsModel) {
    $(elem, $ => {
        let maxStep = 0
        for (let [k, v] of Object.entries(values)) {
            new InfoList(
                [
                    ['.key', k],
                    ['.value', formatScalar(v.value)]
                ],
                '.mono'
            ).render($)
            maxStep = Math.max(v.step, maxStep)
        }
        new InfoList(
            [
                ['.key', 'step'],
                ['.value', formatInt(maxStep)]
            ],
            '.mono'
        ).render($)
    })
}

export function renderIndicators(elem: HTMLElement, indicators: Indicators) {
    let inds = indicators.indicators

    $(elem, $ => {
        for (let [k, ind] of Object.entries(inds)) {
            new InfoList([
                ['.key', k],
                ['.value', `${ind.class_name}`]
            ]).render($)
        }
    })
}
