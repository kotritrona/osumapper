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

def step5_set_params(note_density=0.24, hold_favor=0, divisor_favor=[0] * divisor, hold_max_ticks=8, hold_min_return=1, rotate_mode=4):
    return note_density, hold_favor, divisor_favor, hold_max_ticks, hold_min_return, rotate_mode;

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

    note_density, hold_favor, divisor_favor, hold_max_ticks, hold_min_return, rotate_mode = params;

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
    preds[:, 2] += hold_favor;
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

    return is_obj_pred, another_pred_result, timestamps, ticks, div_data;

def read_key_count_from_json(file = "mapthis.json"):
    """
    Read key count from mapthis.json file
    """

    with open(file, encoding="utf-8") as map_json:
        map_dict = json.load(map_json)
        map_diff = map_dict["diff"]
        circle_size = map_diff["CS"]

    return circle_size

def load_pattern_dataset(key_count, pattern_dataset):
    """
    Load the dataset saved in mania_act_flow_ds, limiting to only key_count of current map
    """
    with np.load(pattern_dataset) as data:
        avail_note_begin =   data["{}k_avail_note_begin".format(key_count)]
        avail_note_end =     data["{}k_avail_note_end".format(key_count)]
        avail_hold =         data["{}k_avail_hold".format(key_count)]
        pattern_note_begin = data["{}k_pattern_note_begin".format(key_count)]
        pattern_note_end =   data["{}k_pattern_note_end".format(key_count)]
    return avail_note_begin, avail_note_end, avail_hold, pattern_note_begin, pattern_note_end

def array_to_flags(arr):
    return sum([k*2**i for i,k in enumerate(arr)])

def bitwise_contains(container, item):
    return np.bitwise_and(np.bitwise_not(container), item) == 0

def get_data_pattern_groups(data, note_metronome_group, note_end_metronome_group, hold_metronome_group=[], hold_min_return=1):
    """
    note_metronome_group should be from a single metronome (16 ticks)
    np.array of integers 0-15

    Finds a pattern group from the dataset in priority of:
    note_begin match + note_end match + note_hold match
    > note_begin match + note_end match
    > note_begin match
    > empty (makes it use a random one)
    """
    avail_note_begin, avail_note_end, avail_hold, pattern_note_begin, pattern_note_end = data
    metronome_length = pattern_note_begin.shape[1]

    # First step match note start
    match_avail = [(1 if i in note_metronome_group else 0) for i in range(metronome_length)]
    match_avail_flags = array_to_flags(match_avail)

    avail_filter = bitwise_contains(avail_note_begin, match_avail_flags)

    pattern_note_begin_filtered = pattern_note_begin[avail_filter]
    pattern_note_end_filtered =   pattern_note_end[avail_filter]
    avail_note_end_filtered =     avail_note_end[avail_filter]
    hold_avail_flags_filtered =   avail_hold[avail_filter]

    if len(pattern_note_begin_filtered) == 0:
        return pattern_note_begin_filtered, pattern_note_end_filtered

    # Second step match note end
    match_avail_end = [(1 if i in note_end_metronome_group else 0) for i in range(metronome_length)]
    match_avail_end_flags = array_to_flags(match_avail_end)

    avail_end_filter = bitwise_contains(avail_note_end_filtered, match_avail_end_flags)

    pattern_note_begin_filtered_2 = pattern_note_begin_filtered[avail_end_filter]
    pattern_note_end_filtered_2 =   pattern_note_end_filtered[avail_end_filter]
    hold_avail_flags_filtered_2 =     hold_avail_flags_filtered[avail_end_filter]

    if len(pattern_note_begin_filtered_2) == 0:
        return pattern_note_begin_filtered, pattern_note_end_filtered

    # Third step match hold
    match_avail_hold = [(1 if i in hold_metronome_group else 0) for i in range(metronome_length)]
    match_avail_hold_flags = array_to_flags(match_avail_hold)

    avail_hold_filter = bitwise_contains(hold_avail_flags_filtered_2, match_avail_hold_flags)

    pattern_note_begin_filtered_3 = pattern_note_begin_filtered_2[avail_hold_filter]
    pattern_note_end_filtered_3 =   pattern_note_end_filtered_2[avail_hold_filter]

    if len(pattern_note_begin_filtered_3) < hold_min_return:
        return pattern_note_begin_filtered_2, pattern_note_end_filtered_2
    else:
        return pattern_note_begin_filtered_3, pattern_note_end_filtered_3

