import * as PATH from 'path'
import * as FS from 'fs'
import * as YAML from "yaml"

const CONFIG_FILE_NAME = '.lab.yaml'

export class Lab {
    path: string
    experiments: string
    analytics: string
    analyticsPath: string
    analyticsTemplates: {[name: string]: string}

    constructor(path: string) {
        let configsList = getConfigFiles(path)
        if(configsList.length == 0) {
            throw Error("No .lab.yaml files found")
        }
        let configs = mergeConfig(configsList)

        this.path = configs.path
        this.experiments = PATH.join(this.path, configs.experiments_path)
        this.analytics = PATH.join(this.path, configs.analytics_path)
        this.analyticsPath = configs.analytics_path
        this.analyticsTemplates = configs.analytics_templates
    }
}


function mergeConfig(configs: any[]) {
    let config = {
        path: null,
        check_repo_dirty: true,
        is_log_python_file: true,
        config_file_path: null,
        data_path: 'data',
        experiments_path: 'logs',
        analytics_path: 'analytics',
        analytics_templates: {}
    }

    for (let i = configs.length - 1; i >= 0; --i) {
        let c = configs[i]

        if (config['path'] == null) {
            config.path = c.config_file_path
        }

        if ('path' in c) {
            throw Error("Path in configs: " + c.config_file_path)
        }
        if (i > 0 && 'experiments_path' in c) {
            throw Error("Experiment path in configs: " + c.config_file_path)
        }
        if (i > 0 && 'analytics_path' in c) {
            throw Error("Analyitics path in configs: " + c.config_file_path)
        }

        for (let k in c) {
            let v = c[k]
            if (!(k in config)) {
                throw Error("Unknown configs: " + c.config_file_path)
            }

            if (k === 'analytics_templates') {
                for (let t in v) {
                    config.analytics_templates[t] = PATH.resolve(c.config_file_path, v[t])
                }
            } else {
                config[k] = v
            }
        }
    }

    return config
}

function getConfigFiles(path: string) {
    path = PATH.resolve(path)
    let configsList = []

    while (FS.existsSync(path)) {
        let stats = FS.lstatSync(path)
        if (stats.isDirectory()) {
            let config_file = PATH.join(path, CONFIG_FILE_NAME)
            if (FS.existsSync(config_file)) {
                let contents = FS.readFileSync(config_file, { encoding: 'utf-8' })
                let configs = YAML.parse(contents)
                configs.config_file_path = path
                configsList.push(configs)
            }
        }

        if (path === PATH.resolve(path, '..')) {
            break
        }

        path = PATH.resolve(path, '..')
    }

    return configsList
}
