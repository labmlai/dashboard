/*
import {ScreenView} from './screen'
import {ROUTER, SCREEN} from './app'
import {Weya as $, WeyaElement} from '../lib/weya/weya'
import {Run} from '../common/experiments'
import {getRuns} from './cache'
import {RunsView} from "./experiment_view";

class TagView implements ScreenView {
    elem: HTMLElement
    runs: Run[]
    name: string
    experimentView: HTMLDivElement
    private runsView: RunsView;

    constructor(name: string) {
        this.name = name
    }

    render(): WeyaElement {
        this.elem = <HTMLElement>$('div.container', $ => {
            this.experimentView = <HTMLDivElement>$('div.tag_runs', '')
        })
        this.renderTagRuns().then()
        return this.elem
    }

    private async renderTagRuns() {
        this.runs = (await getRuns()).getByTag(this.name)

        this.experimentView.append(
            $('div.info', $ => {
                $('h1', this.name)
            })
        )

        this.runsView = new RunsView(this.runs, true)
        this.runsView.render(this.experimentView).then()
    }
}

export class TagHandler {
    constructor() {
        ROUTER.route('tag/:name', [this.handleTag])
    }

    handleTag = (name: string) => {
        SCREEN.setView(new TagView(name))
    }
}
*/