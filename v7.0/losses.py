# -*- coding: utf-8 -*-

#
# Part 7 Loss Functions
#

import tensorflow as tf
from tensorflow.python.keras.utils import losses_utils
from tensorflow.python.keras.losses import LossFunctionWrapper

# A regularizer to keep the map inside the box.
# It's so the sliders and notes don't randomly fly out of the screen!
def inblock_loss(vg, border, value):
    wall_var_l = tf.where(tf.less(vg, border), tf.square(value - vg), 0 * vg);
    wall_var_r = tf.where(tf.greater(vg, 1 - border), tf.square(vg - (1 - value)), 0 * vg);
    return tf.reduce_mean(tf.reduce_mean(wall_var_l + wall_var_r, axis=2), axis=1);

# Loss functions and mapping layer, to adapt to TF 2.0
class GenerativeCustomLoss(LossFunctionWrapper):
    """
    This loss function is used in the generative model.
    It uses "1 - classification" as loss = good if it's classified as true sample, bad if classified as false.
    """
    def __init__(self,
        reduction=losses_utils.ReductionV2.SUM_OVER_BATCH_SIZE,
        name='generative_custom_loss'):

        def loss_function_for_generative_model(y_true, y_pred):
            classification = y_pred;
            loss1 = 1 - tf.reduce_mean(classification, axis=1);
            return loss1;

        super(GenerativeCustomLoss, self).__init__(loss_function_for_generative_model, name=name, reduction=reduction)

class BoxCustomLoss(LossFunctionWrapper):
    """
    Checks if note_start and note_end positions are within boundaries.
    If it gets close to the boundary then this loss function will produce positive value. Otherwise it is zero.
    """
    def __init__(self,
        border,
        value,
        reduction=losses_utils.ReductionV2.SUM_OVER_BATCH_SIZE,
        name='generative_custom_loss'):

        self.loss_border = border
        self.loss_value = value

        def box_loss(y_true, y_pred):
            map_part = y_pred;
            return inblock_loss(map_part[:, :, 0:2], self.loss_border, self.loss_value) + inblock_loss(map_part[:, :, 4:6], self.loss_border, self.loss_value)

        super(BoxCustomLoss, self).__init__(box_loss, name=name, reduction=reduction)

class AlwaysZeroCustomLoss(LossFunctionWrapper):
    """
    Why does TF not include this? This is very useful in certain situations
    """
    def __init__(self,
        reduction=losses_utils.ReductionV2.SUM_OVER_BATCH_SIZE,
        name='generative_custom_loss'):

        def alw_zero(y_true, y_pred):
            return tf.convert_to_tensor(0, dtype=tf.float32);

        super(AlwaysZeroCustomLoss, self).__init__(alw_zero, name=name, reduction=reduction)

