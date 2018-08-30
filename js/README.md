Work in progress: a web interface for osumapper using tensorflow.js.

It probably works now! just open connected_test.html, load mp3 in the upper file input, .osu timing in the lower file input, then press debug.

Only UI left! (?)

Progress:

- Get TFJS working                          100%
- Read MP3 data with webaudio               100%
- Try out the BPM Analyzer                  100% (but it was only accurate 50% of the time)
- Figure out how to import the keras model  92.5%
  - Fix the 5D tensor problem               1%
- Build up a GAN using the JS version       80%
  - Optimize nn structure for performance   10%
- Port other code besides GAN to JS         100%
- Connect the data flow                     100%
- Draw a cute UI                            5%
- Actually implement a cute UI              0%
- Become cute                               0%
- Testing                                   25%

I managed to use RNN even if computeMask is not implemented!!!

````
error: computeMask is not implemented for RNN yet
fix:   rnn.computeMask = denseLayer1.computeMask;
````

The Tensorflow JS version has some features currently not implemented, so it uses a simplified version of the model

I should test if it can get actually results close to the original one. If not, try to fix the "5D tensor problem" to use the full model instead.
