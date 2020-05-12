import subprocess
from pathlib import PurePath, Path

from labml import logger, monit
from labml.logger import Text, Style


def _no_node_js():
    logger.log('Failed to find ',
               ('NodeJS', Text.highlight),
               '(',
               ('https://nodejs.org/', Style.underline),
               ')',
               '. Make sure it is installed and the paths are set.')


def get_app_path():
    package = PurePath(__file__).parent
    app_path = Path(package / 'app')
    if app_path.is_dir():
        return app_path

    app_path = Path(package.parent / 'app')
    assert app_path.is_dir()

    return app_path


def check_installation():
    package = PurePath(__file__).parent

    try:
        p = subprocess.run(["node", '-v'],
                           cwd=str(package),
                           stdout=subprocess.DEVNULL)
        if p.returncode != 0:
            _no_node_js()
            return False

    except FileNotFoundError as e:
        _no_node_js()
        return False

    app_path = get_app_path()

    # logger.log('App path: ', (str(app_path), Text.value))

    if (not (app_path / 'node_modules').is_dir() and
            not (app_path.parent / 'node_modules').is_dir()):
        with monit.section('Installing node modules'):
            p = subprocess.run(["npm", 'install', '--production'],
                               cwd=str(app_path),
                               stdout=subprocess.DEVNULL)
            if p.returncode != 0:
                logger.log('Failed to run  ',
                           ('npm install', Text.highlight))

    return True


def start_server():
    if not check_installation():
        return
    app_path = get_app_path()
    try:
        subprocess.run(["node", str(app_path / 'server' / 'server' / 'app.js')])
    except KeyboardInterrupt:
        pass
