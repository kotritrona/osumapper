# -*- coding: utf-8 -*-

#
# Slider helpers
#

import numpy as np

def slider_mirror(obj_array, data, mode=0):
    """
    Mirror sliders if the slider end is out of bounds.
    """
    if mode == 0:
        return obj_array, data;

    _, _, _, _, is_slider, _, _, _, _, _, _, _ = data;

    min_x = 0
    min_y = 0
    max_x = 512
    max_y = 384

    for i,obj in enumerate(obj_array):
        if is_slider[i]:
            if obj[4] < min_x or obj[4] > max_x:
                obj[4] = obj[0] + (obj[0] - obj[4])
                obj[2] = -obj[2]
            if obj[5] < min_y or obj[5] > max_y:
                obj[5] = obj[1] + (obj[1] - obj[5])
                obj[3] = -obj[3]

    return obj_array, data;
