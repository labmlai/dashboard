
import { WeyaElementFunction } from "../weya"

export class KeyValue {
    classes: string
    valueClasses: string

    constructor(classes: string = '') {
        this.classes = classes
    }

    render($: WeyaElementFunction, key: string, value: string) {
        $(`div.key_value${this.classes}`, $ => {
            $(`label.key`, key)
            $(`span.value`, value)
        })
    }
}