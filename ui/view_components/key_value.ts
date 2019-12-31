
import { WeyaElementFunction, WeyaTemplateFunction } from "../weya/weya"

export class KeyValue {
    classes: string
    valueClasses: string

    constructor(classes: string = '') {
        this.classes = classes
    }

    render($: WeyaElementFunction, key: string | WeyaTemplateFunction, value: string | WeyaTemplateFunction) {
        $(`div.key_value${this.classes}`, $ => {
            $(`label.key`, key)
            $(`span.value`, value)
        })
    }
}