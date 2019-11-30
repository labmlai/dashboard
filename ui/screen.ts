import { WeyaElement } from "./weya"

interface ScreenView {
    render(): WeyaElement
}

class ScreenContainer {
    setView(view: ScreenView) {
        document.body.innerHTML = ''
        document.body.append(view.render())
    }
}

export {ScreenContainer, ScreenView}