# osumapper
An automatic beatmap generator using Tensorflow / Deep Learning.

requirements:
- tensorflow v1.9.0 - v1.10.0
- common python libs
- pip install soundfile
- node.js
- npm i polynomial
- ffmpeg

how to run the model:
1. prepare a maplist.txt containing .osu files and run 01_osumap_loader.ipynb
2. run 02_osurhythm_estimator.ipynb
3. run 03_osurhythm_momentum_estimator.ipynb
4. have a rest since #4 is not currently used
5. prepare a new song with timing and run 05_newsong_importer.ipynb
6. run 06_osurhythm_evaluator.ipynb
7. run 07_osuflow_evaluator_from_rhythm.ipynb
8. find the generated .osu file under the ipynb folder and try it out in osu!

if you don't have a good idea about what map to train with, you can use the default model and start from step #5.

tested env:
- win10, canopy, python3.5, tf1.9.0, no cuda
- win10, canopy, python3.5, tf1.10.0, no cuda

current progress:

- stage0 85%
- stage1 (completed)
- stage2 (completed)
- stage3 (completed)
- stage4 (completed)
- stage5 (completed)
- stage6 (completed)
- stage7 (completed)
- stage8 (?)
- description 15%
- more testing 30%
- tensorflow.js 0%
- code comments -550%
- create a map and rank it -99,999,999%

TODO:

- stream regulation (done)
- slider shape classification
- spinner classification (kind of think this is impossible...)

current problems

- gcolab randomly crash when loading model if GPU is enabled
adding sess = tf.InteractiveSession() may fix it, but it will still run out of memory
