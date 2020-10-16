'use strict'; # In case of future updates if Python wanted to mimic JS

#
# Timing
#

import numpy as np
from os_tools import run_command
import re, os
import include.id3reader_p3 as id3

def get_difficulty_name():
    diffs = ["Easy", "Normal", "Hard", "Insane", "Lunatic", "Extra", "Beginner", "Hyper", "Another", "Basic", "Novice", "Advanced",
             "Hell", "Expert", "Extra Stage", "Collab", "Colab", "FOUR DIMENSIONS", ".-- .-. --- -. --. .-- .- -.--"]
    return diffs[np.random.randint(0,len(diffs))]

def get_timing(music_path):
    result = run_command(["TimingAnlyz.exe", music_path, "0"]).decode("utf-8")
    bpm = float(re.findall("BPM:\W*([0-9\.]+)", result)[0])
    ofs = float(re.findall("Offset:\W*([0-9\.]+)", result)[0])
    if np.abs(bpm - np.round(bpm)) < 0.05:
        result = run_command(["TimingAnlyz.exe", music_path, str(np.round(bpm))]).decode("utf-8")
        bpm = float(re.findall("BPM:\W*([0-9\.]+)", result)[0])
        ofs = float(re.findall("Offset:\W*([0-9\.]+)", result)[0])
    return bpm, ofs

def get_timed_osu_file(music_path, input_filename = "assets/template.osu", output_filename = "timing.osu"):
    with open(input_filename) as osu_file:
        osu_text = osu_file.read()

    rdr = id3.Reader(music_path)
    artist = rdr.get_value("performer")
    if len(artist) <= 1:
        artist = "unknown"
    title = rdr.get_value("title")
    if len(title) <= 1:
        title = re.sub("\.[^\.]*$", "", os.path.basename(music_path))

    bpm, offset = get_timing(music_path)

    osu_text = re.sub("{audio_filename}", "audio.mp3", osu_text)
    osu_text = re.sub("{artist}", artist, osu_text)
    osu_text = re.sub("{title}", title, osu_text)
    osu_text = re.sub("{version}", get_difficulty_name(), osu_text)
    osu_text = re.sub("{hp_drain}",           "{}".format(np.random.randint(0, 101) / 10), osu_text)
    osu_text = re.sub("{circle_size}",        "{}".format(np.random.randint(30, 51) / 10), osu_text)
    osu_text = re.sub("{overall_difficulty}", "{}".format(np.random.randint(50, 91) / 10), osu_text)
    osu_text = re.sub("{approach_rate}",      "{}".format(np.random.randint(70, 96) / 10), osu_text)
    osu_text = re.sub("{slider_velocity}",    "{}".format(np.random.randint(12, 26) / 10), osu_text)
    osu_text = re.sub("{tickLength}", "{}".format(60000 / bpm), osu_text)
    osu_text = re.sub("{offset}",     "{}".format(int(offset)),     osu_text)
    osu_text = re.sub("{hit_objects}", "", osu_text)

    with open(output_filename, 'w') as osu_output:
        osu_output.write(osu_text)

    return output_filename