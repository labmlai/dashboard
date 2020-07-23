import {ROUTER, SCREEN} from "../app";
import {ScreenView} from "../screen";
import {Weya as $, WeyaElement} from '../../lib/weya/weya'

class ChartView implements ScreenView {
    elem: HTMLElement

    render(): WeyaElement {
        let bars = [50, 20, 100, 200, 30]
        this.elem = <HTMLElement>$("div.chart", $ => {
            $('svg', {width: 250, height: 250}, $ => {
                $('g', {transform: 'translate(2, 248)'}, $ => {
                    for (let i = 0; i < bars.length; ++i) {
                        $('g', {transform: `translate(${i * 50}, 0)`}, $ => {
                            $('rect', {y: -bars[i], width: 40, height: bars[i], fill: 'red'})
                        })
                    }
                })
            })
        })

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
