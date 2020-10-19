# -*- coding: utf-8 -*-

#
# Part 7 function base
#

import numpy as np

def read_map_predictions(fn):
    with np.load(fn) as data:
        objs =            data["objs"];
        predictions =     data["predictions"];
        ticks =           data["ticks"];
        timestamps =      data["timestamps"];
        is_slider =       data["is_slider"];
        is_spinner =      data["is_spinner"];
        is_note_end =     data["is_note_end"];
        sv =              data["sv"];
        slider_ticks    = data["slider_ticks"];
        dist_multiplier = data["dist_multiplier"];
    return objs, predictions, ticks, timestamps, is_slider, is_spinner, is_note_end, sv, slider_ticks, dist_multiplier;