# -*- coding: utf-8 -*-

#
# JSON osu! map analysis (for osu!mania)
#

import numpy as np;

def get_map_timing_array(map_json, length=-1, divisor=4):
    if length == -1:
        length = map_json["obj"][-1]["time"] + 1000; # it has an extra time interval after the last note
        if map_json["obj"][-1]["type"] & 8: # spinner end
            length = map_json["obj"][-1]["spinnerEndTime"] + 1000;
    uts_a =  map_json["timing"]["uts"];
    out = [];
    for i, uts in enumerate(uts_a):
        begin_time = uts["beginTime"];
        mspb = uts["tickLength"];
        if i < len(uts_a)-1:
            end_time = uts_a[i+1]["beginTime"];
        else:
            end_time = length;
        arr = np.floor(np.arange(begin_time, end_time, mspb / divisor));
        out = out + list(map(lambda f: int(f), arr));
    return out;

def get_tick_len(map_json, tick):
    uts_a = map_json["timing"]["uts"];
    if tick < uts_a[0]["beginTime"]:
        return uts_a[0]["tickLength"];
    _out = 600;
    for uts in uts_a:
        if tick >= uts["beginTime"]:
            _out = uts["tickLength"];
        else:
            return _out;
    return _out;

def get_slider_len(map_json, tick):
    ts_a = map_json["timing"]["ts"];
    if tick < ts_a[0]["beginTime"]:
        return ts_a[0]["sliderLength"];
    _out = 100;
    for ts in ts_a:
        if tick >= ts["beginTime"]:
            _out = ts["sliderLength"];
        else:
            return _out;
    return _out;

def get_slider_len_ts(ts_a, tick):
    if tick < ts_a[0]["beginTime"]:
        return ts_a[0]["sliderLength"];
    _out = 100;
    for ts in ts_a:
        if tick >= ts["beginTime"]:
            _out = ts["sliderLength"];
        else:
            return _out;
    return _out;

def get_end_time(note):
    if note["type"] & 8:
        return note["spinnerEndTime"];
    # elif note["type"] & 2:
    #     return note["sliderData"]["endTime"];
    elif note["type"] & 128:
        return note["holdEndTime"];
    else:
        return note["time"];

# edited from uts to ts
def get_all_ticks_and_lengths_from_ts(uts_array, ts_array, end_time, divisor=4):
    # Returns array of all timestamps, ticklens and sliderlens.
    endtimes = ([uts["beginTime"] for uts in uts_array] + [end_time])[1:];
    timestamps = [np.arange(uts["beginTime"], endtimes[i], uts["tickLength"] / divisor) for i, uts in enumerate(uts_array)];
    ticks_from_uts = [list(range(len(timestamp_group))) for timestamp_group in timestamps];
    tick_len = [[uts["tickLength"]] * len(np.arange(uts["beginTime"], endtimes[i], uts["tickLength"] / divisor)) for i, uts in enumerate(uts_array)];
    # slider_len = [[ts["sliderLength"]] * len(np.arange(ts["beginTime"], endtimes[i], ts["tickLength"] / divisor)) for i, ts in enumerate(ts_array)];
    slider_len = [get_slider_len_ts(ts_array, timestamp) for timestamp in np.concatenate(timestamps)];
    return np.concatenate(ticks_from_uts), np.round(np.concatenate(timestamps)).astype(int), np.concatenate(tick_len), np.array(slider_len);

def is_uts_begin(map_json, tick):
    uts_a =  map_json["timing"]["uts"];
    begin_times = [uts["beginTime"] for uts in uts_a];
    for t in begin_times:
        if tick > t - 1 and tick < t + 5:
            return True
    return False

def get_metronome_count(map_json, tick):
    uts_a = map_json["timing"]["uts"];
    if tick < uts_a[0]["beginTime"]:
        return uts_a[0]["whiteLines"];
    for uts in reversed(uts_a):
        if tick >= uts["beginTime"]:
            return uts["whiteLines"];

