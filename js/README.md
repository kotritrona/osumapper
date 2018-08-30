Work in progress: a web interface for osumapper using tensorflow.js.

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

error: computeMask is not implemented for RNN yet
fix:   rnn.computeMask = denseLayer1.computeMask;

YES

and cannot support grads for less and greater
(although it should not be differentiable at all, how did the original tf deal with this)

I should play more games
