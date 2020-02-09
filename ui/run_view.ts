import { ROUTER, SCREEN } from './app'
import { Weya as $, WeyaElement } from '../lib/weya/weya'
import { Run } from './experiments'
import { getExperiments, clearCache } from './cache'
import { RunUI } from './run_ui'
import { renderConfigs } from './configs'
import { renderValues } from './indicators'
import { InfoList, InfoItem } from './view_components/info_list'
import { formatSize } from './view_components/format'

function wrapEvent(func: Function) {
    function wrapper(e: Event) {
        e.preventDefault()
        e.stopPropagation()

        func()
    }

    return wrapper
}

class RunView {
    run: Run
    runUI: RunUI
    elem: WeyaElement
    tensorboardBtn: HTMLButtonElement
    indicatorsView: HTMLDivElement
    experimentName: string
    runIndex: string
    runView: HTMLDivElement
    configsView: HTMLDivElement
    jupyterBtn: HTMLButtonElement
    analyticsBtns: HTMLDivElement
    commentSpan: HTMLSpanElement
    commentInput: HTMLInputElement

    constructor(experimentName: string, runIndex: string) {
        this.experimentName = experimentName
        this.runIndex = runIndex

        let events = []
        for (let k in this.events) {
            events.push(k)
        }

        for (let k of events) {
            let func = this.events[k]
            this.events[k] = wrapEvent(func)
        }
    }

    render() {
        this.elem = <HTMLElement>$('div.container', $ => {
            this.runView = <HTMLDivElement>$('div.run_single', '')
        })

        this.renderRun()

        return this.elem
    }

    private async renderRun() {
        let experiment = (await getExperiments()).get(this.experimentName)
        this.run = experiment.getRun(this.runIndex)
        this.runUI = RunUI.create(this.run)

        let info = this.run.info
        let comment = info.comment.trim() === '' ? '[comment]' : info.comment
        $(this.runView, $ => {
            $('h1', $ => {
                $('label', `${this.run.experimentName}`)
                $('span', ' - ')
                $('label', `${info.index}`)

                $('span', ': ')
                $('span', $ => {
                    this.commentSpan = <HTMLSpanElement>$('span', comment, {
                        on: { click: this.events.editComment }
                    })
                    this.commentInput = <HTMLInputElement>$('input', {
                        type: 'text',
                        on: {
                            blur: this.events.saveComment,
                            keydown: this.onCommentKeyDown
                        }
                    })
                })
            })

            $(
                'button.small.danger',
                { on: { click: this.events.remove } },
                $ => {
                    $('i.fa.fa-trash')
                    $('span', ' Remove')
                }
            )

            $(
                'button.small.danger',
                { on: { click: this.events.cleanupCheckpoints } },
                $ => {
                    $('i.fa.fa-trash')
                    $('span', ' Cleanup Checkpoints')
                }
            )

            $('div', $ => {
                $('i.fa.fa-history.key_icon')
                $('span', info.commit_message)
            })
            $('div', $ => {
                $('i.fa.fa-calendar.key_icon')
                $('span', info.trial_date)
                $('span.key_split', '')
                $('i.fa.fa-clock.key_icon')
                $('span', info.trial_time)
            })

            $('div.block', $ => {
                let commit_info: InfoItem[] = [
                    ['.key', 'Commit'],
                    ['.value', info.commit]
                ]
                if (info.is_dirty) {
                    commit_info.push([
                        '.link',
                        $ => {
                            $('span', ' ')
                            $('button.small', '[dirty]', {
                                on: { click: this.events.dirty }
                            })
                        }
                    ])
                }
                new InfoList(commit_info, '.mono').render($)

                new InfoList(
                    [
                        ['.key', 'Python File'],
                        ['.value', info.python_file]
                    ],
                    '.mono'
                ).render($)
            })

            $('div.block', $ => {
                $('i.fa.fa-save.key_icon')
                let size =
                    info.sqlite_size +
                    info.analytics_size +
                    info.checkpoints_size +
                    info.tensorboard_size
                $('span', formatSize(size))

                new InfoList(
                    [
                        ['.key', 'Checkpoints'],
                        ['.value', formatSize(info.checkpoints_size)]
                    ],
                    '.mono'
                ).render($)

                new InfoList(
                    [
                        ['.key', 'SQLite'],
                        ['.value', formatSize(info.sqlite_size)]
                    ],
                    '.mono'
                ).render($)

                new InfoList(
                    [
                        ['.key', 'Analytics'],
                        ['.value', formatSize(info.analytics_size)]
                    ],
                    '.mono'
                ).render($)

                new InfoList(
                    [
                        ['.key', 'TensorBoard'],
                        ['.value', formatSize(info.tensorboard_size)]
                    ],
                    '.mono'
                ).render($)
            })

            this.indicatorsView = <HTMLDivElement>$('div.indicators.block')

            this.configsView = <HTMLDivElement>$('div.configs.block')

            this.tensorboardBtn = <HTMLButtonElement>(
                $('button', 'Launch Tensorboard', {
                    on: { click: this.events.tensorboard }
                })
            )

            this.analyticsBtns = <HTMLDivElement>$('div.analytics_buttons')
        })

        this.commentInput.style.display = 'none'

        this.renderIndicators()
        this.renderConfigs()
        this.renderAnalyticsBtns()

        return this.elem
    }

