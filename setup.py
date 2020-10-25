import setuptools

with open("readme.rst", "r") as f:
    long_description = f.read()


setuptools.setup(
    name='labml_dashboard',
    version='0.4.21',
    author="Varuna Jayasiri",
    author_email="vpjayasiri@gmail.com",
    description="Dashboard for Lab: Organize Machine Learning Experiments",
    long_description=long_description,
    long_description_content_type="text/x-rst",
    url="https://github.com/lab-ml/dashboard",
    project_urls={
        'Documentation': 'https://lab-ml.com/'
    },
    install_requires=['labml'],
    packages=['labml_dashboard'],
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
