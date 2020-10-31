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
            "flow_dataset" : "models/{}/flow_dataset.npz".format(model_name),
            "hs_dataset" : "models/{}/hs_dataset.npz".format(model_name),
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
                "c_false_batch" : 5,
                "c_randfalse_batch" : 5,
                "note_distance_basis" : 200,
                "next_from_slider_end" : False,
                "max_ticks_for_ds" : 2,
                "box_loss_border" : 0.1,
                "box_loss_value" : 0.4,
                "box_loss_weight" : 1
            },
            "modding" : {
                "stream_regularizer" : 1,
                "slider_mirror" : 1
            }
        },
        "sota" : {
            "rhythm_model" : "models/sota/rhythm_model",
            "flow_dataset" : "models/sota/flow_dataset.npz",
            "rhythm_param" : [1, 0.53, -0.15, [0, 0, 0, 0], 8],
            "gan" : {
                "divisor" : 4,
                "good_epoch" : 12,
                "max_epoch" : 30,
                "note_group_size" : 10,
                "g_epochs" : 1,
                "c_epochs" : 1,
                "g_batch" : 50,
                "g_input_size" : 50,
                "c_true_batch" : 240,
                "c_false_batch" : 5,
                "c_randfalse_batch" : 5,
                "note_distance_basis" : 360,
                "next_from_slider_end" : False,
                "max_ticks_for_ds" : 1,
                "box_loss_border" : 0.08,
                "box_loss_value" : 0.4,
                "box_loss_weight" : 1
            },
            "modding" : {
                "stream_regularizer" : 2,
                "slider_mirror" : 0
            }
        },
        "vtuber" : {
            "rhythm_model" : "models/vtuber/rhythm_model",
            "flow_dataset" : "models/vtuber/flow_dataset.npz",
            "rhythm_param" : [1, 0.37, 0.15, [0, 0, 0, 0], 8],
            "gan" : {
                "divisor" : 4,
                "good_epoch" : 12,
                "max_epoch" : 30,
                "note_group_size" : 10,
                "g_epochs" : 1,
                "c_epochs" : 1,
                "g_batch" : 50,
                "g_input_size" : 50,
                "c_true_batch" : 140,
                "c_false_batch" : 5,
                "c_randfalse_batch" : 5,
                "note_distance_basis" : 200,
                "next_from_slider_end" : False,
                "max_ticks_for_ds" : 1,
                "box_loss_border" : 0.1,
                "box_loss_value" : 0.4,
                "box_loss_weight" : 1
            },
            "modding" : {
                "stream_regularizer" : 3,
                "slider_mirror" : 1
            }
        },
        "flower" : {
            "rhythm_model" : "models/flower/rhythm_model",
            "flow_dataset" : "models/flower/flow_dataset.npz",
            "rhythm_param" : [1, 0.3, 0, [0, 0, 0, 0], 8],
            "gan" : {
                "divisor" : 4,
                "good_epoch" : 6,
                "max_epoch" : 25,
                "note_group_size" : 10,
                "g_epochs" : 6,
                "c_epochs" : 3,
                "g_batch" : 50,
                "g_input_size" : 50,
                "c_true_batch" : 100,
                "c_false_batch" : 10,
                "c_randfalse_batch" : 0,
                "note_distance_basis" : 180,
                "next_from_slider_end" : False,
                "max_ticks_for_ds" : 1,
                "box_loss_border" : 0.1,
                "box_loss_value" : 0.4,
                "box_loss_weight" : 1
            },
            "modding" : {
                "stream_regularizer" : 1,
                "slider_mirror" : 1
            }
        },
        "inst" : {
            "rhythm_model" : "models/inst/rhythm_model",
            "flow_dataset" : "models/inst/flow_dataset.npz",
            "rhythm_param" : [1, 0.4, 0, [0, 0, 0, 0], 8],
            "gan" : {
                "divisor" : 4,
                "good_epoch" : 6,
                "max_epoch" : 25,
                "note_group_size" : 10,
                "g_epochs" : 7,
                "c_epochs" : 3,
                "g_batch" : 50,
                "g_input_size" : 50,
                "c_true_batch" : 150,
                "c_false_batch" : 10,
                "c_randfalse_batch" : 5,
                "note_distance_basis" : 200,
                "next_from_slider_end" : False,
                "max_ticks_for_ds" : 2,
                "box_loss_border" : 0.1,
                "box_loss_value" : 0.4,
                "box_loss_weight" : 1
            },
            "modding" : {
                "stream_regularizer" : 4,
                "slider_mirror" : 1
            }
        },
        "lowbpm" : {
            "rhythm_model" : "models/lowbpm/rhythm_model",
            "flow_dataset" : "models/lowbpm/flow_dataset.npz",
            "rhythm_param" : [1, 0.55, 0.25, [0, 0, 0, 0], 8],
            "gan" : {
                "divisor" : 4,
                "good_epoch" : 12,
                "max_epoch" : 30,
                "note_group_size" : 10,
                "g_epochs" : 1,
                "c_epochs" : 1,
                "g_batch" : 50,
                "g_input_size" : 50,
                "c_true_batch" : 140,
                "c_false_batch" : 5,
                "c_randfalse_batch" : 5,
                "note_distance_basis" : 320,
                "next_from_slider_end" : False,
                "max_ticks_for_ds" : 1,
                "box_loss_border" : 0.1,
                "box_loss_value" : 0.4,
                "box_loss_weight" : 1
            },
            "modding" : {
                "stream_regularizer" : 1,
                "slider_mirror" : 1
            }
        },
        "tvsize" : {
            "rhythm_model" : "models/tvsize/rhythm_model",
            "flow_dataset" : "models/tvsize/flow_dataset.npz",
            "rhythm_param" : [1, 0.3, 0.1, [0, 0, 0, 0], 8],
            "gan" : {
                "divisor" : 4,
                "good_epoch" : 6,
                "max_epoch" : 20,
                "note_group_size" : 10,
                "g_epochs" : 7,
                "c_epochs" : 3,
                "g_batch" : 50,
                "g_input_size" : 50,
                "c_true_batch" : 90,
                "c_false_batch" : 6,
                "c_randfalse_batch" : 4,
                "note_distance_basis" : 200,
                "next_from_slider_end" : False,
                "max_ticks_for_ds" : 2,
                "box_loss_border" : 0.15,
                "box_loss_value" : 0.4,
                "box_loss_weight" : 1
            },
            "modding" : {
                "stream_regularizer" : 3,
                "slider_mirror" : 1
            }
        },
        "hard" : {
            "rhythm_model" : "models/hard/rhythm_model",
            "flow_dataset" : "models/hard/flow_dataset.npz",
            "rhythm_param" : [1, 0.28, 0, [0, 0, 0, 0], 8],
            "gan" : {
                "divisor" : 4,
                "good_epoch" : 4,
                "max_epoch" : 8,
                "note_group_size" : 10,
                "g_epochs" : 1,
                "c_epochs" : 1,
                "g_batch" : 50,
                "g_input_size" : 50,
                "c_true_batch" : 240,
                "c_false_batch" : 5,
                "c_randfalse_batch" : 5,
                "note_distance_basis" : 160,
                "next_from_slider_end" : False,
                "max_ticks_for_ds" : 4,
                "box_loss_border" : 0.1,
                "box_loss_value" : 0.4,
                "box_loss_weight" : 1
            },
            "modding" : {
                "stream_regularizer" : 3,
                "slider_mirror" : 1
            }
        },
        "normal" : {
            "rhythm_model" : "models/normal/rhythm_model",
            "flow_dataset" : "models/normal/flow_dataset.npz",
            "rhythm_param" : [1, 0.16, 0, [0, 0, 0, 0], 8],
            "gan" : {
                "divisor" : 4,
                "good_epoch" : 3,
                "max_epoch" : 12,
                "note_group_size" : 10,
                "g_epochs" : 5,
                "c_epochs" : 2,
                "g_batch" : 50,
                "g_input_size" : 50,
                "c_true_batch" : 50,
                "c_false_batch" : 2,
                "c_randfalse_batch" : 18,
                "note_distance_basis" : 100,
                "next_from_slider_end" : True,
                "max_ticks_for_ds" : 8,
                "box_loss_border" : 0.15,
                "box_loss_value" : 0.4,
                "box_loss_weight" : 1
            },
            "modding" : {
                "stream_regularizer" : 0,
                "slider_mirror" : 1
            }
        },
        "taiko" : {
            "rhythm_model" : "models/taiko/rhythm_model",
            "flow_dataset" : "models/taiko/flow_dataset.npz",
            "hs_dataset" : "models/taiko/hs_dataset.npz",
            "rhythm_param" : [1, 0.5, 0, [0, 0, 0, 0], 8],
            "gan" : {
                "divisor" : 4,
                "good_epoch" : 0,
                "max_epoch" : 0,
                "note_group_size" : 10,
                "g_epochs" : 5,
                "c_epochs" : 2,
                "g_batch" : 50,
                "g_input_size" : 50,
                "c_true_batch" : 50,
                "c_false_batch" : 2,
                "c_randfalse_batch" : 18,
                "note_distance_basis" : 100,
                "next_from_slider_end" : True,
                "max_ticks_for_ds" : 8,
                "box_loss_border" : 0.1,
                "box_loss_value" : 0.4,
                "box_loss_weight" : 1
            },
            "modding" : {
                "stream_regularizer" : 0,
                "slider_mirror" : 0
            }
        },
        "catch" : {
            "rhythm_model" : "models/catch/rhythm_model",
            "flow_dataset" : "models/catch/flow_dataset.npz",
            "rhythm_param" : [1, 0.35, 0, [0, 0, 0, 0], 8],
            "gan" : {
                "divisor" : 4,
                "good_epoch" : 15,
                "max_epoch" : 35,
                "note_group_size" : 10,
                "g_epochs" : 1,
                "c_epochs" : 1,
                "g_batch" : 50,
                "g_input_size" : 50,
                "c_true_batch" : 130,
                "c_false_batch" : 10,
                "c_randfalse_batch" : 10,
                "note_distance_basis" : 200,
                "next_from_slider_end" : True,
                "max_ticks_for_ds" : 0,
                "box_loss_border" : 0.1,
                "box_loss_value" : 0.3,
                "box_loss_weight" : 1
            },
            "modding" : {
                "stream_regularizer" : 0,
                "slider_mirror" : 1
            }
        }
    };
    if model_name not in model_data:
        return model_data["default"];
    return model_data[model_name];