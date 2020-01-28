import { ExperimentsHandler } from './experiments_view'
import { ROUTER, PORT } from './app'
import { ExperimentHandler } from './experiment_view'
import { RunHandler } from './run_view'
import { DiffHandler } from './diff_view'
import { API } from './api'
import { wrapAPI } from './api_caller'

new ExperimentsHandler()
new ExperimentHandler()
new RunHandler()
new DiffHandler()
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
