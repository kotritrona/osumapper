# -*- coding: utf-8 -*-

#
# Timing
#

import numpy as np
from os_tools import run_command
import re

def get_timing(music_path):
    """
    Obtain timing by running TimingAnlyz.exe
    """
    result = run_command(["TimingAnlyz.exe", music_path, "0"]).decode("utf-8")
    bpm = float(re.findall("BPM:\W*([0-9\.]+)", result)[0])
    ofs = float(re.findall("Offset:\W*([0-9\.]+)", result)[0])
    if np.abs(bpm - np.round(bpm)) < 0.05:
        result = run_command(["TimingAnlyz.exe", music_path, str(np.round(bpm))]).decode("utf-8")
        bpm = float(re.findall("BPM:\W*([0-9\.]+)", result)[0])
        ofs = float(re.findall("Offset:\W*([0-9\.]+)", result)[0])
    return bpm, ofs