# -*- coding: utf-8 -*-

#
# Hitsound helpers
#

from map_analyze import *

def get_metronome_count(map_json, tick):
    uts_a = map_json["timing"]["uts"];
    if tick < uts_a[0]["beginTime"]:
        return uts_a[0]["whiteLines"];
    for uts in reversed(uts_a):
        if tick >= uts["beginTime"]:
            return uts["whiteLines"];

def get_circle_hitsounds(map_json, **kwargs):
    """
    Reads JSON map data and creates a list of hitsound groups.

    It only reads circle hitsounds because it's dedicated for taiko mode.
    osu mode hitsounds use another function in load_map.js.
    it will not work for osu mode because of custom hitsounds.
    """
    length = kwargs.get("length", -1);
    divisor = kwargs.get("divisor", 4);
    tick_times = get_map_timing_array(map_json, length = length, divisor = divisor);

    objs = map_json["obj"];
    obj_times = [obj["time"] for obj in objs]
    hitsounds = [k['hitsounds'] for k in objs]

    hs_groups = []
    hs_group = []

    hs_avails = []
    hs_avail = []

    po = 0
    note_max_wait_time = kwargs.get("note_max_wait_time", 1000)
    start_time = obj_times[0] - note_max_wait_time
    last_obj_time = start_time

    for i, tick in enumerate(tick_times):
        metronome = get_metronome_count(map_json, tick)
        if i % (metronome * divisor) == 0:
            if len(hs_group) > 0:
                hs_groups.append(hs_group)
                hs_avails.append(hs_avail)
            hs_group = []
            hs_avail = []

        while obj_times[po] < tick - 5 and po < len(obj_times) - 1:
            po += 1
        if obj_times[po] >= tick - 5 and obj_times[po] <= tick + 5: # found note
            last_obj_time = tick

            hs_group.append(objs[po]["hitsounds"])
            hs_avail.append(1)
        else:
            hs_group.append(0)
            hs_avail.append(0)

    # everything limit to 4 metronomes
    for i, hs_group in enumerate(hs_groups):
        hs_avail = hs_avails[i]
        if len(hs_group) < 4 * divisor:
            hs_group += ([0] * (4 * divisor - len(hs_group)))
            hs_groups[i] = hs_group
            hs_avail += ([0] * (4 * divisor - len(hs_group)))
            hs_avails[i] = hs_avail
        if len(hs_group) > 4 * divisor:
            hs_group = hs_group[:4 * divisor]
            hs_groups[i] = hs_group
            hs_avail = hs_avail[:4 * divisor]
            hs_avails[i] = hs_avail

    # convert hs_avail to flags
    hs_avail_flags = [sum([k*2**i for i,k in enumerate(hs_avail)]) for hs_avail in hs_avails]

    return_data = [np.array([hs_avail_flags[i]] + hs_groups[i]) for i in range(len(hs_groups))]

    return return_data

def bitwise_contains(container, item):
    return np.bitwise_and(np.bitwise_not(container), item) == 0

def read_hitsound_dataset(hs_dataset):
    with np.load(hs_dataset) as data:
        avail_flags = data["avail_flags"]
        hs = data["hs"]
    return avail_flags, hs

def get_hitsound_groups(hs_avail_flags, hs_data, note_metronome_group):
    """
    note_metronome_group should be from a single metronome (16 ticks)
    np.array of integers 0-15
    """
    metronome_length = hs_data.shape[1]
    note_avail = [(1 if i in note_metronome_group else 0) for i in range(metronome_length)]
    note_avail_flags = sum([k*2**i for i,k in enumerate(note_avail)])

    possible_hs_groups = hs_data[bitwise_contains(hs_avail_flags, note_avail_flags)]

    return possible_hs_groups

def get_random_hitsound_group(hs_avail_flags, hs_data, note_metronome_group, default_mask=2):
    """
    get a random group of hitsounds.
    if it cannot find possible group in hs_data, uses a random group of only whistles.
    """
    possible_hs_groups = get_hitsound_groups(hs_avail_flags, hs_data, note_metronome_group)
    if len(possible_hs_groups) > 0:
        return possible_hs_groups[np.random.randint(0, possible_hs_groups.shape[0])]
    else:
        return np.bitwise_and(np.random.randint(0, 16, size=hs_data.shape[1]), default_mask)

def apply_hitsounds(hs_avail_flags, hs_data, ticks, divisor=4, metronome_count=4):
    max_tick = ticks[-1]
    hs_current = []
    hs_applied = []
    metronome_offset = 0

    for tick in range(max_tick+1):
        if tick in ticks:
            hs_current.append(metronome_offset)

        metronome_offset += 1

        if metronome_offset >= divisor * metronome_count or tick == max_tick:
            hs_group = get_random_hitsound_group(hs_avail_flags, hs_data, hs_current)
            hs_applied.append(hs_group)
            hs_current = []

    hs_full = np.concatenate(hs_applied, axis=0)
    hs_objs = hs_full[ticks]

    return hs_objs

def fix_taiko_big_drum(ticks, hitsounds):
    """
    Remove finishes when there is another note next tick
    """
    for i,tick in enumerate(ticks):
        if tick+1 in ticks:
            if hitsounds[i] & 4 == 4: # has finish hitsound == big drum
                hitsounds[i] -= 4

    return hitsounds