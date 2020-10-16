# osumapper v7.0

This version uses Tensorflow v2.3.1.

## TODO NEXT

- train models
- test with various maps
- make sure colab works
- make maplist generator

## Colaboratory

Use Colab.ipynb (TODO: Make sure it works)

## Installation

Windows

- install [Anaconda3](https://www.anaconda.com/products/individual#windows)
- install [node.js](https://nodejs.org/)
- git clone or download this repository
- use Anaconda Prompt and cd into this directory (osumapper/v7.0/)
- run `install.bat`

Linux (Ubuntu)

- install Python 3.8
- run `./install`

Other Linux

- install Python 3.8
- Open `install` file with a text editor
- change "apt" to the correct package manager
- run `./install`

## Running

- start Jupyter Notebook
- run 01_Training.ipynb for training
- run 02_Mapmaking.ipynb for map making

## Difference from previous versions

- Cleaned up code, removed much useless code
- Moved code from notebook to python files and integrated pipeline together
- Uses librosa to read audio file
- Removed soundfile and pandas dependency
- Added TimingAnalyz support to achieve full auto-mapping (great tool made by [statementreply](https://osu.ppy.sh/users/126198))

## Citing

If you want to cite osumapper in a scholarly work, please cite the github page. I'm not going to write a paper for it.