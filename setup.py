import shutil

import setuptools

with open("readme.md", "r") as f:
    long_description = f.read()

shutil.copy('package.json', 'app/')
shutil.copy('package-lock.json', 'app/')

setuptools.setup(
    name='machine_learning_lab_dashboard',
    version='0.4.0',
    author="Varuna Jayasiri",
    author_email="vpjayasiri@gmail.com",
    description="🧪 Organize Machine Learning Experiments",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/lab-ml/dashboard",
    # install_requires=['machine_learning_lab'],
    install_requires=[],
    packages=['lab_dashboard'],
    entry_points={
        'console_scripts': ['lab_dashboard=lab_dashboard:start_server'],
    },
    include_package_data=True,
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        'Intended Audience :: Developers',
        'Intended Audience :: Science/Research',
        'Topic :: Scientific/Engineering',
        'Topic :: Scientific/Engineering :: Mathematics',
        'Topic :: Scientific/Engineering :: Artificial Intelligence',
        'Topic :: Software Development',
        'Topic :: Software Development :: Libraries',
        'Topic :: Software Development :: Libraries :: Python Modules',
    ],
    keywords='machine learning',
)
