# -*- coding: utf-8 -*-

#
# Part 2 action script
#

import tensorflow as tf
from tensorflow import keras
import numpy as np
import matplotlib.pyplot as plt
import os, re

root = "mapdata/";

# set divisor
divisor = 4;

# this is a global variable!
time_interval = 16;

# lst file, [TICK, TIME, NOTE, IS_CIRCLE, IS_SLIDER, IS_SPINNER, IS_NOTE_END, UNUSED,
#               0,    1,    2,         3,         4,          5,           6,      7,
#            SLIDING, SPINNING, MOMENTUM, EX1, EX2, EX3], length MAPTICKS
#                  8,        9,       10,  11,  12,  13,
# wav file, [len(snapsize), MAPTICKS, 2, fft_size//4]

try: # Idk if it works
    os.environ['TF_FORCE_GPU_ALLOW_GROWTH'] = "true"
except:
    pass

def read_npz(fn):
    with np.load(fn) as data:
        wav_data = data["wav"];
        wav_data = np.swapaxes(wav_data, 2, 3);
        train_data = wav_data;
        div_source = data["lst"][:, 0];
        div_source2 = data["lst"][:, 11:14];
        div_data = np.concatenate([divisor_array(div_source), div_source2], axis=1);
        lst_data = data["lst"][:, 2:10];
        lst_data = 2 * lst_data - 1;
        train_labels = lst_data;
    return train_data, div_data, train_labels;

def divisor_array(t):
    d_range = list(range(0, divisor));
    return np.array([[int(k % divisor == d) for d in d_range] for k in t]);

def read_npz_list():
    npz_list = [];
    for file in os.listdir(root):
        if file.endswith(".npz"):
            npz_list.append(os.path.join(root, file));
    return npz_list;

def prefilter_data(train_data_unfiltered, div_data_unfiltered, train_labels_unfiltered):
    # Filter out slider ends from the training set, since we cannot reliably decide if a slider end is on a note.
    # Another way is to set 0.5 for is_note value, but that will break the validation algorithm.
    # Also remove the IS_SLIDER_END, IS_SPINNER_END columns which are left to be zeros.

    # Before: IS_NOTE_START, IS_CIRCLE, IS_SLIDER, IS_SPINNER, IS_NOTE_END, UNUSED, SLIDING, SPINNING
    #                     0,         1,         2,          3,           4,      5,       6,        7
    # After:  IS_NOTE_START, IS_CIRCLE, IS_SLIDER, IS_SPINNER, IS_NOTE_END, UNUSED
    #                     0,         1,         2,          3,           4,      5

    non_object_end_indices = [i for i,k in enumerate(train_labels_unfiltered) if True or k[4] == -1 and k[5] == -1];
    train_data = train_data_unfiltered[non_object_end_indices];
    div_data = div_data_unfiltered[non_object_end_indices];
    train_labels = train_labels_unfiltered[non_object_end_indices][:, [0, 1, 2, 3, 4]];

    # should be (X, 7, 32, 2) and (X, 6) in default sampling settings
    # (X, fft_window_type, freq_point, magnitude/phase)
    return train_data, div_data, train_labels;

def preprocess_npzs(train_data_unfiltered, div_data_unfiltered, train_labels_unfiltered):
    train_data, div_data, train_labels = prefilter_data(train_data_unfiltered, div_data_unfiltered, train_labels_unfiltered);

    # Make time intervals from training data
    if train_data.shape[0]%time_interval > 0:
        train_data = train_data[:-(train_data.shape[0]%time_interval)];
        div_data = div_data[:-(div_data.shape[0]%time_interval)];
        train_labels = train_labels[:-(train_labels.shape[0]%time_interval)];
    train_data2 = np.reshape(train_data, (-1, time_interval, train_data.shape[1], train_data.shape[2], train_data.shape[3]))
    div_data2 = np.reshape(div_data, (-1, time_interval, div_data.shape[1]))
    train_labels2 = np.reshape(train_labels, (-1, time_interval, train_labels.shape[1]))
    return train_data2, div_data2, train_labels2;

def get_data_shape():
    for file in os.listdir(root):
        if file.endswith(".npz"):
            train_data_unfiltered, div_data_unfiltered, train_labels_unfiltered = read_npz(os.path.join(root, file));
            train_data, div_data, train_labels = prefilter_data(train_data_unfiltered, div_data_unfiltered, train_labels_unfiltered);
            # should be (X, 7, 32, 2) and (X, 6) in default sampling settings
            # (X, fft_window_type, freq_point, magnitude/phase)
            # X = 76255
            # print(train_data.shape, train_labels.shape);
            if train_data.shape[0] == 0:
                continue;
            return train_data.shape, div_data.shape, train_labels.shape;
    print("cannot find npz!! using default shape");
    return (-1, 7, 32, 2), (-1, 3 + divisor), (-1, 5);

