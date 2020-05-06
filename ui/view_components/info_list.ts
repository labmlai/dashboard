import {WeyaElementFunction, WeyaTemplateFunction} from '../../lib/weya/weya'

type InfoContent = string | WeyaTemplateFunction
export type InfoItem = InfoContent | [string, InfoContent]

export class InfoList {
    items: InfoItem[]
    classes: string

    constructor(items: InfoItem[], classes: string = '') {
        this.items = items
        this.classes = classes
    }

    render($: WeyaElementFunction) {
        $(`div.info_list${this.classes}`, $ => {
            for (let item of this.items) {
                let classes = ''
                let text
                if (typeof item === 'object' &&
                    'length' in item && item.length == 2) {
                    classes = <string>item[0]
                    text = <string>item[1]
                } else {
                    text = <string>item
                }

                if(classes === '.key') {
                    text = text.trimRight() + ' '
                }
                $(`span${classes}`, text)
            }
        })
    }
}
