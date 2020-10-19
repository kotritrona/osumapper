# -*- coding: utf-8 -*-

#
# Part 5 action script
#

from audio_tools import *;

import os, re, time;

mapdata_path = "mapdata/";
try:
    divisor = GLOBAL["divisor"];
except:
    divisor = 4;

def step4_read_new_map(file_path):
    # Test paths and node
    test_process_path("node");

    start = time.time()
    read_and_save_osu_tester_file(file_path.strip(), filename="mapthis", divisor=divisor);
    end = time.time()