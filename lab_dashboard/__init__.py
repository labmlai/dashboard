import subprocess
from pathlib import PurePath, Path

from lab import logger, monit
from lab.logger import Text, Style


def _no_node_js():
    logger.log(['Failed to find ',
                ('NodeJS', Text.highlight),
                '(',
                ('https://nodejs.org/', Style.underline),
                ')',
                '. Make sure it is installed and the paths are set.'])


def check_installation():
    installation = PurePath(__file__).parent.parent

    try:
        p = subprocess.run(["node", '-v'],
                           cwd=str(installation),
                           stdout=subprocess.DEVNULL)
        if p.returncode != 0:
            _no_node_js()
            return False

    except FileNotFoundError as e:
        _no_node_js()
        return False

    if not Path(installation / 'app' / 'node_modules').is_dir():
        with monit.section('Installing node modules'):
            print(subprocess.run(["npm", 'install', '--production'],
                                 cwd=str(installation / 'app'),
                                 stdout=subprocess.DEVNULL))

    return True


def start_server():
    if not check_installation():
        return
    installation = PurePath(__file__).parent.parent
    try:
        subprocess.run(["node", str(installation / 'app' / 'server' / 'server' / 'app.js')])
    except KeyboardInterrupt:
        pass
