'use strict'; # In case of future updates if Python wanted to mimic JS

#
# Timing
#

import numpy as np
from os_tools import run_command
import re, os
import include.id3reader_p3 as id3
from shutil import copy

def get_difficulty_name():
    diffs = ["Easy", "Normal", "Hard", "Insane", "Lunatic", "Extra", "Beginner", "Hyper", "Another", "Basic", "Novice", "Advanced",
             "Hell", "Expert", "Extra Stage", "Collab", "Colab", "FOUR DIMENSIONS", ".-- .-. --- -. --. .-- .- -.--"]
    return diffs[np.random.randint(0,len(diffs))]

def hsv_to_rgb(h, s, v):
    if s == 0.0: return (v, v, v)
    i = int(h*6.)
    f = (h*6.)-i; p,q,t = v*(1.-s), v*(1.-s*f), v*(1.-s*(1.-f)); i%=6
    if i == 0: return (v, t, p)
    if i == 1: return (q, v, p)
    if i == 2: return (p, v, t)
    if i == 3: return (p, q, v)
    if i == 4: return (t, p, v)
    if i == 5: return (v, p, q)

def hsv_to_rgb_255(h, s, v):
    return tuple(round(255 * i) for i in hsv_to_rgb(h, s, v))

def get_color():
    return "{},{},{}".format(*hsv_to_rgb_255(np.random.random(), 0.5, 1))

def get_colors():
    count = np.random.randint(4,9)
    text_list = []
    for i in range(1, 1+count):
        text_list.append("Combo{} : {},{},{}".format(i, *hsv_to_rgb_255(np.random.random(), 0.4 + np.random.random() * 0.4, 1)))
    return "\n".join(text_list)

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
    if artist is None:
        artist = "unknown"
    title = rdr.get_value("title")
    if title is None:
        title = re.sub("\.[^\.]*$", "", os.path.basename(music_path))

    bpm, offset = get_timing(music_path)

    osu_text = re.sub("{audio_filename}",     "audio.mp3", osu_text)
    osu_text = re.sub("{artist}",             artist, osu_text)
    osu_text = re.sub("{title}",              title, osu_text)
    osu_text = re.sub("{version}",            get_difficulty_name(), osu_text)
    osu_text = re.sub("{hp_drain}",           "{}".format(np.random.randint(0, 101) / 10), osu_text)
    osu_text = re.sub("{circle_size}",        "{}".format(np.random.randint(30, 51) / 10), osu_text)
    osu_text = re.sub("{overall_difficulty}", "{}".format(np.random.randint(50, 91) / 10), osu_text)
    osu_text = re.sub("{approach_rate}",      "{}".format(np.random.randint(70, 96) / 10), osu_text)
    osu_text = re.sub("{slider_velocity}",    "{}".format(np.random.randint(12, 26) / 10), osu_text)
    osu_text = re.sub("{tickLength}",         "{}".format(60000 / bpm), osu_text)
    osu_text = re.sub("{offset}",             "{}".format(int(offset)),     osu_text)
    osu_text = re.sub("{colors}",             get_colors(), osu_text)
    osu_text = re.sub("{hit_objects}",        "", osu_text)

    with open(output_filename, 'w') as osu_output:
        osu_output.write(osu_text)

    copy(music_path, "./audio.mp3")

    return output_filename