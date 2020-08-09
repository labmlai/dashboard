import {ROUTER, SCREEN} from "../app";
import {ScreenView} from "../screen";
import {Weya as $, WeyaElement} from '../../lib/weya/weya'
import {d3} from "../d3"

class ChartView implements ScreenView {
    elem: HTMLElement

    render(): WeyaElement {
        let bars = [50, 20, 100, 200, 30]
        let xScale = d3.scaleLinear().domain([0, 5]).range([0, 250])
        let axis = d3.axisBottom()
            .scale(xScale)
            .ticks(5)
        let axisElem: SVGGElement
        this.elem = <HTMLElement>$("div.chart", $ => {
            $('svg', {width: 252, height: 280}, $ => {
                $('g', {transform: 'translate(2, 245)'}, $ => {
                    for (let i = 0; i < bars.length; ++i) {
                        $('g', {transform: `translate(${xScale(i)}, 0)`}, $ => {
                            $('rect', {y: -bars[i], width: 40, height: bars[i], fill: 'red'})
                        })
                    }
                })
                axisElem = <SVGGElement>$('g', {transform: 'translate(2, 250)'})
            })
        })

        d3.select(axisElem)
            .append('g')
            .call(axis)

        return this.elem
    }
}

export class SampleChartHandler {
    constructor() {
        ROUTER.route('chart/sample', [this.handleSampleChart])
    }

    handleSampleChart = () => {
        SCREEN.setView(new ChartView())
    }
}
