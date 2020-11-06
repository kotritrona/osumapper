# -*- coding: utf-8 -*-

#
# Step 6 action script
#

import tensorflow as tf
from tensorflow import keras
import numpy as np
import os, re, json

divisor = 4;

def read_npz(fn):
    with np.load(fn) as data:
        wav_data = data["wav"];
        wav_data = np.swapaxes(wav_data, 2, 3);
        ticks = data["ticks"];
        timestamps = data["timestamps"];
        extra = data["extra"];

        # Extra vars
        bpms = extra[0];
        slider_lengths = extra[1];
        ex1 = (60000 / bpms) / 500 - 1;
        ex2 = bpms / 120 - 1;
        ex3 = slider_lengths / 150 - 1;

        # This might be confusing: "i" is the index of the tick, "k" is the tick count inside the uninherited timing section (red line)
        # For most of the cases these are the same numbers, but for maps with multiple timing sections they're different
        div_data = np.array([divisor_array(k) + [ex1[i], ex2[i], ex3[i]] for i, k in enumerate(ticks)]);
    return wav_data, div_data, ticks, timestamps;

def divisor_array(k):
    d_range = list(range(0, divisor));
    return [int(k % divisor == d) for d in d_range];

def step5_set_divisor(x = 4):
    global divisor;
    divisor = x;

def step5_set_params(dist_multiplier=1, note_density=0.24, slider_favor=0, divisor_favor=[0] * divisor, slider_max_ticks=8):
    return dist_multiplier, note_density, slider_favor, divisor_favor, slider_max_ticks;

def step5_load_model(model_file="saved_rhythm_model"):
    # Fallback for local version
    if not os.path.isfile(model_file) and model_file == "saved_rhythm_model":
        print("Model not trained! Trying default model...")
        model_file = "models/default/rhythm_model"

    model = tf.keras.models.load_model(
        model_file,
        custom_objects=None,
        compile=False
    );
    model.compile(loss='mse',
                optimizer=tf.optimizers.RMSprop(0.001),
                metrics=[keras.metrics.mae]);
    return model;

def step5_load_npz():
    fn = "mapthis.npz";

    return read_npz(fn);

def step5_predict_notes(model, npz, params):

    # Get npz data
    test_data, div_data, ticks, timestamps = npz;

    dist_multiplier, note_density, slider_favor, divisor_favor, slider_max_ticks = params;

    # Make time intervals from test data
    time_interval = 16;
    if test_data.shape[0]%time_interval > 0:
        test_data = test_data[:-(test_data.shape[0]%time_interval)];
        div_data = div_data[:-(div_data.shape[0]%time_interval)];
    test_data2 = np.reshape(test_data, (-1, time_interval, test_data.shape[1], test_data.shape[2], test_data.shape[3]))
    div_data2 = np.reshape(div_data, (-1, time_interval, div_data.shape[1]))

    test_predictions = model.predict([test_data2, div_data2]);
    preds = test_predictions.reshape(-1, test_predictions.shape[2]);

    # Favor sliders a little
    preds[:, 2] += slider_favor;
    divs = div_data2.reshape(-1, div_data2.shape[2]);
    margin = np.sum([divisor_favor[k] * divs[:, k] for k in range(0, divisor)]);

    preds[:, 0] += margin;

    # Predict is_obj using note_density
    obj_preds = preds[:, 0];
    target_count = np.round(note_density * obj_preds.shape[0]).astype(int);
    borderline = np.sort(obj_preds)[obj_preds.shape - target_count];
    is_obj_pred = np.expand_dims(np.where(preds[:, 0] > borderline, 1, 0), axis=1);

    obj_type_pred = np.sign(preds[:, 1:4] - np.tile(np.expand_dims(np.max(preds[:, 1:4], axis=1), 1), (1, 3))) + 1;
    others_pred = (1 + np.sign(preds[:, 4:test_predictions.shape[1]] + 0.5)) / 2;
    another_pred_result = np.concatenate([is_obj_pred, is_obj_pred * obj_type_pred, others_pred], axis=1);

    print("{} notes predicted.".format(np.sum(is_obj_pred)));

    return is_obj_pred, another_pred_result, timestamps, ticks, div_data, dist_multiplier;

def step5_convert_sliders(data, params):
    unfiltered_is_obj_pred, unfiltered_predictions, unfiltered_timestamps, unfiltered_ticks, unfiltered_div_data, dist_multiplier = data;
    dist_multiplier, note_density, slider_favor, divisor_favor, slider_max_ticks = params;

    unfiltered_objs = unfiltered_is_obj_pred[:, 0];
    unfiltered_sv = (unfiltered_div_data[:,2 + divisor] + 1) * 150;

    obj_indices = [i for i,k in enumerate(unfiltered_objs) if k == 1 or unfiltered_predictions[i, 4] == 1];

    first_step_objs =        unfiltered_objs[obj_indices];
    first_step_predictions = unfiltered_predictions[obj_indices];
    first_step_ticks =       unfiltered_ticks[obj_indices];
    first_step_timestamps =  unfiltered_timestamps[obj_indices];
    first_step_sv =          unfiltered_sv[obj_indices];

    first_step_is_slider =   first_step_predictions[:, 2];
    first_step_is_spinner =  first_step_predictions[:, 3];
    first_step_is_note_end = first_step_predictions[:, 4];

    # convert notes with is_slider flag to sliders
    # if there is next note, slide to next note
    # else, slide for [max] ticks

    skip_this = False;
    new_obj_indices = [];
    slider_ticks = [];
    for i in range(len(first_step_objs)):
        if skip_this or not first_step_objs[i]: # not first_step_objs = slider end
            first_step_is_slider[i] = 0;
            skip_this = False;
            continue;
        if first_step_is_slider[i]: # this one is a slider!!
            if i == first_step_objs.shape[0]-1: # Last Note.
                new_obj_indices.append(i);
                slider_ticks.append(slider_max_ticks);
                continue;
            if first_step_ticks[i+1] >= first_step_ticks[i] + slider_max_ticks + 1: # too long! end here
                new_obj_indices.append(i);
                slider_ticks.append(slider_max_ticks);
            else:
                skip_this = True; # skip the next note or slider end, and slide to that tick
                new_obj_indices.append(i);
                slider_ticks.append(max(1, first_step_ticks[i+1] - first_step_ticks[i]));
        else: # not a slider!
            new_obj_indices.append(i);
            slider_ticks.append(0);

    # Filter the removed objects out!
    objs =        first_step_objs[new_obj_indices];
    predictions = first_step_predictions[new_obj_indices];
    ticks =       first_step_ticks[new_obj_indices];
    timestamps =  first_step_timestamps[new_obj_indices];
    is_slider =   first_step_is_slider[new_obj_indices];
    is_spinner =  first_step_is_spinner[new_obj_indices];
    is_note_end = first_step_is_note_end[new_obj_indices];
    sv =          first_step_sv[new_obj_indices];
    slider_ticks = np.array(slider_ticks);

    return objs, predictions, ticks, timestamps, is_slider, is_spinner, is_note_end, sv, slider_ticks, dist_multiplier;

def step5_save_predictions(data):
    objs, predictions, ticks, timestamps, is_slider, is_spinner, is_note_end, sv, slider_ticks, dist_multiplier = data;

    np.savez_compressed("rhythm_data",
        objs = objs,
        predictions = predictions,
        ticks = ticks,
        timestamps = timestamps,
        is_slider = is_slider,
        is_spinner = is_spinner,
        is_note_end = is_note_end,
        sv = sv,
        slider_ticks = slider_ticks,
        dist_multiplier = dist_multiplier);