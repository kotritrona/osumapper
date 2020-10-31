# osumapper v7.0

This version uses Tensorflow v2.3.1.

v7.0 demo map 1 (low BPM): https://osu.ppy.sh/beatmapsets/1290030

v7.0 demo map 2 (high BPM): https://osu.ppy.sh/beatmapsets/1290026

## Colaboratory

https://colab.research.google.com/github/kotritrona/osumapper/blob/master/v7.0/Colab.ipynb

For mania mode: [mania_Colab.ipynb](https://colab.research.google.com/github/kotritrona/osumapper/blob/master/v7.0/mania_Colab.ipynb)

## Complete guide for a newcomer in osu! mapping

https://github.com/kotritrona/osumapper/wiki/Complete-guide:-creating-beatmap-using-osumapper

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

## Maplist Generator

- Run `node gen_maplist.js` under the directory to use the maplist generator

## Training in Colaboratory

- You have to generate .npz map data using the first code block of 01_Training.ipynb and upload them to Google Drive
- After that, use https://colab.research.google.com/github/kotritrona/osumapper/blob/master/v7.0/Colab_Training.ipynb

## Difference from previous versions

- Cleaned up code, removed much useless code
- Moved code from notebook to python files and integrated pipeline together
- Uses librosa to read audio file
- Removed soundfile and pandas dependency
- Added TimingAnalyz support to achieve full auto-mapping (great tool made by [statementreply](https://osu.ppy.sh/users/126198))

## Citing

If you want to cite osumapper in a scholarly work, please cite the github page. I'm not going to write a paper for it.