# -*- coding: utf-8 -*-

#
# Part 7 Modding
#

from stream_tools import stream_regularizer;
from slider_tools import slider_mirror;

def step7_modding(obj_array, data, params):
    if "stream_regularizer" not in params:
        params["stream_regularizer"] = 0;

    obj_array, data = stream_regularizer(obj_array, data, mode = params["stream_regularizer"]);
    obj_array, data = slider_mirror(obj_array, data, mode = params["slider_mirror"]);

    return obj_array, data;