def read_some_npzs_and_preprocess(npz_list):
    train_shape, div_shape, label_shape = get_data_shape();
    td_list = [];
    dd_list = [];
    tl_list = [];
    for fp in npz_list:
        if fp.endswith(".npz"):
            _td, _dd, _tl = read_npz(fp);
            if _td.shape[1:] != train_shape[1:]:
                print("Warning: something wrong found in {}! shape = {}".format(fp, _td.shape));
                continue;
            td_list.append(_td);
            dd_list.append(_dd);
            tl_list.append(_tl);
    train_data_unfiltered = np.concatenate(td_list);
    div_data_unfiltered = np.concatenate(dd_list);
    train_labels_unfiltered = np.concatenate(tl_list);

    train_data2, div_data2, train_labels2 = preprocess_npzs(train_data_unfiltered, div_data_unfiltered, train_labels_unfiltered);
    return train_data2, div_data2, train_labels2;

def train_test_split(train_data2, div_data2, train_labels2, test_split_count=233):
    """
    Split data into train and test.
    Note that there is no randomization. It doesn't really matter here, but in other machine learning it's obligatory.
    Requires at least 233 rows of data or it will throw an error. (Tick count/10, around 1.5-2 full length maps)
    """
    new_train_data = train_data2[:-test_split_count];
    new_div_data = div_data2[:-test_split_count];
    new_train_labels = train_labels2[:-test_split_count];
    test_data = train_data2[-test_split_count:];
    test_div_data = div_data2[-test_split_count:];
    test_labels = train_labels2[-test_split_count:];
    return (new_train_data, new_div_data, new_train_labels), (test_data, test_div_data, test_labels);

# (train_data_unfiltered, div_data_unfiltered, train_labels_unfiltered) = read_all_npzs();


def set_param_fallback(PARAMS):
    try:
        divisor = PARAMS["divisor"];
    except:
        divisor = 4;
    if "train_epochs" not in PARAMS:
        PARAMS["train_epochs"] = 16;
    if "train_epochs_many_maps" not in PARAMS:
        PARAMS["train_epochs_many_maps"] = 6;
    if "too_many_maps_threshold" not in PARAMS:
        PARAMS["too_many_maps_threshold"] = 200;
    if "data_split_count" not in PARAMS:
        PARAMS["data_split_count"] = 80;
    if "plot_history" not in PARAMS:
        PARAMS["plot_history"] = True;
    if "train_batch_size" not in PARAMS:
        PARAMS["train_batch_size"] = None;
    return PARAMS;

# Build the model

from tensorflow.keras.models import Model;

def build_model():
    """
    Build the model.
    Two inputs for wav_data and div_data (metadata) respectively.
    Hyperparameters in the middle are tuned to make sure it runs smoothly on my machine.
    You can try changing them in the middle if it achieves better result.
    """
    train_shape, div_shape, label_shape = get_data_shape();
    model1 = keras.Sequential([
        keras.layers.TimeDistributed(keras.layers.Conv2D(16, (2, 2),
                           data_format='channels_last'),
                           input_shape=(time_interval, train_shape[1], train_shape[2], train_shape[3])),
        keras.layers.TimeDistributed(keras.layers.MaxPool2D((1, 2),
                           data_format='channels_last')),
        keras.layers.TimeDistributed(keras.layers.Activation(activation=tf.nn.relu)),
        keras.layers.TimeDistributed(keras.layers.Dropout(0.3)),
        keras.layers.TimeDistributed(keras.layers.Conv2D(16, (2, 3),
                           data_format='channels_last')),
        keras.layers.TimeDistributed(keras.layers.MaxPool2D((1, 2),
                           data_format='channels_last')),
        keras.layers.TimeDistributed(keras.layers.Activation(activation=tf.nn.relu)),
        keras.layers.TimeDistributed(keras.layers.Dropout(0.3)),
        keras.layers.TimeDistributed(keras.layers.Flatten()),
        keras.layers.LSTM(64, activation=tf.nn.tanh, return_sequences=True)
    ])

    input2 = keras.layers.InputLayer(input_shape=(time_interval, div_shape[1]));

    conc = keras.layers.concatenate([model1.output, input2.output]);
    dense1 = keras.layers.Dense(71, activation=tf.nn.tanh)(conc);
    dense2 = keras.layers.Dense(71, activation=tf.nn.relu)(dense1);
    dense3 = keras.layers.Dense(label_shape[1], activation=tf.nn.tanh)(dense2);


    # I think the first is correct but whatever...
    try:
        optimizer = tf.optimizers.RMSprop(0.001) #Adamoptimizer?
    except:
        optimizer = tf.train.RMSPropOptimizer(0.001) #Adamoptimizer?


    final_model = Model(inputs=[model1.input, input2.input], outputs=dense3);
    final_model.compile(loss='mse',
                optimizer=optimizer,
                metrics=[keras.metrics.mae])
    return final_model


