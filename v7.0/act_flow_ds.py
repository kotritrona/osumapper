# -*- coding: utf-8 -*-

#
# Part 4 Save Flow Dataset
#

import numpy as np;
import os;

root = "mapdata/";

divisor = 4;

def step3_set_params(note_group_size=10, step_size=5):
    return note_group_size, step_size;

def read_map_npz_flow(file_path):
    with np.load(file_path) as data:
        flow_data = data["flow"];
    return flow_data;

# TICK, TIME, TYPE, X, Y, IN_DX, IN_DY, OUT_DX, OUT_DY
def step3_read_maps_flow(params):
    chunk_size, step_size = params;

    max_x = 512;
    max_y = 384;

    result = [];
    for file in os.listdir(root):
        if file.endswith(".npz"):
            #print(os.path.join(root, file));
            flow_data = read_map_npz_flow(os.path.join(root, file));
            for i in range(0, (flow_data.shape[0] - chunk_size) // step_size):
                chunk = flow_data[i * step_size:i * step_size + chunk_size];
                result.append(chunk);

    # normalize the TICK col and remove TIME col
    result = np.array(result)
    result[:, :, 0] %= divisor;
    result[:, :, 3] /= max_x;
    result[:, :, 4] /= max_y;
    result[:, :, 9] /= max_x;
    result[:, :, 10] /= max_y;

    # TICK, TIME, TYPE, X, Y, IN_DX, IN_DY, OUT_DX, OUT_DY, END_X, END_Y
    # only use X,Y,OUT_DX,OUT_DY,END_X,END_Y
    used_indices = [3, 4, 7, 8, 9, 10]#np.concatenate([, range(11, 11 + divisor + 1)])
    result = np.array(result)[:, :, used_indices];
    return result;

def step3_save_flow_dataset(maps_flow):
    np.savez_compressed("flow_dataset", maps = maps_flow);

def read_map_npz_hs(file_path):
    with np.load(file_path) as data:
        hs_data = data["hs"];
    return hs_data;

def step3_read_maps_hs(params):
    result_avail_flags = [];
    result_hitsounds = [];
    for file in os.listdir(root):
        if file.endswith(".npz"):
            hs_data = read_map_npz_hs(os.path.join(root, file));

            avail_flags = hs_data[:, 0]
            hitsounds = hs_data[:, 1:]

            result_avail_flags.append(avail_flags)
            result_hitsounds.append(hitsounds)

    af = np.concatenate(result_avail_flags, axis=0)
    hs = np.concatenate(result_hitsounds, axis=0)

    return af[af != 0], hs[af != 0]

def step3_save_hs_dataset(hs_avail_flags, hs):
    np.savez_compressed("hs_dataset", avail_flags = hs_avail_flags, hs = hs);

def read_map_npz_pattern(file_path):
    with np.load(file_path) as data:
        pattern_data = data["pattern"];
    return pattern_data;

def array_to_flags(arr):
    return sum([k*2**i for i,k in enumerate(arr)])

def step3_read_maps_pattern(params):
    pattern_length = -1
    result_avail_note_begin =   [[] for i in range(18)];
    result_avail_note_end =     [[] for i in range(18)];
    result_avail_hold =         [[] for i in range(18)];
    result_pattern_note_begin = [[] for i in range(18)];
    result_pattern_note_end =   [[] for i in range(18)];
    for file in os.listdir(root):
        if file.endswith(".npz"):
            pattern_data = read_map_npz_pattern(os.path.join(root, file));

            try:
                key_count = (pattern_data.shape[2] - 1) // 2
                key_index = key_count - 1

                pattern_length = pattern_data.shape[1]

                avail_hold = pattern_data[:, :, 0]
                pattern_note_begin = pattern_data[:, :, 1:1+key_count]
                pattern_note_end = pattern_data[:, :, 1+key_count:1+key_count*2]

                avail_note_begin = np.max(pattern_note_begin, axis=2)
                avail_note_end = np.max(pattern_note_end, axis=2)

                result_avail_note_begin[key_index].append(avail_note_begin)
                result_avail_note_end[key_index].append(avail_note_end)
                result_avail_hold[key_index].append(avail_hold)
                result_pattern_note_begin[key_index].append(pattern_note_begin)
                result_pattern_note_end[key_index].append(pattern_note_end)
            except:
                print("Error on file {}".format(file))

    outdata = []

    if pattern_length == -1:
        pattern_length = 16

    for key_index in range(18):
        if len(result_avail_note_begin[key_index]) == 0:
            outdata.append([np.array([]), np.array([]), np.array([]), np.zeros((0, pattern_length, 1 + key_index)), np.zeros((0, pattern_length, 1 + key_index))])
            continue
        anb = np.concatenate(result_avail_note_begin[key_index], axis=0)
        ane = np.concatenate(result_avail_note_end[key_index], axis=0)
        ah = np.concatenate(result_avail_hold[key_index], axis=0)
        pnb = np.concatenate(result_pattern_note_begin[key_index], axis=0)
        pne = np.concatenate(result_pattern_note_end[key_index], axis=0)

        begin_flag = np.max(anb, axis=1)
        end_flag = np.max(ane, axis=1)

        anbf = np.array([array_to_flags(k) for k in anb])
        anef = np.array([array_to_flags(k) for k in ane])
        ahf = np.array([array_to_flags(k) for k in ah])

        outdata.append([anbf[begin_flag != 0], anef[end_flag != 0], ahf[begin_flag != 0], pnb[begin_flag != 0], pne[end_flag != 0]])

    return outdata

def step3_save_pattern_dataset(data):
    save_dict = {}
    for key_index in range(18):
        key_count = key_index + 1
        try:
            avail_note_begin, avail_note_end, avail_hold, pattern_note_begin, pattern_note_end = data[key_index]
        except:
            avail_note_begin, avail_note_end, avail_hold, pattern_note_begin, pattern_note_end = [[]] * 5
        save_dict["{}k_avail_note_begin".format(key_count)] =   avail_note_begin
        save_dict["{}k_avail_note_end".format(key_count)] =     avail_note_end
        save_dict["{}k_avail_hold".format(key_count)] =         avail_hold
        save_dict["{}k_pattern_note_begin".format(key_count)] = pattern_note_begin
        save_dict["{}k_pattern_note_end".format(key_count)] =   pattern_note_end
    np.savez_compressed("mania_pattern_dataset", **save_dict)