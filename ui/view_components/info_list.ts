import { WeyaElementFunction, WeyaTemplateFunction } from '../../lib/weya/weya'

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
                if (
                    typeof item === 'object' &&
                    'length' in item &&
                    item.length == 2
                ) {
                    $(`span${item[0]}`, <string>item[1])
                } else {
                    $('span', <string>item)
                }
            }
        })
    }
}
