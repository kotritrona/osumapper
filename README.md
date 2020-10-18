# osumapper

An automatic beatmap generator using Tensorflow / Deep Learning.

demo map: https://osu.ppy.sh/beatmapsets/834264

## Colaboratory

https://colab.research.google.com/github/kotritrona/osumapper/blob/master/v7.0/Colab.ipynb

## About v7.0

Currently WIP. You can use 6.2 or try it out now.

## Installation & Model Running

- Refer to https://github.com/kotritrona/osumapper/tree/master/v6.2 for version 6.2
- Refer to https://github.com/kotritrona/osumapper/tree/master/v7.0 for version 7.0

## Important tip for model training

Don't train with every single map in your osu!. That's not how machine learning works!

I would suggest you select only maps you think are well made, for instance a mapset that contains all 5.0 ~ 6.5☆ maps mapped by (insert mapper name).

## Maplist.txt creation:
- I have made a maplist generator under `v7.0/` folder. Run `node gen_maplist.js` under the directory to start.
- the other way to create a maplist.txt file to train the model is by using the maplist creator.py script (found in v6.2 folder). running this should overwrite the maplist.txt in the folder with a new one using the maps from the collection folder you have specified.

## Model Specification
[Structure diagram](osunn_structure.jpg)

- Rhythm model
  - CNN/LSTM + dense layers
  - input music FFTs (7 time_windows x 32 fft_size x 2 (magnitude, phase))
  - additional input timing (is_1/1, is_1/4, is_1/2, is_the_other_1/4, BPM, tick_length, slider_length)
  - output (is_note, is_circle, is_slider, is_spinner, is_sliding, is_spinning) for 1/-1 classification
- Momentum model
  - Same structure as above
  - output (momentum, angular_momentum) as regression
  - momentum is distance over time. It should be proportional to circle size which I may implement later.
  - angular_momentum is angle over time. currently unused.
- Slider model
  - was designed to classify slider lengths and shapes
  - currently unused
- Flow model
  - uses GAN to generate the flow.
  - takes 10 notes as a group and train them each time
  - Generator: some dense layers, input (randomness x 50), output (cos_list x 20, sin_list x 20)
  - this output is then fed into a map generator to build a map corresponding to the angular values
  - map constructor output: (x_start, y_start, vector_out_x, vector_out_y, x_end, y_end) x 10
  - Discriminator: simpleRNN, some dense layers, input ↑, output (1,) ranging from 0 to 1
  - every big epoch(?), trains generator for 7 epochs and then discriminator 3 epochs
  - trains 6 ~ 25 big epochs each group. mostly 6 epochs unless the generated map is out of the mapping region (0:512, 0:384).
- Beatmap Converter
  - uses node.js to convert between map position data and .osu file
  - ~~most of its code is from 5 years ago~~

## Citing

If you want to cite osumapper in a scholarly work, please cite the github page. I'm not going to write a paper for it.