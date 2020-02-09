import { Weya as $ } from '../lib/weya/weya'
import { ScalarsModel, Indicators } from '../common/experiments'
import { InfoList } from './view_components/info_list'
import { formatScalar, formatInt } from './view_components/format'

export function renderValues(elem: HTMLElement, values: ScalarsModel) {
    $(elem, $ => {
        let maxStep = 0
        for (let k in values) {
            new InfoList(
                [
                    ['.key', k],
                    ['.value', formatScalar(values[k].value)]
                ],
                '.highlight.mono'
            ).render($)
            maxStep = Math.max(values[k].step, maxStep)
        }
        new InfoList(
            [
                ['.key', 'step'],
                ['.value', formatInt(maxStep)]
            ],
            '.highlight.mono'
        ).render($)
    })
}

export function renderIndicators(elem: HTMLElement, indicators: Indicators) {
    let inds = indicators.indicators

    $(elem, $ => {
        for (let k in inds) {
            new InfoList([
                ['.key', k],
                ['.value', `${inds[k].class_name}`]
            ]).render($)
        }
    })
}
