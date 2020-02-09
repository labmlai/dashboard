import { WeyaElementFunction } from '../../lib/weya/weya'

function numberWithCommas(x: string) {
    var parts = x.split('.')
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

export function formatInt(value: number) {
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
        $('span.size', size.toPrecision(4))
        $('span.size_unit', unit)
    }
}

export function formatValue(value: any) {
    if (typeof value === 'boolean') {
        let str = (<boolean>value).toString()
        return ($: WeyaElementFunction) => {
            $('span.boolean', str)
        }
    } else if (typeof value === 'number') {
        if (value - Math.floor(value) < 1e-9) {
            let str = formatInt(value)
            return ($: WeyaElementFunction) => {
                $('span.int', str)
            }
        } else {
            let str = formatInt(value)
            return ($: WeyaElementFunction) => {
                $('span.float', str)
            }
        }
    } else if (typeof value === 'string') {
        return ($: WeyaElementFunction) => {
            $('span.string', value)
        }
    } else {
        return ($: WeyaElementFunction) => {
            $('span.unknown', `${value}`)
        }
    }
}
