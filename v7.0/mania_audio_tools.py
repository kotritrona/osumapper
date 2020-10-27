# -*- coding: utf-8 -*-

#
# For osu! file reading and analysis
#

import librosa;
import re, os, subprocess, json;
import numpy as np;
from os_tools import *;
from mania_analyze import *;

# It will always fail. Soundfile doesn't support mp3
import warnings;
warnings.filterwarnings("ignore", message="PySoundFile failed. Trying audioread instead.");

workingdir = os.path.dirname(os.path.abspath(__file__));
os.chdir(workingdir);

def read_osu_file(path, convert=False, wav_name="wavfile.wav", json_name="temp_json_file.json"):
    """
    Read .osu file to get audio path and JSON formatted map data
    "convert" will also read the music file (despite the name it doesn't convert)
    """
    file_dir = os.path.dirname(os.path.abspath(path));

    # ask node.js to convert the .osu file to .json format
    result = run_command(["node", "load_map.js", "jq", path, json_name]);
    if(len(result) > 1):
        print(result.decode("utf-8"));
        raise Exception("Map Convert Failure");

    with open(json_name, encoding="utf-8") as map_json:
        map_dict = json.load(map_json);

        if convert:
            mp3_file = os.path.join(file_dir, map_dict["general"]["AudioFilename"]);
            # result = run_command([FFMPEG_PATH, "-y", "-i", mp3_file, wav_name]);
            # if(len(result) > 1):
            #     print(result.decode("utf-8"));
            #     raise Exception("FFMPEG Failure");

    # delete the temp json later
    # if json_name == "temp_json_file.json":
    #     os.remove(json_name);

    return map_dict, mp3_file;

