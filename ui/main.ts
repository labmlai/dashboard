import { ExperimentsHandler } from './experiments_view'
import { ROUTER, PORT } from './app'
import { ExperimentHandler } from './experiment_view'
import { RunHandler } from './run_view'
import { DiffHandler } from './diff_view'
import { API } from '../common/api'
import { wrapAPI } from '../common/api_handler'
import {TagHandler} from "./tag_view";
import {TableHandler} from "./table_view";

new ExperimentsHandler()
new ExperimentHandler()
new RunHandler()
new DiffHandler()
new TagHandler()
new TableHandler()

wrapAPI(PORT, API)

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
