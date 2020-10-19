# -*- coding: utf-8 -*-

#
# redundant loss calculation
#

import tensorflow as tf

def stack_loss(tensor):
    complex_list = tf.complex(tensor[:, :, 0] * 512, tensor[:, :, 1] * 384);
    stack_limit = 30;
    precise_limit = 1;
    a = [];
    for k in range(tensor.shape[1]):
        w = tf.tile(tf.expand_dims(complex_list[:, k], axis=1), [1, tensor.shape[1]]);
        r = tf.abs(w - complex_list);
        rless = tf.cast(tf.less(r, stack_limit), tf.float32) * tf.cast(tf.greater(r, precise_limit), tf.float32);
        rmean = tf.reduce_mean(rless * (stack_limit - r) / stack_limit);
        a.append(rmean);
    b = tf.reduce_sum(a);
    return b;

# This polygon loss was an attempt to make the map less likely to overlap each other.
# The idea is: calculate the area of polygon formed from the note positions;
# If it is big, then it is good - they form a convex shape, no overlap.
# ... of course it totally doesn't work like that.
def polygon_loss(tensor):
    tensor_this = tensor[:, :, 0:2];
    tensor_next = tf.concat([tensor[:, 1:, 0:2], tensor[:, 0:1, 0:2]], axis=1);
    sa = (tensor_this[:, :, 0] + tensor_next[:, :, 0]) * (tensor_next[:, :, 1] - tensor_this[:, :, 0]);
    surface = tf.abs(tf.reduce_sum(sa, axis=1))/2;
    return surface;