import { ExperimentsHandler } from "./experiments_view"
import { ROUTER } from "./app"
import { ExperimentHandler } from "./experiment_view"

new ExperimentsHandler()
new ExperimentHandler()

if (document.readyState === "complete" || document.readyState === 'interactive') {
    ROUTER.start(null, false)
} else {
    document.addEventListener('DOMContentLoaded', () => {
        ROUTER.start(null, false)
    })
}
