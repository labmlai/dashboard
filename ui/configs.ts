import { Weya as $, WeyaElement, WeyaElementFunction } from '../lib/weya/weya'
import { Configs, Config } from '../common/experiments'
import { InfoList, InfoItem } from './view_components/info_list'
import { formatValue } from './view_components/format'

const CONFIG_PRINT_LEN = 50

class ConfigsView {
    configs: Configs
    common: Set<string>
    elem: WeyaElement
    showHideBtn: HTMLButtonElement

    constructor(configs: Configs, common: Set<string> = new Set()) {
        this.configs = configs
        this.common = common
    }

    /*
        if is_ignored:
            parts.append((key, Text.subtle))
            return parts

        parts.append((key, Text.key))

        if value is not None:
            value_str = str(value)
            value_str = value_str.replace('\n', '')
            if len(value_str) < _CONFIG_PRINT_LEN:
                parts.append((f"{value_str}", Text.value))
            else:
                parts.append((f"{value_str[:_CONFIG_PRINT_LEN]}...", Text.value))
            parts.append('\t')

        if option is not None:
            if len(other_options) == 0:
                parts.append((option, Text.subtle))
            else:
                parts.append((option, Text.none))

        if len(other_options) > 0:
            parts.append(('\t[', Text.subtle))
            for i, opt in enumerate(other_options):
                if i > 0:
                    parts.append((', ', Text.subtle))
                parts.append(opt)
            parts.append((']', Text.subtle))
    */

    private renderConfigValue(
        conf: Config,
        isCommon: boolean,
        $: WeyaElementFunction
    ): boolean {
        let isCollapsible = false

        let classes = ['.config']
        let parts: InfoItem[] = [['.key', conf.name]]

        let options = new Set()
        for (let opt of conf.options) {
            options.add(opt)
        }

        if (conf.order < 0) {
            classes.push('.ignored')
            isCollapsible = true
        } else {
            if (typeof conf.computed === 'string') {
                let computed: string = conf.computed
                computed = computed.replace('\n', '')
                if (computed.length < CONFIG_PRINT_LEN) {
                    parts.push(['.computed', computed])
                } else {
                    parts.push([
                        '.computed',
                        ($: WeyaElementFunction) => {
                            $(
                                'span',
                                computed.substr(0, CONFIG_PRINT_LEN) + '...',
                                { title: computed }
                            )
                        }
                    ])
                }
            } else {
                parts.push(['.computed', formatValue(conf.computed)])
            }

            if (options.has(conf.value)) {
                options.delete(conf.value)
                if (options.size === 0) {
                    classes.push('.only_option')
                    isCollapsible = true
                    parts.push(['.option', conf.value])
                } else {
                    classes.push('.picked')
                    parts.push(['.option', conf.value])
                }
            } else {
                classes.push('.custom')
            }
            if (options.size > 0) {
                parts.push([
                    '.options',
                    ($: WeyaElementFunction) => {
                        for (let opt of options.keys()) {
                            if (typeof opt !== 'string') {
                                continue
                            }
                            $('span', <string>opt)
                        }
                    }
                ])
            }
        }

        if (isCommon) {
            classes.push('.common')
            isCollapsible = true
        }

        new InfoList(parts, classes.join('')).render($)

        return isCollapsible
    }

    render() {
        let conf = this.configs.configs
        let isCollapsible = false

        this.elem = $('div.configs', $ => {
            let keys = []
            for (let k in conf) {
                keys.push(k)
            }
            keys.sort()
            for (let k of keys) {
                if (this.renderConfigValue(conf[k], this.common.has(k), $)) {
                    isCollapsible = true
                }
            }

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