def get_randomized_pattern_group(key_count, metronome_length, note_metronome_group):
    group = np.zeros((metronome_length, key_count), dtype=int)
    max_note_count = key_count // 2
    if max_note_count == 0:
        max_note_count = 1
    for t in note_metronome_group:
        if t>0:
            random_from = [i for i in range(key_count) if group[t-1, i] == 0]
        else:
            random_from = [i for i in range(key_count)]

        if len(random_from) == 0:
            random_from = [i for i in range(key_count)]
        note_count = np.random.randint(0, max_note_count) + 1
        notes = np.random.choice(random_from, size = (note_count,), replace=False)
        for k in notes:
            group[t, k] = 1
    return group

def get_pattern_group(data, note_metronome_group, note_end_metronome_group, hold_metronome_group=[], hold_min_return=1):
    """
    Get a random group of pattern from the dataset.
    If it cannot find possible group in hs_data, create a randomized group.
    """

    metronome_length = data[3].shape[1]
    key_count = data[3].shape[2]

    if data[3].shape[0] == 0: # No data. Skip data and get random.
        randomized_group = get_randomized_pattern_group(key_count, metronome_length, note_metronome_group)
        return randomized_group, randomized_group, False

    note_begin_patterns, note_end_patterns = get_data_pattern_groups(data, note_metronome_group, note_end_metronome_group, hold_metronome_group, hold_min_return)

    if len(note_begin_patterns) > 0:
        rand_index = np.random.randint(0, note_begin_patterns.shape[0])
        return note_begin_patterns[rand_index], note_end_patterns[rand_index], True
    else:
        randomized_group = get_randomized_pattern_group(key_count, metronome_length, note_metronome_group)
        return randomized_group, randomized_group, False

def filter_pattern_group(note_begin_pattern, note_end_pattern, note_metronome_group, note_end_metronome_group):
    """
    The pattern group from dataset contains all notes. This filters it to only notes present in the new map
    """
    for i,p in enumerate(note_begin_pattern):
        if i not in note_metronome_group:
            note_begin_pattern[i] *= 0
    for i,p in enumerate(note_end_pattern):
        if i not in note_end_metronome_group:
            note_end_pattern[i] *= 0
    return note_begin_pattern, note_end_pattern

def rotate_pattern_group(note_begin_pattern, note_end_pattern, mode=0):
    if mode == 0:
        return note_begin_pattern, note_end_pattern
    if mode == 1: # randomize
        indices = [i for i in range(note_begin_pattern.shape[1])] # key_count
        np.random.shuffle(indices)
        return note_begin_pattern[:, indices], note_end_pattern[:, indices]
    if mode == 2: # mirror
        if np.random.randint(0, 2) == 0:
            indices = [i for i in range(note_begin_pattern.shape[1])]
            indices.reverse()
            return note_begin_pattern[:, indices], note_end_pattern[:, indices]
        else:
            return note_begin_pattern, note_end_pattern
    if mode == 3: # rotate
        key_count = note_begin_pattern.shape[1]
        begin = np.random.randint(0, key_count)
        indices = [(i + begin) % key_count for i in range(key_count)]
        return note_begin_pattern[:, indices], note_end_pattern[:, indices]
    if mode == 4: # rotate+mirror
        key_count = note_begin_pattern.shape[1]
        begin = np.random.randint(0, key_count)
        indices = [(i + begin) % key_count for i in range(key_count)]
        if np.random.randint(0, 2) == 0:
            indices.reverse()
        return note_begin_pattern[:, indices], note_end_pattern[:, indices]

def get_converted_pattern_group(data, note_metronome_group, note_end_metronome_group, hold_metronome_group=[], hold_min_return=1, rotate_mode=4):
    note_begin_pattern, note_end_pattern, convert = get_pattern_group(data, note_metronome_group, note_end_metronome_group,
                                                                    hold_metronome_group=hold_metronome_group,
                                                                    hold_min_return=hold_min_return)
    if convert:
        note_begin_pattern, note_end_pattern = filter_pattern_group(note_begin_pattern, note_end_pattern, note_metronome_group, note_end_metronome_group)
        note_begin_pattern, note_end_pattern = rotate_pattern_group(note_begin_pattern, note_end_pattern, mode=rotate_mode)

    return note_begin_pattern, note_end_pattern

def get_metronome_groups(b, e, h):
    return [i for i,k in enumerate(b) if k==1], [i for i,k in enumerate(e) if k==1], [i for i,k in enumerate(h) if k==1]