def get_map_notes_and_patterns(map_json, **kwargs):
    """
    Reads JSON map data and creates a list for every tick
    Returns:
        data = list of data array: [TICK, TIME, NOTE, NOTE_TYPE, SLIDING, SPINNING, MOMENTUM, Ex1, Ex2, Ex3]
        patterns = numpy array shape (num_groups, main_metronome * divisor, 2 * key_count + 1)
                   [:, :, 0] pattern_avail_hold
                   [:, :, 1:1+key_count] pattern_note_begin
                   [:, :, 1+key_count:1+2*key_count] pattern_note_end

    Ex1, Ex2, Ex3 = tickLength/500, BPM/120, sliderLength/150
    """

    # keyword arguments
    length = kwargs.get("length", -1);
    divisor = kwargs.get("divisor", 4);
    note_max_wait_time = kwargs.get("note_max_wait_time", 1000);
    main_metronome = kwargs.get("main_metronome", 4);

    # constant multipliers and subtractions
    tlen_mp = 1/500;
    tlen_s = 1;
    bpm_mp = 1/120;
    bpm_s = 1;
    slen_mp = 1/150;
    slen_s = 1;

    # get the timing array of timestamps of each tick
    tick_times = get_map_timing_array(map_json, length = length, divisor = divisor);

    objs_all = map_json["obj"];
    key_count = map_json["diff"]["CS"];

    objs_each = [[] for i in range(key_count)];

    for obj in objs_all:
        x = obj["x"]
        obj_key = np.floor(x * key_count / 512).astype(int)
        objs_each[obj_key].append(obj)

    def get_note_type_mania(obj):
        if not obj:
            return 0;
        if obj["type"] & 128:
            return 4;
        return 1;

    # object times each key
    obj_times_each = []
    for objs in objs_each:
        obj_times = [obj["time"] for obj in objs]
        obj_times_each.append(obj_times)

    # object end times each key
    obj_end_times_each = []
    for objs in objs_each:
        obj_end_times = [get_end_time(obj) for obj in objs]
        obj_end_times_each.append(obj_end_times)

    obj_ptr_each = [0] * key_count
    obj_end_ptr_each = [0] * key_count

    po = 0;
    start_time = obj_times[0] - note_max_wait_time;
    last_obj_time = start_time;

    holding_each = [0] * key_count

    data = [];
    pattern_avail_hold = []
    pattern_data = []
    pattern_data_end = []

    pattern_avail_hold_grouped = []
    pattern_data_grouped = []
    pattern_data_end_grouped = []

    # tick count from start of uninherited timing section
    uts_i = 0;

    # tick is timestamp here
    for i, tick in enumerate(tick_times):

        if is_uts_begin(map_json, tick):
            uts_i = 0;
        else:
            uts_i += 1;

        # save group in a metronome when at the start of next metronome
        metronome = get_metronome_count(map_json, tick)
        if uts_i % (metronome * divisor) == 0:
            if len(pattern_data) > 0 and np.sum(pattern_data) > 0 and np.sum(pattern_data_end) > 0:
                pattern_avail_hold_grouped.append(pattern_avail_hold)
                pattern_data_grouped.append(pattern_data)
                pattern_data_end_grouped.append(pattern_data_end)
            pattern_avail_hold = []
            pattern_data = []
            pattern_data_end = []

        # Attach extra vars at the end of each tick date point
        tlen = get_tick_len(map_json, tick);
        bpm = 60000 / tlen;
        slen = get_slider_len(map_json, tick);
        ex1 = tlen * tlen_mp - tlen_s;
        ex2 = bpm * bpm_mp - bpm_s;
        ex3 = slen * slen_mp - slen_s;

        has_note = False
        has_note_end = False
        has_hold = False

        # list of length (key_count) for pattern on current tick
        tick_pattern = []
        tick_pattern_end = []
        for k in range(key_count):
            objs = objs_each[k]
            obj_times = obj_times_each[k]
            obj_end_times = obj_end_times_each[k]

            # locate pointers
            while obj_times[obj_ptr_each[k]] < tick - 5 and obj_ptr_each[k] < len(obj_times) - 1:
                obj_ptr_each[k] += 1;
            while obj_end_times[obj_end_ptr_each[k]] < tick - 5 and obj_end_ptr_each[k] < len(obj_end_times) - 1:
                obj_end_ptr_each[k] += 1;

            obj_ptr = obj_ptr_each[k]
            obj_end_ptr = obj_end_ptr_each[k]

            if obj_times[obj_ptr] >= tick - 5 and obj_times[obj_ptr] <= tick + 5: # found note on key
                has_note = True
                note_type = get_note_type_mania(objs[obj_ptr])
                if note_type == 4:
                    has_hold = True
                tick_pattern.append(1)
            else:
                tick_pattern.append(0)

            if obj_end_times[obj_end_ptr] >= tick - 5 and obj_end_times[obj_end_ptr] <= tick + 5: # found note end on key
                has_note_end = True
                tick_pattern_end.append(1)
            else:
                tick_pattern_end.append(0)

        if has_note:
            # TICK, TIME, NOTE, NOTE_TYPE, SLIDING, SPINNING, MOMENTUM, Ex1, Ex2, Ex3
            # For mania, NOTE_TYPE = Hit(1) HoldStartOnly(2) HoldStart+Note(3) HoldEndOnly(4)
            #            SLIDING = SPINNING = MOMENTUM = 0
            if has_note_end:
                if has_hold:
                    data.append([i, tick, 1, 3, 0, 0, 0, ex1, ex2, ex3])
                else:
                    data.append([i, tick, 1, 1, 0, 0, 0, ex1, ex2, ex3])
            else:
                data.append([i, tick, 1, 2, 0, 0, 0, ex1, ex2, ex3])
        else:
            if has_note_end:
                data.append([i, tick, 0, 4, 0, 0, 0, ex1, ex2, ex3])
            else:
                data.append([i, tick, 0, 0, 0, 0, 0, ex1, ex2, ex3])

        pattern_avail_hold.append(1 if has_hold else 0)
        pattern_data.append(tick_pattern)
        pattern_data_end.append(tick_pattern_end)

    # everything limit to 4 metronomes (main_metronome)
    for i, pattern_avail_hold in enumerate(pattern_avail_hold_grouped):
        pattern_data = pattern_data_grouped[i]
        pattern_data_end = pattern_data_end_grouped[i]

        if len(pattern_avail_hold) < main_metronome * divisor:
            added_len = main_metronome * divisor - len(pattern_avail_hold)
            pattern_avail_hold += [0] * added_len
            pattern_avail_hold_grouped[i] = pattern_avail_hold
            pattern_data += [[0] * key_count] * added_len
            pattern_data_grouped[i] = pattern_data
            pattern_data_end += [[0] * key_count] * added_len
            pattern_data_end_grouped[i] = pattern_data_end
        if len(pattern_avail_hold) > main_metronome * divisor:
            pattern_avail_hold = pattern_avail_hold[:main_metronome * divisor]
            pattern_avail_hold_grouped[i] = pattern_avail_hold
            pattern_data = pattern_data[:main_metronome * divisor]
            pattern_data_grouped[i] = pattern_data
            pattern_data_end = pattern_data_end[:main_metronome * divisor]
            pattern_data_end_grouped[i] = pattern_data_end

    if len(pattern_avail_hold_grouped) > 0:
        pattern_avail_hold_expanded = np.expand_dims(pattern_avail_hold_grouped, axis=2)
        pattern_data = np.concatenate([pattern_avail_hold_expanded, pattern_data_grouped, pattern_data_end_grouped], axis=2)
    else:
        pattern_data = np.zeros((0, main_metronome * divisor, 1 + 2 * key_count))

    return data, pattern_data;