def get_freqs(sig, fft_size):
    """
    Do Fourier Transform and map imaginary to length/angle coordinates
    """
    Lf = np.fft.fft(sig, fft_size);
    Lc = Lf[0:fft_size//2];
    La = np.abs(Lc[0:fft_size//2]);
    Lg = np.angle(Lc[0:fft_size//2]);
    return La, Lg;

def slice_wave_at(ms, sig, samplerate, size):
    ind = (ms/1000 * samplerate)//1;
    return sig[max(0, int(ind - size//2)):int(ind + size - size//2)];

def lrmix(sig):
    """
    Get mono from stereo audio data. Unused in this version (already mono)
    """
    return (sig[:,0]+sig[:,1])/2;

def get_wav_data_at(ms, sig, samplerate, fft_size=2048, freq_low=0, freq_high=-1):
    if freq_high == -1:
        freq_high = samplerate//2;
    waveslice = slice_wave_at(ms, sig, samplerate, fft_size);

    # since osu! maps are usually not mapped to stereo wave, let's mix it to reduce 50% of data
    # waveslice_lr = lrmix(waveslice);

    # do a nice FFT
    La, Lg = get_freqs(waveslice, fft_size);

    # cut the frequency bins
    La = La[fft_size*freq_low//samplerate:fft_size*freq_high//samplerate];
    Lg = Lg[fft_size*freq_low//samplerate:fft_size*freq_high//samplerate];

    return La, Lg;

def read_wav_data(timestamps, wavfile, snapint=[-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3], fft_size = 1024):
    """
    Read audio data based on timestamps.

    Snapint are percentages of difference between two timestamps.
    These are read to handle potential small offset differences between python and osu!.

    Resampling disabled for librosa because it is too slow.
    """
    sig, samplerate = librosa.load(wavfile, sr=None, mono=True);
    data = list();

    # normalize sound wave
    # sig = sig / np.sqrt(np.mean(sig**2, axis=0));
    # sig = sig / np.max(np.max(np.abs(sig), axis=0));
    sig = sig / np.max(np.abs(sig));

    # calc a length array
    tmpts = np.array(timestamps);
    timestamp_interval = tmpts[1:] - tmpts[:-1];
    timestamp_interval = np.append(timestamp_interval, timestamp_interval[-1]);

    for sz in snapint:
        data_r = np.array([get_wav_data_at(max(0, min(len(sig) - fft_size, coord + timestamp_interval[i] * sz)), sig, samplerate, fft_size=fft_size, freq_high=samplerate//4) for i, coord in enumerate(timestamps)]);
        data.append(data_r);


    raw_data = np.array(data);
    norm_data = np.tile(np.expand_dims(np.mean(raw_data, axis=1), 1), (1, raw_data.shape[1], 1, 1));
    std_data = np.tile(np.expand_dims(np.std(raw_data, axis=1), 1), (1, raw_data.shape[1], 1, 1));
    return (raw_data - norm_data) / std_data;

def mania_transformed_lst_data(data):
    transformed_data = [];
    for d in data:
        if d[3] == 1:
            transformed_data.append([d[0], d[1], d[2], 1, 0, 0, 1, 0, d[4], d[5], d[6], d[7], d[8], d[9]]);
        elif d[3] == 2:
            transformed_data.append([d[0], d[1], d[2], 0, 1, 0, 0, 0, d[4], d[5], d[6], d[7], d[8], d[9]]);
        elif d[3] == 3:
            transformed_data.append([d[0], d[1], d[2], 1, 1, 0, 1, 0, d[4], d[5], d[6], d[7], d[8], d[9]]);
        elif d[3] == 4:
            transformed_data.append([d[0], d[1], d[2], 0, 0, 0, 1, 0, d[4], d[5], d[6], d[7], d[8], d[9]]);
        else:
            transformed_data.append([d[0], d[1], d[2], 0, 0, 0, 0, 0, d[4], d[5], d[6], d[7], d[8], d[9]]);
    return transformed_data;

def read_and_save_osu_file(path, filename = "saved", divisor=4):
    """
    # Main function
    # Generated data shape:
    #     - "lst" array, length MAPTICKS
    #        table of [TICK, TIME, NOTE, IS_CIRCLE, IS_SLIDER, IS_SPINNER, IS_NOTE_END, UNUSED, SLIDING, SPINNING, MOMENTUM, EX1, EX2, EX3],
    #                     0,    1,    2,         3,         4,          5,           6,      7,        8,       9,       10
    #     - "wav" array, shape of [len(snapsize), MAPTICKS, 2, fft_size//4]
    #     - "pattern" array, shape [num_groups, main_metronome * divisor, 2 * key_count + 1]
    #                        [:, :, 0]                         pattern_avail_hold
    #                        [:, :, 1:1+key_count]             pattern_note_begin
    #                        [:, :, 1+key_count:1+2*key_count] pattern_note_end
    #
    # MAPTICKS = (Total map time + 3000) / tickLength / (divisor = 4) - EMPTY_TICKS
    # EMPTY_TICKS = ticks where no note around in 5 secs
    """
    osu_dict, wav_file = read_osu_file(path, convert = True);
    data, pattern_data = get_map_notes_and_patterns(osu_dict, divisor=divisor);
    timestamps = [c[1] for c in data];
    wav_data = read_wav_data(timestamps, wav_file, snapint=[-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3], fft_size = 128);
    # in order to match first dimension
    wav_data = np.swapaxes(wav_data, 0, 1);

    # change the representation of note_type
    # a bit of copypaste code because I changed the data structure many times here
    transformed_data = mania_transformed_lst_data(data);

    np.savez_compressed(filename, lst = transformed_data, wav = wav_data, pattern = pattern_data);

def read_and_save_osu_tester_file(path, filename = "saved", json_name="mapthis.json", divisor=4):
    osu_dict, wav_file = read_osu_file(path, convert = True, json_name=json_name);
    sig, samplerate = librosa.load(wav_file, sr=None, mono=True);
    file_len = (sig.shape[0] / samplerate * 1000 - 3000);

    # ticks = ticks from each uninherited timing section
    ticks, timestamps, tick_lengths, slider_lengths = get_all_ticks_and_lengths_from_ts(osu_dict["timing"]["uts"], osu_dict["timing"]["ts"], file_len, divisor=divisor);

    # old version to determine ticks (all from start)
    # ticks = np.array([i for i,k in enumerate(timestamps)]);
    extra = np.array([60000 / tick_lengths, slider_lengths]);

    wav_data = read_wav_data(timestamps, wav_file, snapint=[-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3], fft_size = 128);
    # in order to match first dimension
    wav_data = np.swapaxes(wav_data, 0, 1);

    np.savez_compressed(filename, ticks = ticks, timestamps = timestamps, wav = wav_data, extra = extra);

def read_and_return_osu_file(path, divisor=4):
    osu_dict, wav_file = read_osu_file(path, convert = True);
    data, flow_data = get_map_notes(osu_dict, divisor=divisor);
    timestamps = [c[1] for c in data];
    wav_data = read_wav_data(timestamps, wav_file, snapint=[-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3], fft_size = 128);
    return data, wav_data, flow_data;

def test_process_path(path):
    """
    Use the version command to test if a dependency works
    """
    try:
        subprocess.call([path, "--version"]);
        return True;
    except:
        print("Cannot find executable on {}".format(path));
        return False;