    private events = {
        tensorboard: async () => {
            let url = await this.runUI.launchTensorboard()
            if (url === '') {
                alert("Couldn't start Tensorboard")
            } else {
                window.open(url, '_blank')
            }
        },

        dirty: async () => {
            ROUTER.navigate(
                `/experiment/${this.run.experimentName}/${this.run.info.index}/diff`
            )
        },

        remove: async (e: Event) => {
            if (confirm('Are you sure')) {
                await this.runUI.remove()
                clearCache()
                ROUTER.back()
            }
        },

        cleanupCheckpoints: async (e: Event) => {
            await this.runUI.cleanupCheckpoints()
            clearCache()
            ROUTER.back()
        },

        editComment: async (e: Event) => {
            this.commentSpan.style.display = 'none'
            this.commentInput.style.display = null
            this.commentInput.value = this.run.info.comment
            this.commentInput.focus()
        },

        saveComment: async (e: Event) => {
            this.saveComment(this.commentInput.value)
        },

        jupyter: async (e: Event) => {
            let target = <any>e.currentTarget
            let url = await this.runUI.launchJupyter(target.template)
            if (url === '') {
                alert("Couldn't start Jupyter")
            } else {
                window.open(url, '_blank')
            }
        }
    }

    onCommentKeyDown = async (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
            this.saveComment(this.commentInput.value)
        }
    }

    private saveComment(comment: string) {
        this.commentSpan.style.display = null
        this.commentInput.style.display = 'none'
        this.run.info.comment = comment
        this.commentSpan.textContent = comment

        this.runUI.update({ comment: comment })
    }

    async renderAnalyticsBtns() {
        let templates = await this.runUI.getAnalyticsTemplates()
        for (let t of templates) {
            $(this.analyticsBtns, $ => {
                $('button', t, {
                    on: { click: this.events.jupyter },
                    data: { template: t }
                })
            })
        }
    }

    async renderIndicators() {
        // let indicators: Indicators = await this.runUI.getIndicators()
        let values = await this.runUI.getValues()
        renderValues(this.indicatorsView, values)
    }

    async renderConfigs() {
        let configs = await this.runUI.getConfigs()
        renderConfigs(this.configsView, configs)
    }
}

export class RunHandler {
    constructor() {
        ROUTER.route('experiment/:name/:runIndex', [this.handleRun])
    }

    handleRun = (name: string, runIndex: string) => {
        SCREEN.setView(new RunView(name, runIndex))
    }
}
