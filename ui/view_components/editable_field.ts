import {WeyaElementFunction, WeyaTemplateFunction} from '../../lib/weya/weya'

export interface EditableFieldListener {
    (value: string): void
}

export class EditableField {
    private value: string;
    private span: HTMLSpanElement;
    private inputContainer: HTMLElement;
    private input: HTMLInputElement;
    private readonly onUpdate: EditableFieldListener;
    private empty: string;

    constructor(value: string, onUpdate: EditableFieldListener, empty: string = '') {
        this.value = value;
        this.onUpdate = onUpdate;
        this.empty = empty;
    }

    render($: WeyaElementFunction) {
        this.span = <HTMLSpanElement>$('span', {
            on: {click: this.onEdit}
        })
        this.inputContainer = <HTMLElement>$('div.input-container', $ => {
            $('i.input-icon.fa.fa-edit')
            this.input = <HTMLInputElement>$('input', {
                type: 'text',
                on: {
                    blur: this.onSave,
                    keydown: this.onKeyDown
                }
            })
        })
        this.inputContainer.style.display = 'none'
        this.change(this.value)
    }

    onEdit = async (e: Event) => {
        e.preventDefault()
        e.stopPropagation()
        this.span.style.display = 'none'
        this.inputContainer.style.display = null
        this.input.value = this.value
        this.input.focus()
    }

    onSave = async (e: Event) => {
        e.preventDefault()
        e.stopPropagation()
        this.update()
    }

    onKeyDown = async (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
            this.update()
        }
    }

    private update(trigger: boolean = true) {
        this.span.style.display = null
        this.inputContainer.style.display = 'none'

        this.value = this.input.value
        if (this.value.trim() !== '') {
            this.span.textContent = this.value
        } else {
            this.span.textContent = this.empty
        }

        if (trigger) {
            this.onUpdate(this.value)
        }
    }

    change(value: string) {
        this.input.value = value
        this.update(false)
    }
}
