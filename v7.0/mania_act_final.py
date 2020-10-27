# -*- coding: utf-8 -*-

#
# Part 8 .osu file JSON processing / output
#

import re, json, datetime;
from os_tools import *;

def convert_to_osu_mania_obj(notes, key_count):
    """
    Converts map data from python format to json format.
    """
    output = [];

    # X coordinates each key
    x_coords = [int(round((0.5+k)/key_count * 512)) for k in range(key_count)];

    for i, note in enumerate(notes):
        begin, end, key, tick = note;
        if begin == end: # is a circle; does not consider spinner for now.
            obj_dict = {
                "x": x_coords[key],
                "y": 192,
                "type": 1,
                "time": int(begin),
                "hitsounds": 0,
                "extHitsounds": "0:0:0",
                "index": i
            };
        else:
            obj_dict = {
                "x": x_coords[key],
                "y": 192,
                "type": 128,
                "time": int(begin),
                "hitsounds": 0,
                "extHitsounds": "0:0:0",
                "holdEndTime": int(end),
                "index": i
            };
        output.append(obj_dict);
    return output;

def get_osu_file_name(metadata):
    """
    Construct the .osu file name from the metadata.
    """
    artist = metadata["artist"];
    title = metadata["title"];
    creator = metadata["creator"];
    diffname = metadata["diffname"];
    outname = (artist+" - " if len(artist) > 0 else "") + title + " (" + creator + ") [" + diffname + "].osu";
    outname = re.sub("[^a-zA-Z0-9\(\)\[\] \.\,\!\~\`\{\}\-\_\=\+\&\^\@\#\$\%\;\']","", outname);
    return outname;

def step8_save_osu_mania_file(notes, key_count):
    """
    Save trained map to disk, using filename generated from its metadata.
    """
    osu_obj_array = convert_to_osu_mania_obj(notes, key_count);

    with open("mapthis.json", encoding="utf-8") as map_json:
        map_dict = json.load(map_json);
        map_meta = map_dict["meta"];
        filename = get_osu_file_name(map_meta);
        map_dict["obj"] = osu_obj_array;

    with open('mapthis.json', 'w', encoding="utf-8") as outfile:
        json.dump(map_dict, outfile, ensure_ascii=False);

    c = run_command(["node", "load_map.js", "c", "mapthis.json", filename]);
    if(len(c) > 1):
        print(c.decode("utf-8"));

    print("finished on: {}".format(datetime.datetime.now()));

    return filename;

def step8_clean_up():
    # clean up intermediate files
    for item in ["mapthis.json", "audio.mp3", "timing.osu", "rhythm_data.npz", "mapthis.npz", "temp_json_file.json", "wavfile.wav", "temp/temp_json_file.json", "temp/wavfile.wav", "evaluatedRhythm.json"]:
        try:
            os.remove(item);
        except:
            pass