import {Weya as $, WeyaElement, WeyaElementFunction} from '../lib/weya/weya'
import {Config, Configs, ConfigsModel} from '../common/experiments'
import {InfoItem, InfoList} from './view_components/info_list'
import {formatValue} from './view_components/format'

const CONFIG_PRINT_LEN = 50

interface OptionInfo {
    isCustom: boolean
    isOnlyOption: boolean
    value: string
    isDefault: boolean
    otherOptions: any
}

class ConfigsView {
    configs: Configs
    common: Set<string>
    elem: WeyaElement
    showHideBtn: HTMLButtonElement

    constructor(configs: Configs, common: Set<string> = new Set()) {
        this.configs = configs
        this.common = common
    }

    private renderComputed(conf: Config) {
        if (typeof conf.computed === 'string') {
            let computed: string = conf.computed
            computed = computed.replace('\n', '')
            if (computed.length < CONFIG_PRINT_LEN) {
                return computed
            } else {
                return ($: WeyaElementFunction) => {
                    $(
                        'span',
                        computed.substr(0, CONFIG_PRINT_LEN) + '...',
                        {title: computed}
                    )
                }
            }
        } else {
            return formatValue(conf.computed)
        }

    }

    private renderOption(conf: Config): OptionInfo {
        let options = new Set()
        for (let opt of conf.options) {
            options.add(opt)
        }

        let res: OptionInfo = {
            isCustom: false,
            isOnlyOption: false,
            value: conf.value,
            otherOptions: null,
            isDefault: false
        }

        if (options.has(conf.value)) {
            options.delete(conf.value)
            if (options.size === 0) {
                res.isOnlyOption = true
                res.isDefault = true
            }
        } else {
            res.isCustom = true
            if(conf.is_explicitly_specified !== true) {
                res.isDefault = true
            }
        }
        if (options.size > 0) {
            res.otherOptions = ($: WeyaElementFunction) => {
                for (let opt of options.keys()) {
                    if (typeof opt !== 'string') {
                        continue
                    }
                    $('span', <string>opt)
                }
            }
        }

        return res
    }

    private renderConfigValue(
        key: string,
        conf: Config,
        isCommon: boolean,
        $: WeyaElementFunction,
        configs: ConfigsModel,
    ): boolean {
        let isCollapsible = false

        let classes = ['.config']

        let conf_modules = key.split('.')
        let prefix = ''
        let parentKey = ''
        let isParentDefault = false
        for (let i = 0; i < conf_modules.length - 1; ++i) {
            parentKey += conf_modules[i]
            let optInfo = this.renderOption(configs[parentKey])
            if (optInfo.isDefault) {
                isParentDefault = true
            }
            parentKey += '.'
            prefix += '--- '
        }
        let parts: InfoItem[] = [['.key', prefix + conf.name]]

        if (conf.order < 0) {
            classes.push('.ignored')
            isCollapsible = true
        } else {
            parts.push(['.computed', this.renderComputed(conf)])

            let optionInfo = this.renderOption(conf)
            console.log(key, isParentDefault)

            if (optionInfo.isCustom) {
                console.log(key, isParentDefault)
                if (isParentDefault && !conf.is_explicitly_specified && !conf.is_hyperparam && !conf.is_hyperparam) {
                    classes.push('.only_option')
                    isCollapsible = true
                } else {
                    classes.push('.custom')
                }

            } else {
                parts.push(['.option', conf.value])
                if (!conf.is_explicitly_specified && !conf.is_hyperparam && (isParentDefault || optionInfo.isOnlyOption)) {
                    classes.push('.only_option')
                    isCollapsible = true
                } else {
                    classes.push('.picked')
                }
            }
            if (optionInfo.otherOptions != null) {
                parts.push(['.options', optionInfo.otherOptions])
            }
        }

        if (isCommon) {
            classes.push('.common')
            isCollapsible = true
        }

        if (!isCollapsible) {
            classes.push('.not_collapsible')
        } else {
            classes.push('.collapsible')
        }

        new InfoList(parts, classes.join('')).render($)

        return isCollapsible
    }

    render() {
        let conf = this.configs.configs
        let isCollapsible = false

        this.elem = $('div.configs', $ => {
            let keys = []
            for (let k of Object.keys(conf)) {
                keys.push(k)
            }
            keys.sort()
            for (let k of keys) {
                if (this.renderConfigValue(k, conf[k], this.common.has(k), $, conf)) {
                    isCollapsible = true
                }
            }

            isCollapsible = false
            if (isCollapsible) {
                this.showHideBtn = <HTMLButtonElement>(
                    $('button.inline', 'More...', {
                        on: {
                            click: this.onShowHideClick
                        }
                    })
                )
            }
        })

        if (isCollapsible) {
            this.elem.classList.add('collapsed')
        }

        return this.elem
    }

    private onShowHideClick = (e: Event) => {
        e.preventDefault()
        e.stopPropagation()

        if (this.elem.classList.contains('collapsed')) {
            this.elem.classList.remove('collapsed')
            this.showHideBtn.textContent = 'Less...'
        } else {
            this.elem.classList.add('collapsed')
            this.showHideBtn.textContent = 'More...'
        }

        this.showHideBtn.blur()
    }
}

export function renderConfigs(
    elem: HTMLElement,
    configs: Configs,
    common: Set<string> = new Set()
) {
    let view = new ConfigsView(configs, common)
    elem.appendChild(view.render())
}
