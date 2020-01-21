import { WeyaElementFunction } from "../weya/weya"

function numberWithCommas(x: string) {
    var parts = x.split(".")
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",")
    return parts.join(".")
}

export function formatScalar(value: number) {
    let str = value.toFixed(2)
    if(str.length <= 10) {
        str = value.toPrecision(10)
    }

    str = numberWithCommas(str)

    return ($: WeyaElementFunction) => {
        $('span', str)
    }
}

export function formatInt(value: number) {
    let str = value.toString()
    str = numberWithCommas(str)

    return ($: WeyaElementFunction) => {
        $('span', str)
    }
}

