import { Weya as $, WeyaElement, WeyaElementFunction } from "./weya/weya"
import { Configs, Config } from "./experiments"
import { InfoList } from "./view_components/info_list";
import { formatValue } from "./view_components/format";

class ConfigsView {
    configs: Configs
    common: Set<string>
    elem: WeyaElement
    showHideBtn: HTMLButtonElement;

    constructor(configs: Configs, common: Set<string> = new Set()) {
        this.configs = configs
        this.common = common
    }

    private renderConfigValue(conf: Config, isCommon: boolean, $: WeyaElementFunction): boolean {
        let isCollapsible = false

        let classes = ['.mono']
        let options = new Set()
        for (let opt of conf.options) {
            options.add(opt)
        }

        if (conf.order < 0) {
            classes.push('.ignored')
            isCollapsible = true
        } else if (options.has(conf.value)) {
            if (conf.options.length === 1) {
                classes.push('.only_option')
                isCollapsible = true
            } else {
                classes.push('.picked')
            }
        } else {
            classes.push('.custom')
        }

        if (isCommon) {
            classes.push('.common')
            isCollapsible = true
        }

        new InfoList([['.key', conf.name],
        ['.value', formatValue(conf.value)]],
            classes.join('')).render($)

        return isCollapsible
    }

    render() {
        let conf = this.configs.configs;
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
                this.showHideBtn = <HTMLButtonElement>$('button', 'More...', {
                    on: {
                        click: this.onShowHideClick
                    }
                })

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

export function renderConfigs(elem: HTMLElement, configs: Configs, common: Set<string> = new Set()) {
    let view = new ConfigsView(configs, common)
    elem.appendChild(view.render())
}