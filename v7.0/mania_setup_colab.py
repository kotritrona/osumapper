# -*- coding: utf-8 -*-

#
# Colab functions
#

import os

def colab_clean_up(input_file_name):
    for item in [input_file_name, "mapthis.json", "audio.mp3", "timing.osu", "rhythm_data.npz", "mapthis.npz"]:
        try:
            os.remove(item);
        except:
            pass
    print("intermediate files cleaned up!")

def load_pretrained_model(model_name):
    model_data = {
        "default" : {
            "rhythm_model" : "models/{}/rhythm_model".format(model_name),
            "pattern_dataset" : "models/{}/mania_pattern_dataset.npz".format(model_name),
            "rhythm_param" : [0.5, 0.2, [0, 0, 0, 0], 8, 1, 4],
            "modding" : {
                "key_fix" : 3
            }
        },
        "lowkey" : {
            "rhythm_model" : "models/mania_lowkey/rhythm_model".format(model_name),
            "pattern_dataset" : "models/mania_pattern/mania_pattern_dataset.npz".format(model_name),
            "rhythm_param" : [0.65, 0.4, [0, 0, 0, 0], 8, 5, 4],
            "modding" : {
                "key_fix" : 0
            }
        },
        "highkey" : {
            "rhythm_model" : "models/mania_highkey/rhythm_model".format(model_name),
            "pattern_dataset" : "models/mania_pattern/mania_pattern_dataset.npz".format(model_name),
            "rhythm_param" : [0.45, 0.12, [0, 0, 0, 0], 8, 5, 4],
            "modding" : {
                "key_fix" : 3
            }
        }
    };
    if model_name not in model_data:
        return model_data["default"];
    return model_data[model_name];