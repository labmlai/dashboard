import {ROUTER} from './app'
import {RunHandler} from './run_view'
import {DiffHandler} from './diff_view'
import {TableHandler} from "./table/table_view";
import {SampleChartHandler} from "./charting/sample";

new RunHandler()
new DiffHandler()
new TableHandler()
new SampleChartHandler()

if (
    document.readyState === 'complete' ||
    document.readyState === 'interactive'
) {
    ROUTER.start(null, false)
} else {
    document.addEventListener('DOMContentLoaded', () => {
        ROUTER.start(null, false)
    })
}
