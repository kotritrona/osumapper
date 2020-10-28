# -*- coding: utf-8 -*-

#
# Timing
#

import numpy as np
import re, os
import include.id3reader_p3 as id3
from shutil import copy

from timing import *
from metadata import *

def get_timed_osu_file(music_path, input_filename = "assets/template.osu", output_filename = "timing.osu", game_mode = 0, mania_key_count = None):
    with open(input_filename) as osu_file:
        osu_text = osu_file.read()

    rdr = id3.Reader(music_path)
    artist = rdr.get_value("performer")
    if artist is None:
        artist = "unknown"
    title = rdr.get_value("title")
    if title is None:
        title = re.sub("\.[^\.]*$", "", os.path.basename(music_path))

    bpm, offset = get_timing(music_path)

    osu_text = re.sub("{audio_filename}",     "audio.mp3", osu_text)
    osu_text = re.sub("{game_mode}",          str(game_mode), osu_text)
    osu_text = re.sub("{artist}",             artist, osu_text)
    osu_text = re.sub("{title}",              title, osu_text)
    osu_text = re.sub("{version}",            get_difficulty_name(), osu_text)
    osu_text = re.sub("{hp_drain}",           "{}".format(np.random.randint(0, 101) / 10), osu_text)
    if mania_key_count is None:
        osu_text = re.sub("{circle_size}",    "{}".format(np.random.randint(30, 51) / 10), osu_text)
    else:
        osu_text = re.sub("{circle_size}",    "{}".format(mania_key_count), osu_text)
    osu_text = re.sub("{overall_difficulty}", "{}".format(np.random.randint(50, 91) / 10), osu_text)
    osu_text = re.sub("{approach_rate}",      "{}".format(np.random.randint(70, 96) / 10), osu_text)
    osu_text = re.sub("{slider_velocity}",    "{}".format(np.random.randint(12, 26) / 10), osu_text)
    osu_text = re.sub("{tickLength}",         "{}".format(60000 / bpm), osu_text)
    osu_text = re.sub("{offset}",             "{}".format(int(offset)),     osu_text)
    osu_text = re.sub("{colors}",             get_colors(), osu_text)
    osu_text = re.sub("{hit_objects}",        "", osu_text)

    with open(output_filename, 'w', encoding="utf8") as osu_output:
        osu_output.write(osu_text)

    copy(music_path, "./audio.mp3")

    return output_filename