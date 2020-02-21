import {ROUTER, SCREEN} from './app'
import {Weya as $, WeyaElement} from '../lib/weya/weya'
import {Run} from '../common/experiments'
import {getExperiments, clearCache} from './cache'
import {RunUI} from './run_ui'
import {renderConfigs} from './configs'
import {renderValues} from './indicators'
import {InfoList, InfoItem} from './view_components/info_list'
import {formatSize} from './view_components/format'
import {ScreenView} from "./screen";

function wrapEvent(eventName: string, func: Function) {
    function wrapper() {
        let e: Event = arguments[arguments.length - 1]
        if (eventName[eventName.length - 1] !== '_') {
            e.preventDefault()
            e.stopPropagation()
        }

        func.apply(null, arguments)
    }

    return wrapper
}

class RunView implements ScreenView {
    run: Run
    runUI: RunUI
    elem: WeyaElement
    tensorboardBtn: HTMLButtonElement
    indicatorsView: HTMLDivElement
    experimentName: string
    runUuid: string
    runView: HTMLDivElement
    configsView: HTMLDivElement
    jupyterBtn: HTMLButtonElement
    analyticsBtns: HTMLDivElement
    commentSpan: HTMLSpanElement
    commentInput: HTMLInputElement
    private tagsInput: HTMLInputElement;
    private tagsList: HTMLDivElement;

    constructor(experimentName: string, runUuid: string) {
        this.experimentName = experimentName
        this.runUuid = runUuid

        let events = []
        for (let k in this.events) {
            events.push(k)
        }

        for (let k of events) {
            let func = this.events[k]
            this.events[k] = wrapEvent(k, func)
        }
    }

    render() {
        this.elem = <HTMLElement>$('div.container', $ => {
            this.runView = <HTMLDivElement>$('div.run_single', '')
        })

        this.renderRun().then()

        return this.elem
    }

    private async renderRun() {
        let experiment = (await getExperiments()).get(this.experimentName)
        this.run = experiment.getRun(this.runUuid)
        this.runUI = RunUI.create(this.run)

        let info = this.run.info
        let comment = info.comment.trim() === '' ? '[comment]' : info.comment
        $(this.runView, $ => {
            $('h1', $ => {
                $('label', `${this.run.experimentName}`)
                $('span', ":" + ' ')
                $('span', $ => {
                    this.commentSpan = <HTMLSpanElement>$('span', comment, {
                        on: {click: this.events.editComment}
                    })
                    this.commentInput = <HTMLInputElement>$('input', {
                        type: 'text',
                        on: {
                            blur: this.events.saveComment,
                            keydown: this.events.onCommentKeyDown_
                        }
                    })
                })
            })

            $('div.controls', $ => {
                this.tensorboardBtn = <HTMLButtonElement>(
                    $('button.small',
                        {on: {click: this.events.tensorboard}},
                        $ => {
                            $('i.fa.fa-chart-bar')
                            $('span', ' Launch Tensorboard')
                        })
                )

                this.analyticsBtns = <HTMLDivElement>$('div.analytics_buttons')
            })

            $('div.controls', $ => {
                $('button.small.danger',
                    {on: {click: this.events.remove}},
                    $ => {
                        $('i.fa.fa-trash')
                        $('span', ' Remove')
                    }
                )

                $('button.small.danger',
                    {on: {click: this.events.cleanupCheckpoints}},
                    $ => {
                        $('i.fa.fa-trash')
                        $('span', ' Cleanup Checkpoints')
                    }
                )
            })

            $('div', $ => {
                $('i.fa.fa-folder.key_icon')
                $('span', `${info.uuid}`)
            })

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
                                on: {click: this.events.dirty}
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
                $('div.info_list', $ => {
                    $('span.key', 'Tags')

                    this.tagsList = <HTMLDivElement>$('span.tags')
                    this.renderTagList()

                    $('button.small',
                        {on: {click: this.events.editTags}},
                        $ => {
                            $('i.fa.fa-edit')
                        })

                    this.tagsInput = <HTMLInputElement>$('input', {
                        type: 'text',
                        on: {
                            blur: this.events.saveTags,
                            keydown: this.events.onTagsKeyDown_
                        }
                    })
                    this.tagsInput.style.display = 'none'
                })
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
        })

        this.commentInput.style.display = 'none'

        this.renderIndicators()
        this.renderConfigs()
        this.renderAnalyticsBtns()

        return this.elem
    }

    private renderTagList() {
        this.tagsList.innerHTML = ''

        $(this.tagsList, $ => {
            for (let tag of this.run.info.tags) {
                $('button.small', tag,
                    {on: {click: this.events.tag.bind(this, tag)}})
            }
        })
    }

    private events = {
        tag: (tag, e) => {
            console.log(this, tag, e)
        },

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
                `/experiment/${this.run.experimentName}/${this.run.info.uuid}/diff`
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

        onCommentKeyDown_: async (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                this.saveComment(this.commentInput.value)
            }
        },

        jupyter: async (e: Event) => {
            let target = <any>e.currentTarget
            let url = await this.runUI.launchJupyter(target.template)
            if (url === '') {
                alert("Couldn't start Jupyter")
            } else {
                window.open(url, '_blank')
            }
        },

        editTags: async (e: Event) => {
            this.tagsList.style.display = 'none'
            this.tagsInput.style.display = null
            this.tagsInput.value = this.run.info.tags.join(', ')
            this.tagsInput.focus()
        },

        saveTags: async (e: Event) => {
            this.saveTags(this.tagsInput.value)
        },

        onTagsKeyDown_: async (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                this.saveTags(this.tagsInput.value)
            }
        }

    }

    private saveComment(comment: string) {
        this.commentSpan.style.display = null
        this.commentInput.style.display = 'none'
        this.run.info.comment = comment
        this.commentSpan.textContent = comment

        this.runUI.update({comment: comment}).then()
    }

    private saveTags(tags: string) {
        let tagList = []
        for (let tag of tags.split(',')) {
            tag = tag.trim()
            if (tag !== '') {
                tagList.push(tag)
            }
        }

        this.tagsList.style.display = null
        this.tagsInput.style.display = 'none'
        this.run.info.tags = tagList
        this.renderTagList()

        this.runUI.update({tags: tagList}).then()
    }

    async renderAnalyticsBtns() {
        let templates = await this.runUI.getAnalyticsTemplates()
        for (let t of templates) {
            $(this.analyticsBtns, $ => {
                $('button.small',
                    {
                        on: {click: this.events.jupyter},
                        data: {template: t}
                    },
                    $ => {
                        $('i.fa.fa-chart-line')
                        $('span', ` ${t}`)
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
        ROUTER.route('experiment/:name/:runUuid', [this.handleRun])
    }

    handleRun = (name: string, runUuid: string) => {
        SCREEN.setView(new RunView(name, runUuid))
    }
}
