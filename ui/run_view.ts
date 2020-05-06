import {ROUTER, SCREEN} from './app'
import {Weya as $, WeyaElement} from '../lib/weya/weya'
import {Run} from '../common/experiments'
import {clearCache, getExperiments} from './cache'
import {RunUI} from './run_ui'
import {renderConfigs} from './configs'
import {renderValues} from './indicators'
import {InfoItem, InfoList} from './view_components/info_list'
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
    private commentInputContainer: HTMLElement;
    private tagsInputContainer: HTMLElement;
    private tagEditBtn: HTMLButtonElement;

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
                $('label', `${this.run.experimentName}`,
                    {on: {click: this.events.experiment}})
                $('span', ":" + ' ')
                $('span', $ => {
                    this.commentSpan = <HTMLSpanElement>$('span', comment, {
                        on: {click: this.events.editComment}
                    })
                    this.commentInputContainer = <HTMLElement>$('div.input-container', $ => {
                        $('i.input-icon.fa.fa-edit')
                        this.commentInput = <HTMLInputElement>$('input', {
                            type: 'text',
                            on: {
                                blur: this.events.saveComment,
                                keydown: this.events.onCommentKeyDown_
                            }
                        })
                    })
                })
            })

            $('div.controls', $ => {
                this.tensorboardBtn = <HTMLButtonElement>(
                    $('button',
                        {on: {click: this.events.tensorboard}},
                        $ => {
                            $('i.fa.fa-chart-bar')
                            $('span', ' Launch Tensorboard')
                        })
                )

                this.analyticsBtns = <HTMLDivElement>$('span.analytics_buttons')

                $('button.danger',
                    {on: {click: this.events.remove}},
                    $ => {
                        $('i.fa.fa-trash')
                        $('span', ' Remove')
                    }
                )

                $('button.danger',
                    {on: {click: this.events.cleanupCheckpoints}},
                    $ => {
                        $('i.fa.fa-trash')
                        $('span', ' Cleanup Checkpoints')
                    }
                )
            })

            $('div.block', $ => {
                new InfoList(
                    [
                        ['.key', 'UUID'],
                        ['.value', info.uuid]
                    ],
                    ''
                ).render($)

                new InfoList(
                    [
                        ['.key', 'Date & Time'],
                        ['.value', `${info.trial_date} ${info.trial_time}`]
                    ],
                    ''
                ).render($)
            })

            if (info.load_run != null) {
                $('div.block', $ => {
                    let load_info: InfoItem[] = [
                        ['.key', 'Loaded run']
                    ]
                    load_info.push([
                        '.link',
                        $ => {
                            $('span', ' ')
                            $('button.inline', `${info.load_run}`, {
                                on: {click: this.events.loadRun}
                            })
                        }
                    ])
                    new InfoList(load_info, '.mono').render($)

                    new InfoList(
                        [
                            ['.key', 'Starting step'],
                            ['.value', `${info.start_step}`]
                        ],
                        ''
                    ).render($)
                })
            }

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
                            $('button.inline', '[dirty]', {
                                on: {click: this.events.dirty}
                            })
                        }
                    ])
                }
                new InfoList(commit_info, '.mono').render($)

                new InfoList(
                    [
                        ['.key', 'Commit message'],
                        ['.value', info.commit_message]
                    ],
                    ''
                ).render($)

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


                    $('span', $ => {
                        this.tagEditBtn = <HTMLButtonElement>$('button.inline',
                            {on: {click: this.events.editTags}},
                            $ => {
                                $('i.fa.fa-edit')
                            })

                        this.tagsInputContainer = <HTMLElement>$('div.input-container', $ => {
                            $('i.input-icon.fa.fa-edit')
                            this.tagsInput = <HTMLInputElement>$('input', {
                                type: 'text',
                                on: {
                                    blur: this.events.saveTags,
                                    keydown: this.events.onTagsKeyDown_
                                }
                            })
                        })
                    })
                    this.tagsInputContainer.style.display = 'none'
                })
            })


            $('div.block', $ => {
                $('h3', 'Storage space')
                let size =
                    info.sqlite_size +
                    info.analytics_size +
                    info.checkpoints_size +
                    info.tensorboard_size

                new InfoList(
                    [
                        ['.key', 'Total size'],
                        ['.value', formatSize(size)]
                    ],
                    '.mono'
                ).render($)

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

            this.indicatorsView = <HTMLDivElement>$('div.indicators.block', $ => {
                $('h3', 'Indicators')
            })

            this.configsView = <HTMLDivElement>$('div.configs.block', $ => {
                $('h3', 'Configurations')
            })
        })

        this.commentInputContainer.style.display = 'none'

        this.renderIndicators().then()
        this.renderConfigs().then()
        this.renderAnalyticsBtns().then()

        return this.elem
    }

    private renderTagList() {
        this.tagsList.innerHTML = ''

        $(this.tagsList, $ => {
            for (let tag of this.run.info.tags) {
                $('button.inline', tag,
                    {on: {click: this.events.tag.bind(this, tag)}})
            }
        })
    }

    private events = {
        tag: (tag) => {
            ROUTER.navigate(
                `/tag/${tag}`
            )
        },

        tensorboard: async () => {
            let url = await this.runUI.launchTensorboard()
            if (url === '') {
                alert("Couldn't start Tensorboard")
            } else {
                window.open(url, '_blank')
            }
        },

        dirty: () => {
            ROUTER.navigate(
                `/experiment/${this.run.experimentName}/${this.run.info.uuid}/diff`
            )
        },

        loadRun: () => {
            ROUTER.navigate(
                `/experiment/${this.run.experimentName}/${this.run.info.load_run}`
            )
        },

        experiment: () => {
            ROUTER.navigate(
                `/experiment/${this.run.experimentName}`
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
            this.commentInputContainer.style.display = null
            this.commentInput.value = this.run.info.comment
            this.commentInput.focus()
        },

        saveComment: async (e: Event) => {
            this.saveComment(this.commentInput.value).then()
        },

        onCommentKeyDown_: async (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                this.saveComment(this.commentInput.value).then()
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
            this.tagEditBtn.style.display = 'none'
            this.tagsInputContainer.style.display = null
            this.tagsInput.value = this.run.info.tags.join(', ')
            this.tagsInput.focus()
        },

        saveTags: async (e: Event) => {
            this.saveTags(this.tagsInput.value).then()
        },

        onTagsKeyDown_: async (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                this.saveTags(this.tagsInput.value).then()
            }
        }

    }

    private async saveComment(comment: string) {
        if (this.run.info.comment === comment) {
            return
        }

        this.run.info.comment = comment

        await this.runUI.update({comment: comment})

        this.commentSpan.style.display = null
        this.commentInputContainer.style.display = 'none'
        this.commentSpan.textContent = comment
    }

    private async saveTags(tags: string) {
        let tagList = []
        for (let tag of tags.split(',')) {
            tag = tag.trim()
            if (tag !== '') {
                tagList.push(tag)
            }
        }

        await this.runUI.update({tags: tagList})

        this.tagsList.style.display = null
        this.tagEditBtn.style.display = null
        this.tagsInputContainer.style.display = 'none'
        this.run.info.tags = tagList
        this.renderTagList()
    }

    async renderAnalyticsBtns() {
        let templates = await this.runUI.getAnalyticsTemplates()
        for (let t of templates) {
            $(this.analyticsBtns, $ => {
                $('button',
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
        let values = await this.runUI.loadValues()
        renderValues(this.indicatorsView, values)
    }

    async renderConfigs() {
        let configs = await this.runUI.loadConfigs()
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
