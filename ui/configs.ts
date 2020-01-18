import { Weya as $, WeyaElement } from "./weya/weya"
import { Configs } from "./experiments"
import { InfoList } from "./view_components/info_list";

export function renderConfigs(elem: HTMLElement, configs: Configs) {
    let conf = configs.configs;
    
    $(elem, $ => {
        let keys = []
        for (let k in conf) {
            keys.push(k)
        }
        keys.sort()
        for (let k of keys) {
            let classes = ['.mono']
            let options = new Set()
            for(let opt of conf[k].options) {
                options.add(opt)
            }

            if(conf[k].order < 0) {
                classes.push('.ignored')
            } else if(options.has(conf[k].value)) {
                if(conf[k].options.length === 1) {
                    classes.push('.only_option')
                } else {
                    classes.push('.picked')
                }
            } else {
                classes.push('.custom')
            }

            new InfoList([['.key', conf[k].name],
                          ['.value', `${conf[k].value}`]], classes.join('')).render($)
        }
    })
}