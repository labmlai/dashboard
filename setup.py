import setuptools

with open("readme.md", "r") as f:
    long_description = f.read()

setuptools.setup(
    name='machine_learning_lab_dashboard',
    version='1.0',
    author="Varuna Jayasiri",
    author_email="vpjayasiri@gmail.com",
    description="🧪 Organize Machine Learning Experiments",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/vpj/lab_dashboard",
    packages=setuptools.find_packages(),
    install_requires=[],
    entry_points = {
        'console_scripts': ['lab_dashboard=lab_dashboard:start_server'],
    },
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