def group_notes_to_pattern(data, b_group, e_group, h_group, hold_min_return=1, rotate_mode=4):
    """
    Sometimes the groups are incomplete. Needs to make sure the output length is the same as input length
    """
    note_metronome_group, note_end_metronome_group, hold_metronome_group = get_metronome_groups(b_group, e_group, h_group)
    note_begin_pattern, note_end_pattern = get_converted_pattern_group(data, note_metronome_group, note_end_metronome_group, hold_metronome_group,
                                                hold_min_return=hold_min_return,
                                                rotate_mode=rotate_mode)

    input_len = len(b_group)
    if note_begin_pattern.shape[0] == input_len:
        return note_begin_pattern, note_end_pattern
    elif note_begin_pattern.shape[0] > input_len:
        return note_begin_pattern[:input_len], note_end_pattern[:input_len]
    else:
        return np.concatenate([note_begin_pattern, np.zeros((input_len - note_begin_pattern.shape[0], note_begin_pattern.shape[1]))], axis=0), np.concatenate([note_end_pattern, np.zeros((input_len - note_end_pattern.shape[0], note_end_pattern.shape[1]))], axis=0)


def step5_build_pattern(rhythm_data, params, pattern_dataset = "mania_pattern_dataset.npz"):
    unfiltered_is_obj_pred, unfiltered_predictions, unfiltered_timestamps_long, unfiltered_ticks_long, unfiltered_div_data = rhythm_data;
    note_density, hold_favor, divisor_favor, hold_max_ticks, hold_min_return, rotate_mode = params;

    unfiltered_timestamps = unfiltered_timestamps_long[:unfiltered_is_obj_pred.shape[0]]
    unfiltered_ticks = unfiltered_ticks_long[:unfiltered_is_obj_pred.shape[0]]

    # key_fix, pattern_rotate
    # key_fix: remove_front, remove_end, divert
    # remove dist_multiplier

    unfiltered_objs = unfiltered_is_obj_pred[:, 0];
    unfiltered_sv = (unfiltered_div_data[:,2 + divisor] + 1) * 150;
    unfiltered_is_hold = unfiltered_predictions[:, 2];
    unfiltered_note_end = unfiltered_predictions[:, 4]; # check again if this is 0/1

    obj_indices = [i for i,k in enumerate(unfiltered_objs) if k == 1 or unfiltered_note_end[i] == 1];

    # load key count from json
    key_count = read_key_count_from_json()

    # Fallback for local version
    if not os.path.isfile(pattern_dataset) and pattern_dataset == "mania_pattern_dataset.npz":
        print("Pattern dataset not found! Trying default model...")
        pattern_dataset = "models/mania_pattern/mania_pattern_dataset.npz"

    # load pattern data
    pattern_data = load_pattern_dataset(key_count, pattern_dataset)

    metronome_length = pattern_data[3].shape[1]

    map_pattern_note_begin = []
    map_pattern_note_end = []

    current_group_note_begin = []
    current_group_note_end = []
    current_group_note_hold = []

    # Generate map pattern
    for i, tick in enumerate(unfiltered_ticks):
        if tick % metronome_length == 0:
            if len(current_group_note_begin) > 0:
                note_begin_pattern, note_end_pattern = group_notes_to_pattern(pattern_data, current_group_note_begin, current_group_note_end, current_group_note_hold, hold_min_return=hold_min_return, rotate_mode=rotate_mode)

                map_pattern_note_begin.append(note_begin_pattern)
                map_pattern_note_end.append(note_end_pattern)

            current_group_note_begin = []
            current_group_note_end = []
            current_group_note_hold = []

        if unfiltered_objs[i]:
            current_group_note_begin.append(1)
        else:
            current_group_note_begin.append(0)
        if unfiltered_note_end[i]:
            current_group_note_end.append(1)
        else:
            current_group_note_end.append(0)
        if unfiltered_is_hold[i]:
            current_group_note_hold.append(1)
        else:
            current_group_note_hold.append(0)

    # Final group
    if len(current_group_note_begin) > 0:
        note_begin_pattern, note_end_pattern = group_notes_to_pattern(pattern_data, current_group_note_begin, current_group_note_end, current_group_note_hold,
                                                                      hold_min_return=hold_min_return,
                                                                      rotate_mode=rotate_mode)

        map_pattern_note_begin.append(note_begin_pattern)
        map_pattern_note_end.append(note_end_pattern)

    # Obtain big array
    note_begin_array = np.concatenate(map_pattern_note_begin, axis=0)
    note_end_array = np.concatenate(map_pattern_note_end, axis=0)
    timestamps_array = unfiltered_timestamps

    objs_each_key = []

    for k in range(key_count):
        note_begin_key = note_begin_array[:, k]
        note_end_key = note_end_array[:, k]

        objs_current_key = []

        is_holding = False
        hold_start = -1
        hold_start_index = -1
        for i, has_note_begin in enumerate(note_begin_key):
            has_note_end = note_end_key[i]
            timestamp = timestamps_array[i]

            if is_holding:
                if has_note_end or has_note_begin or i >= hold_start_index + hold_max_ticks:
                    is_holding = False
                    objs_current_key.append((hold_start, timestamp, k, hold_start_index))
            else:
                if has_note_begin and has_note_end:
                    objs_current_key.append((timestamp, timestamp, k, i))
                elif has_note_begin:
                    is_holding = True
                    hold_start = timestamp
                    hold_start_index = i

        objs_each_key.append(objs_current_key)

    return objs_each_key

