# -*- coding: utf-8 -*-

#
# Part 1 action script
#

from mania_audio_tools import *;

import os, re, time;

mapdata_path = "mapdata/";
try:
    divisor = GLOBAL["divisor"];
except:
    divisor = 4;

def step1_load_maps():
    # Test paths and node
    test_process_path("node");
    if not os.path.isdir(mapdata_path):
        os.mkdir(mapdata_path);

    # Open maplist
    with open("maplist.txt", encoding="utf8") as fp:
        fcont = fp.readlines();

    # Reset results
    results = [];
    for line in fcont:
        results.append(line);

    # Remove maps
    for file in os.listdir(mapdata_path):
        if file.endswith(".npz"):
            os.remove(os.path.join(mapdata_path, file));

    print("Number of filtered maps: {}".format(len(results)));

    for k, mname in enumerate(results):
        try:
            start = time.time()
            read_and_save_osu_file(mname.strip(), filename=os.path.join(mapdata_path, str(k)), divisor=divisor);
            end = time.time()
            print("Map data #" + str(k) + " saved! time = " + str(end - start) + " secs");
        except Exception as e:
            print("Error on #{}, path = {}, error = {}".format(str(k), mname.strip(), e));