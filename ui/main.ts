import {ROUTER} from './app'
import {ExperimentsHandler} from './experiments_view'
import {ExperimentHandler} from './experiment_view'
import {RunHandler} from './run_view'
import {DiffHandler} from './diff_view'
import {TagHandler} from "./tag_view";
import {TableHandler} from "./table/table_view";

new ExperimentsHandler()
new ExperimentHandler()
new RunHandler()
new DiffHandler()
new TagHandler()
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