def merge_objects_each_key(objs_each_key):
    """
    Merge all objects to a single array and sort against time.
    Also outputs key count.
    """
    objs = []
    for obj_group in objs_each_key:
        objs += obj_group

    dt = np.dtype([('b', int),('e', int),('k', int),('t', int)])
    a = np.array(objs, dtype = dt)

    return np.sort(a, order = 'b'), len(objs_each_key)

def mania_key_fix(objs_each_key, mode=0):
    """
    Remove the 1/4 spaced adjacent notes to make the map perfectly playable.
    It's a lazy hack for the obvious loophole in the note pattern algorithm.
    Should set to inactive for low key counts.

    mode 0: inactive
    mode 1: remove latter note
    mode 2: remove former note
    mode 3: move note to next lane
    mode 4: mode note to next lane, limiting to no adjacent note in next lane (should be internal use only)
    """
    if mode == 0:
        return objs_each_key
    if mode == 1:
        for k, objs in enumerate(objs_each_key):
            prev_obj = (-1, -1, -1, -100)
            filtered_objs = []
            for i, obj in enumerate(objs):
                if obj[3] > prev_obj[3] + 1:
                    filtered_objs.append(obj)
                    prev_obj = obj
            objs_each_key[k] = filtered_objs
        return objs_each_key
    if mode == 2:
        for k, objs in enumerate(objs_each_key):
            prev_obj = (-1, -1, -1, 2147483647)
            filtered_objs = []
            for i, obj in reversed(list(enumerate(objs))):
                if obj[3] < prev_obj[3] - 1:
                    filtered_objs.append(obj)
                    prev_obj = obj
            objs_each_key[k] = filtered_objs
        return objs_each_key
    if mode == 3 or mode == 4:
        for k in range(len(objs_each_key)):
            objs = objs_each_key[k]
            prev_obj = (-1, -1, -1, -100)
            filtered_objs = []
            for i, obj in enumerate(objs):
                if obj[3] > prev_obj[3] + 1:
                    filtered_objs.append(obj)
                    prev_obj = obj
                else:
                    target_key = (k+1) % len(objs_each_key)
                    target_key_objs = objs_each_key[target_key]
                    j = 0
                    while target_key_objs[j][3] <= obj[3]:
                        j += 1
                        if j == len(target_key_objs):
                            break
                    j -= 1
                    if mode == 3: # check if target spot is empty
                        if j != len(target_key_objs) - 1:
                            check_next = target_key_objs[j+1]
                            if check_next[0] <= obj[1]:
                                continue
                        if target_key_objs[j][1] + 50 < obj[0]:
                            new_obj = (obj[0], obj[1], target_key, obj[3])
                            target_key_objs = target_key_objs[:j+1] + [new_obj] + target_key_objs[j+1:]
                            objs_each_key[target_key] = target_key_objs
                    if mode == 4: # check if target spot is empty and has no possible double keys
                        if j != len(target_key_objs) - 1:
                            check_next = target_key_objs[j+1]
                            if check_next[0] <= obj[1] or check_next[3] <= obj[3] + 1:
                                continue
                        if target_key_objs[j][1] + 50 < obj[0] and target_key_objs[j][3] + 1 < obj[3]:
                            new_obj = (obj[0], obj[1], target_key, obj[3])
                            target_key_objs = target_key_objs[:j+1] + [new_obj] + target_key_objs[j+1:]
                            objs_each_key[target_key] = target_key_objs

            objs_each_key[k] = filtered_objs

        if mode == 3: # if mode is 3, do another pass with mode 4
            return mania_key_fix(objs_each_key, mode=4)
        return objs_each_key


def mania_modding(objs_each_key, modding_params):
    """
    I included it here since there is no reason to separate it into another file.
    Does modding on the mania objects each key.
    """
    objs_each_key = mania_key_fix(objs_each_key, mode = modding_params["key_fix"])
    return objs_each_key
