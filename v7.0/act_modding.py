'use strict'; # In case of future updates if Python wanted to mimic JS

#
# Part 7 Modding
#

from stream_tools import stream_regularizer;

def step7_modding(obj_array, data, params):
    if "stream_regularizer" not in params:
        params["stream_regularizer"] = 0;

    obj_array, data = stream_regularizer(obj_array, data, mode = params["stream_regularizer"]);

    return obj_array, data;