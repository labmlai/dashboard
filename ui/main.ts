import {ROUTER} from './app'
import {ExperimentsHandler} from './experiments_view'
import {RunHandler} from './run_view'
import {DiffHandler} from './diff_view'
import {TableHandler} from "./table/table_view";

new ExperimentsHandler()
new RunHandler()
new DiffHandler()
new TableHandler()


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