def plot_history(history):
    plt.figure()
    plt.xlabel('Epoch')
    plt.ylabel('Mean Abs Error [Limitless]')
    plt.plot(history.epoch, np.array(history.history['mean_absolute_error']),
           label='Train MAE')
    plt.plot(history.epoch, np.array(history.history['val_mean_absolute_error']),
           label = 'Val MAE')
    plt.plot(history.epoch, np.array(history.history['loss']),
           label='Train Loss')
    plt.plot(history.epoch, np.array(history.history['val_loss']),
           label = 'Val Loss')
    plt.legend()
    plt.show()

# Display training progress by printing a single dot for each completed epoch.
class PrintDot(keras.callbacks.Callback):
    def on_epoch_end(self,epoch,logs):
        if epoch % 100 == 0: print('')
        print('.', end='')

def step2_build_model():
    model_v7 = build_model();
    return model_v7;


def step2_train_model(model, PARAMS):
    global history, new_train_data, new_div_data, new_train_labels, test_data, test_div_data, test_labels;
    PARAMS = set_param_fallback(PARAMS);

    train_file_list = read_npz_list();

    # Don't worry, it will successfully overfit after those 16 epochs.
    EPOCHS = PARAMS["train_epochs"]
    too_many_maps_threshold = PARAMS["too_many_maps_threshold"]
    data_split_count = PARAMS["data_split_count"]
    batch_size = PARAMS["train_batch_size"]

    early_stop = keras.callbacks.EarlyStopping(monitor='mean_absolute_error', patience=20)

    # if there is too much data, reduce epoch count (hmm)
    if len(train_file_list) >= too_many_maps_threshold:
        EPOCHS = PARAMS["train_epochs_many_maps"]

    if len(train_file_list) < too_many_maps_threshold:
        train_data2, div_data2, train_labels2 = read_some_npzs_and_preprocess(train_file_list);

        # Split some test data out
        (new_train_data, new_div_data, new_train_labels), (test_data, test_div_data, test_labels) = train_test_split(train_data2, div_data2, train_labels2);

        # Store training stats
        history = model.fit([new_train_data, new_div_data], new_train_labels, epochs=EPOCHS,
                            validation_split=0.2, verbose=0, batch_size=batch_size,
                            callbacks=[early_stop, PrintDot()])

        # For development! may cause bug in some environment.
        if PARAMS["plot_history"]:
            plot_history(history)
    else: # too much data! read it every turn.
        for epoch in range(EPOCHS):
            for map_batch in range(np.ceil(len(train_file_list) / data_split_count).astype(int)): # hmmmmm
                if map_batch == 0:
                    train_data2, div_data2, train_labels2 = read_some_npzs_and_preprocess(train_file_list[map_batch * data_split_count : (map_batch+1) * data_split_count]);
                    (new_train_data, new_div_data, new_train_labels), (test_data, test_div_data, test_labels) = train_test_split(train_data2, div_data2, train_labels2);
                else:
                    new_train_data, new_div_data, new_train_labels = read_some_npzs_and_preprocess(train_file_list[map_batch * data_split_count : (map_batch+1) * data_split_count]);

                history = model.fit([new_train_data, new_div_data], new_train_labels, epochs=1,
                                    validation_split=0.2, verbose=0, batch_size=batch_size,
                                    callbacks=[])
                # Manually print the dot
                print('.', end='');
            print('');
    return model;

# [loss, mae] = model.evaluate([test_data, test_div_data], test_labels, verbose=0)

# Accuracy
from sklearn.metrics import roc_auc_score;

def step2_evaluate(model):
    """
    Evaluate model using AUC score.
    Previously I used F1 but I think AUC is more appropriate for this type of data.

    High value (close to 1.00) doesn't always mean it's better. Usually it means you put identical maps in the training set.
    It shouldn't be possible to reach very high accuracy since that will mean that music 100% dictates map rhythm.
    """
    train_shape, div_shape, label_shape = get_data_shape();

    test_predictions = model.predict([test_data, test_div_data]).reshape((-1, time_interval, label_shape[1]))

    flat_test_preds = test_predictions.reshape(-1, label_shape[1]);
    flat_test_labels = test_labels.reshape(-1, label_shape[1]);

    pred_result = (flat_test_preds + 1) / 2
    actual_result = (flat_test_labels + 1) / 2

    # Individual column predictions
    column_names = ["is_note_start", "is_circle", "is_slider", "is_spinner", "is_note_end"];
    for i, k in enumerate(column_names):
        if i == 3: # No one uses spinners anyways
            continue;
        if i == 2 and np.sum(actual_result[:, i]) == 0: # No sliders (Taiko)
            continue;
        print("{} auc score: {}".format(k, roc_auc_score(actual_result[:, i], pred_result[:, i])))


def step2_save(model):
    tf.keras.models.save_model(
        model,
        "saved_rhythm_model",
        overwrite=True,
        include_optimizer=True,
        save_format="h5"
    );
