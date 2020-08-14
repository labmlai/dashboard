import {WeyaElementFunction} from '../../lib/weya/weya'

function numberWithCommas(x: string) {
    const parts = x.split('.')
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    return parts.join('.')
}

export function formatScalar(value: number) {
    let str = value.toFixed(2)
    if (str.length <= 10) {
        str = value.toPrecision(10)
    }

    return numberWithCommas(str)
}

export function formatFixed(value: number, decimals: number) {
    let str = value.toFixed(decimals)

    return numberWithCommas(str)
}

export function formatInt(value: number) {
    if(value == null) {
        return '-'
    }
    let str = value.toString()
    return numberWithCommas(str)
}

export function formatSize(size: number) {
    let units = ['B', 'KB', 'MB', 'GB']
    let unit = 'TB'
    for (let p of units) {
        if (size < 1024) {
            unit = p
            break
        }
        size /= 1024
    }

    return ($: WeyaElementFunction) => {
        $('span.size', size.toFixed(2))
        $('span.size_unit', unit)
    }
}

function formatValueWithBuilder(value: any, $: WeyaElementFunction) {
    if (typeof value === 'boolean') {
        let str = (<boolean>value).toString()
        $('span.boolean', str)
    } else if (typeof value === 'number') {
        if (value - Math.floor(value) < 1e-9) {
            let str = formatInt(value)
            $('span.int', str)
        } else {
            let str = formatInt(value)
            $('span.float', str)
        }
    } else if (typeof value === 'string') {
        $('span.string', value)
    } else if (value instanceof Array) {
        $('span.subtle', "[")
        for (let i = 0; i < value.length; ++i) {
            if (i > 0) {
                $('span.subtle', ', ')
            }
            formatValueWithBuilder(value[i], $)
        }
        $('span.subtle', "]")
    } else {
        $('span.unknown', `${value}`)
    }
}

export function formatValue(value: any) {
    return ($: WeyaElementFunction) => {
        formatValueWithBuilder(value, $)
    }
}
