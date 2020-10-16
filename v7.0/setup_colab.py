'use strict'; # In case of future updates if Python wanted to mimic JS

#
# Installation functions
#

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
            }
        },
        "default2" : {
            "rhythm_model" : "models/default/rhythm_model",
            "flow_dataset" : "models/default/flow_dataset.npz",
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
            }
        }
    };
    return model_data[model_name];