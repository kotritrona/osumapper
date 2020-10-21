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

def load_pretrained_model(model_name):
    model_data = {
        "default" : {
            "rhythm_model" : "models/{}/rhythm_model".format(model_name),
            "flow_dataset" : "models/{}/flow_dataset.npz".format(model_name),
            "rhythm_param" : [1, 0.32, 0, [0, 0, 0, 0], 8],
            "gan" : {
                "divisor" : 4,
                "good_epoch" : 6,
                "max_epoch" : 25,
                "note_group_size" : 10,
                "g_epochs" : 7,
                "c_epochs" : 3,
                "g_batch" : 50,
                "g_input_size" : 50,
                "c_true_batch" : 50,
                "c_false_batch" : 10,
                "note_distance_basis" : 200,
                "next_from_slider_end" : False,
                "max_ticks_for_ds" : 2
            },
            "modding" : {
                "stream_regularizer" : 1
            }
        },
        "sota" : {
            "rhythm_model" : "models/sota/rhythm_model",
            "flow_dataset" : "models/sota/flow_dataset.npz",
            "rhythm_param" : [1, 0.58, -0.15, [0, 0, 0, 0], 8],
            "gan" : {
                "divisor" : 4,
                "good_epoch" : 8,
                "max_epoch" : 25,
                "note_group_size" : 10,
                "g_epochs" : 7,
                "c_epochs" : 3,
                "g_batch" : 50,
                "g_input_size" : 50,
                "c_true_batch" : 50,
                "c_false_batch" : 10,
                "note_distance_basis" : 360,
                "next_from_slider_end" : False,
                "max_ticks_for_ds" : 1
            },
            "modding" : {
                "stream_regularizer" : 2
            }
        },
        "vtuber" : {
            "rhythm_model" : "models/vtuber/rhythm_model",
            "flow_dataset" : "models/vtuber/flow_dataset.npz",
            "rhythm_param" : [1, 0.37, 0.15, [0, 0, 0, 0], 8],
            "gan" : {
                "divisor" : 4,
                "good_epoch" : 8,
                "max_epoch" : 25,
                "note_group_size" : 10,
                "g_epochs" : 7,
                "c_epochs" : 3,
                "g_batch" : 50,
                "g_input_size" : 50,
                "c_true_batch" : 50,
                "c_false_batch" : 10,
                "note_distance_basis" : 200,
                "next_from_slider_end" : False,
                "max_ticks_for_ds" : 2
            },
            "modding" : {
                "stream_regularizer" : 3
            }
        },
        "flower" : {
            "rhythm_model" : "models/flower/rhythm_model",
            "flow_dataset" : "models/flower/flow_dataset.npz",
            "rhythm_param" : [1, 0.44, 0, [0, 0, 0, 0], 8],
            "gan" : {
                "divisor" : 4,
                "good_epoch" : 8,
                "max_epoch" : 25,
                "note_group_size" : 10,
                "g_epochs" : 7,
                "c_epochs" : 3,
                "g_batch" : 50,
                "g_input_size" : 50,
                "c_true_batch" : 50,
                "c_false_batch" : 10,
                "note_distance_basis" : 200,
                "next_from_slider_end" : False,
                "max_ticks_for_ds" : 1
            },
            "modding" : {
                "stream_regularizer" : 1
            }
        },
        "inst" : {
            "rhythm_model" : "models/inst/rhythm_model",
            "flow_dataset" : "models/inst/flow_dataset.npz",
            "rhythm_param" : [1, 0.4, 0, [0, 0, 0, 0], 8],
            "gan" : {
                "divisor" : 4,
                "good_epoch" : 8,
                "max_epoch" : 25,
                "note_group_size" : 10,
                "g_epochs" : 7,
                "c_epochs" : 3,
                "g_batch" : 50,
                "g_input_size" : 50,
                "c_true_batch" : 50,
                "c_false_batch" : 10,
                "note_distance_basis" : 200,
                "next_from_slider_end" : False,
                "max_ticks_for_ds" : 2
            },
            "modding" : {
                "stream_regularizer" : 4
            }
        },
        "lowbpm" : {
            "rhythm_model" : "models/lowbpm/rhythm_model",
            "flow_dataset" : "models/lowbpm/flow_dataset.npz",
            "rhythm_param" : [1, 0.55, 0.25, [0, 0, 0, 0], 8],
            "gan" : {
                "divisor" : 4,
                "good_epoch" : 8,
                "max_epoch" : 25,
                "note_group_size" : 10,
                "g_epochs" : 7,
                "c_epochs" : 3,
                "g_batch" : 50,
                "g_input_size" : 50,
                "c_true_batch" : 50,
                "c_false_batch" : 10,
                "note_distance_basis" : 300,
                "next_from_slider_end" : False,
                "max_ticks_for_ds" : 2
            },
            "modding" : {
                "stream_regularizer" : 1
            }
        },
        "tvsize" : {
            "rhythm_model" : "models/tvsize/rhythm_model",
            "flow_dataset" : "models/tvsize/flow_dataset.npz",
            "rhythm_param" : [1, 0.34, 0.1, [0, 0, 0, 0], 8],
            "gan" : {
                "divisor" : 4,
                "good_epoch" : 8,
                "max_epoch" : 25,
                "note_group_size" : 10,
                "g_epochs" : 7,
                "c_epochs" : 3,
                "g_batch" : 50,
                "g_input_size" : 50,
                "c_true_batch" : 50,
                "c_false_batch" : 10,
                "note_distance_basis" : 200,
                "next_from_slider_end" : False,
                "max_ticks_for_ds" : 2
            },
            "modding" : {
                "stream_regularizer" : 3
            }
        },
        "hard" : {
            "rhythm_model" : "models/hard/rhythm_model",
            "flow_dataset" : "models/hard/flow_dataset.npz",
            "rhythm_param" : [1, 0.28, 0, [0, 0, 0, 0], 8],
            "gan" : {
                "divisor" : 4,
                "good_epoch" : 8,
                "max_epoch" : 25,
                "note_group_size" : 10,
                "g_epochs" : 7,
                "c_epochs" : 3,
                "g_batch" : 50,
                "g_input_size" : 50,
                "c_true_batch" : 50,
                "c_false_batch" : 10,
                "note_distance_basis" : 160,
                "next_from_slider_end" : False,
                "max_ticks_for_ds" : 4
            },
            "modding" : {
                "stream_regularizer" : 3
            }
        },
        "normal" : {
            "rhythm_model" : "models/normal/rhythm_model",
            "flow_dataset" : "models/normal/flow_dataset.npz",
            "rhythm_param" : [1, 0.18, 0, [0, 0, 0, 0], 8],
            "gan" : {
                "divisor" : 4,
                "good_epoch" : 6,
                "max_epoch" : 25,
                "note_group_size" : 10,
                "g_epochs" : 7,
                "c_epochs" : 3,
                "g_batch" : 50,
                "g_input_size" : 50,
                "c_true_batch" : 50,
                "c_false_batch" : 10,
                "note_distance_basis" : 120,
                "next_from_slider_end" : True,
                "max_ticks_for_ds" : 6
            },
            "modding" : {
                "stream_regularizer" : 0
            }
        }
    };
    if model_name not in model_data:
        return model_data["default"];
    return model_data[model_name];