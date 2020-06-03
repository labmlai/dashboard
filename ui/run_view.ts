import {ROUTER, SCREEN} from './app'
import {Weya as $, WeyaElement} from '../lib/weya/weya'
import {Run} from '../common/experiments'
import {clearCache, getRuns} from './cache'
import {RunUI} from './run_ui'
import {renderConfigs} from './configs'
import {renderValues} from './indicators'
import {InfoItem, InfoList} from './view_components/info_list'
import {formatSize} from './view_components/format'
import {ScreenView} from "./screen";
import {EditableField} from "./view_components/editable_field";

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
    uuid: string
    runView: HTMLDivElement
    configsView: HTMLDivElement
    analyticsBtns: HTMLDivElement
    private tagsInput: HTMLInputElement;
    private tagsList: HTMLDivElement;
    private tagsInputContainer: HTMLElement;
    private tagEditBtn: HTMLButtonElement;
    private commentField: EditableField;
    private nameField: EditableField;

    constructor(uuid: string) {
        this.uuid = uuid

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
        this.run = (await getRuns()).getRun(this.uuid)
        this.runUI = RunUI.create(this.run)

        let comment = this.run.comment.trim() === '' ? '[comment]' : this.run.comment
        $(this.runView, $ => {
            $('h1', $ => {
                $('span', $ => {
                    this.nameField = new EditableField(this.run.name,
                        this.saveName, '[name]')
                    this.nameField.render($)
                })
                $('span', ":" + ' ')
                $('span', $ => {
                    this.commentField = new EditableField(this.run.comment,
                        this.saveComment, '[comment]')
                    this.commentField.render($)
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
                        ['.value', this.run.uuid]
                    ],
                    ''
                ).render($)

                new InfoList(
                    [
                        ['.key', 'Date & Time'],
                        ['.value', `${this.run.trial_date} ${this.run.trial_time}`]
                    ],
                    ''
                ).render($)
            })

            if (this.run.load_run != null) {
                $('div.block', $ => {
                    let load_info: InfoItem[] = [
                        ['.key', 'Loaded run']
                    ]
                    load_info.push([
                        '.link',
                        $ => {
                            $('span', ' ')
                            $('button.inline', `${this.run.load_run}`, {
                                on: {click: this.events.loadRun}
                            })
                        }
                    ])
                    new InfoList(load_info, '.mono').render($)

                    new InfoList(
                        [
                            ['.key', 'Starting step'],
                            ['.value', `${this.run.start_step}`]
                        ],
                        ''
                    ).render($)
                })
            }

            $('div.block', $ => {
                let commit_info: InfoItem[] = [
                    ['.key', 'Commit'],
                    ['.value', this.run.commit]
                ]
                if (this.run.is_dirty) {
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
                        ['.value', this.run.commit_message]
                    ],
                    ''
                ).render($)

                let python_file: InfoItem[] = [
                    ['.key', 'Python File'],
                    ['.value', this.run.python_file]
                ]

                python_file.push([
                    '.link',
                    $ => {
                        $('span', ' ')
                        $('button.inline', '[view]', {
                            on: {click: this.events.code}
                        })
                    }
                ])
                new InfoList(python_file, '.mono').render($)
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

                new InfoList(
                    [
                        ['.key', 'Total size'],
                        ['.value', formatSize(this.run.total_size)]
                    ],
                    '.mono'
                ).render($)

                new InfoList(
                    [
                        ['.key', 'Checkpoints'],
                        ['.value', formatSize(this.run.checkpoints_size)]
                    ],
                    '.mono'
                ).render($)

                new InfoList(
                    [
                        ['.key', 'Artifacts'],
                        ['.value', formatSize(this.run.artifacts_size)]
                    ],
                    '.mono'
                ).render($)

                new InfoList(
                    [
                        ['.key', 'SQLite'],
                        ['.value', formatSize(this.run.sqlite_size)]
                    ],
                    '.mono'
                ).render($)

                new InfoList(
                    [
                        ['.key', 'Analytics'],
                        ['.value', formatSize(this.run.analytics_size)]
                    ],
                    '.mono'
                ).render($)

                new InfoList(
                    [
                        ['.key', 'TensorBoard'],
                        ['.value', formatSize(this.run.tensorboard_size)]
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


        this.renderIndicators().then()
        this.renderConfigs().then()
        this.renderAnalyticsBtns().then()

        return this.elem
    }

    private renderTagList() {
        this.tagsList.innerHTML = ''

        $(this.tagsList, $ => {
            for (let tag of this.run.tags) {
                $('button.inline', tag,
                    {on: {click: this.events.tag.bind(this, tag)}})
            }
        })
    }

    private events = {
        tag: (tag) => {
            ROUTER.navigate(
                `/table/default/${tag}`
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
            ROUTER.navigate(`/run/${this.run.uuid}/diff`)
        },

        code: () => {
            ROUTER.navigate(`/run/${this.run.uuid}/code`)
        },


        loadRun: () => {
            ROUTER.navigate(`/run/${this.run.load_run}`)
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
            this.tagsInput.value = this.run.tags.join(', ')
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

    saveComment = async (comment: string) => {
        if (this.run.comment === comment) {
            return
        }

        await this.runUI.update({comment: comment})
    }

    saveName = async (name: string) => {
        if (this.run.name === name) {
            return
        }
        if (name.trim() === '') {
            this.nameField.change(this.run.name)
            return
        }

        await this.runUI.update({name: name})
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
        ROUTER.route('run/:uuid', [this.handleRun])
    }

    handleRun = (uuid: string) => {
        SCREEN.setView(new RunView(uuid))
    }
}
