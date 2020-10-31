# -*- coding: utf-8 -*-

#
# JSON osu! map analysis
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
    elif note["type"] & 2:
        return note["sliderData"]["endTime"];
    #elif note["type"] & 128:
    #    return note["holdEndTime"];
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

def get_end_point(note):
    if note["type"] & 8:
        return np.array([256, 192]);
    elif note["type"] & 2:
        return np.array(note["sliderData"]["endpoint"]);
    else:
        return np.array([note["x"], note["y"]]);

def get_input_vector(note, prev_note):
    if note["type"] & 8:
        return None;
    #elif note["type"] & 2:
    #    return np.array(note["sliderData"]["dIn"]);
    else:
        vec = np.array([note["x"], note["y"]]) - get_end_point(prev_note);
        return vec / max(0.001, np.sqrt(vec.dot(vec)));

def get_output_vector(note, prev_note):
    if note["type"] & 8:
        return None;
    elif note["type"] & 2:
        return np.array(note["sliderData"]["dOut"]);
    else:
        vec = np.array([note["x"], note["y"]]) - get_end_point(prev_note);
        return vec / max(0.001, np.sqrt(vec.dot(vec)));

def get_momentum(note, prev_note, slider_len):
    """
    momentum = distance snap (distance / slider length).
    for sliders, takes small value between from slider end or slider start to next note.
    """
    v1 = np.array([note["x"], note["y"]]);
    v0 = get_end_point(prev_note);
    v = v1 - v0;
    if note["time"] - get_end_time(prev_note) == 0 or note["time"] - prev_note["time"] == 0:
        # it has the same time the previous note ends. either a bugged sliderend or a double note
        return 0;
    end_type_momentum = np.sqrt(v.dot(v)) / (note["time"] - get_end_time(prev_note)) / slider_len;

    # Since slider jumps in maps cause parameters to be learned too high
    # we try to deal with slider leniency by using the beginning of slider
    v2 = np.array([prev_note["x"], prev_note["y"]]);
    v3 = v1 - v2;
    start_type_momentum = np.sqrt(v3.dot(v3)) / (note["time"] - prev_note["time"]) / slider_len;
    return np.min([end_type_momentum, start_type_momentum]);

def is_uts_begin(map_json, tick):
    uts_a =  map_json["timing"]["uts"];
    begin_times = [uts["beginTime"] for uts in uts_a];
    for t in begin_times:
        if tick > t - 1 and tick < t + 5:
            return True
    return False

def get_map_notes(map_json, **kwargs):
    """
    Reads JSON map data and creates a list for every tick
    Returns:
        data = list of data array: [TICK, TIME, NOTE, NOTE_TYPE, SLIDING, SPINNING, MOMENTUM, Ex1, Ex2, Ex3]
        flow_data = list of data array: [i, tick, note_type, x, y, vec_in_x, vec_in_y, vec_out_x, vec_out_y, end_x, end_y]

    Ex1, Ex2, Ex3 = tickLength/500, BPM/120, sliderLength/150
    """
    length = kwargs.get("length", -1);
    divisor = kwargs.get("divisor", 4);
    tick_times = get_map_timing_array(map_json, length = length, divisor = divisor);

    objs = map_json["obj"];
    obj_times = list(map(lambda obj: obj["time"], objs));

    # 1 for circle, 2 for slider, 3 for spinner
    def get_note_type(obj):
        if not obj:
            return 0;
        if obj["type"] & 2:
            return 2;
        elif obj["type"] & 8:
            return 3;
        return 1;

    po = 0;
    note_max_wait_time = kwargs.get("note_max_wait_time", 1000);
    start_time = obj_times[0] - note_max_wait_time;
    last_obj_time = start_time;
    sliding = 0;
    slider_end_time = 0;
    spinning = 0;
    spinner_end_time = 0;
    data = [];
    flow_data = [];

    # constant multipliers and subtractions
    tlen_mp = 1/500;
    tlen_s = 1;
    bpm_mp = 1/120;
    bpm_s = 1;
    slen_mp = 1/150;
    slen_s = 1;

    # tick count from start of uninherited timing section
    uts_i = 0;

    # tick is timestamp here
    for i, tick in enumerate(tick_times):

        if is_uts_begin(map_json, tick):
            uts_i = 0;
        else:
            uts_i += 1;

        # Attach extra vars at the end of each note data row
        tlen = get_tick_len(map_json, tick);
        bpm = 60000 / tlen;
        slen = get_slider_len(map_json, tick);
        ex1 = tlen * tlen_mp - tlen_s;
        ex2 = bpm * bpm_mp - bpm_s;
        ex3 = slen * slen_mp - slen_s;

        while obj_times[po] < tick - 5 and po < len(obj_times) - 1:
            po += 1;
        if obj_times[po] >= tick - 5 and obj_times[po] <= tick + 5: # found note
            last_obj_time = tick;
            note_type = get_note_type(objs[po]);

            # calculate momentum
            if po >= 1:
                momentum = get_momentum(objs[po], objs[po-1], slen/tlen);
            else:
                momentum = 0;

            # flow data
            if po >= 1:
                input_vector = get_input_vector(objs[po], objs[po-1]);
                output_vector = get_output_vector(objs[po], objs[po-1]);
            else:
                input_vector = [0, 0];
                output_vector = [0, 0];
            if input_vector is None or input_vector[0] is None or input_vector[1] is None:
                input_vector = [0, 0];
            if output_vector is None or output_vector[0] is None or output_vector[1] is None:
                output_vector = [0, 0];

            # end point
            endpoint = get_end_point(objs[po]);
            flow_data.append([uts_i, tick, note_type, objs[po]["x"], objs[po]["y"], input_vector[0], input_vector[1], output_vector[0], output_vector[1], endpoint[0], endpoint[1]]);

            # put data
            if note_type == 1:
                spinning = 0;
                sliding = 0;
            elif note_type == 2:
                sliding = 1;
                slider_end_time = objs[po]["sliderData"]["endTime"];
            elif note_type == 3:
                spinning = 1;
                spinner_end_time = objs[po]["spinnerEndTime"];
                # because the spinner sometimes get over 3 secs
                last_obj_time = spinner_end_time;

            # TICK, TIME, NOTE, NOTE_TYPE, SLIDING, SPINNING, MOMENTUM, Ex1, Ex2, Ex3
            data.append([uts_i, tick, 1, note_type, sliding, spinning, momentum, ex1, ex2, ex3]);
        elif spinning == 1:
            if tick >= spinner_end_time - 5:
                spinning = 0;
                data.append([uts_i, tick, 1, 5, 0, 0, 0, ex1, ex2, ex3]);
            else:
                data.append([uts_i, tick, 0, 0, 0, 1, 0, ex1, ex2, ex3]);
        elif sliding == 1:
            if tick >= slider_end_time - 5:
                sliding = 0;
                data.append([uts_i, tick, 1, 4, 0, 0, 0, ex1, ex2, ex3]);
            else:
                data.append([uts_i, tick, 0, 0, 1, 0, 0, ex1, ex2, ex3]);
        else: # not found
            if tick - last_obj_time < note_max_wait_time and tick >= start_time:
                data.append([uts_i, tick, 0, 0, 0, 0, 0, ex1, ex2, ex3]);
    return data, flow_data;