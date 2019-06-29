import re, os, subprocess, json, soundfile
import numpy as np

workingdir = os.path.dirname(os.path.abspath(__file__));
os.chdir(workingdir);

global GLOBAL_VARS;
GLOBAL_VARS = {
    "ffmpeg_path" : "ffmpeg"
};

# "convert" will also convert the music file, generating wavfile.wav in local path
def read_osu_file(path, convert=False, wav_name="wavfile.wav", json_name="temp_json_file.json"):
    file_dir = os.path.dirname(os.path.abspath(path));

    # ask node.js to convert the .osu file to .json format
    # this is my own converter (not the one on npm) made a few years ago
    # tweaked a little to get it running in node.
    # ... no one cares about that anyways.
    subprocess.call(["node", "load_map.js", "jq", path, json_name]);

    with open(json_name, encoding="utf-8") as map_json:
        map_dict = json.load(map_json); # not "loads" it is not a string

        if convert:
            mp3_file = os.path.join(file_dir, map_dict["general"]["AudioFilename"]);
            subprocess.call([GLOBAL_VARS["ffmpeg_path"], "-y", "-i", mp3_file, wav_name]);

    # delete the temp json here!!!
    if json_name == "temp_json_file.json":
        os.remove(json_name);

    return map_dict, wav_name;

def get_map_timing_array(map_json, length=-1, divisor=4):
    if length == -1:
        length = map_json["obj"][-1]["time"] + 1000; # it has an extra time interval after the last note
        if map_json["obj"][-1]["type"] & 8: # spinner end
            length = map_json["obj"][-1]["spinnerEndTime"] + 1000;
    uts_a =  map_json["timing"]["uts"];
    out = [];
    for i, uts in enumerate(uts_a):
        begin_time = uts["beginTime"];
        mspb = uts["tickLength"];
        if i < len(uts_a)-1:
            end_time = uts_a[i+1]["beginTime"];
        else:
            end_time = length;
        arr = np.floor(np.arange(begin_time, end_time, mspb / divisor));
        out = out + list(map(lambda f: int(f), arr));
    return out;

def get_tick_len(map_json, tick):
    uts_a = map_json["timing"]["uts"];
    if tick < uts_a[0]["beginTime"]:
        return uts_a[0]["tickLength"];
    for uts in reversed(uts_a):
        if tick >= uts["beginTime"]:
            return uts["tickLength"];

def get_slider_len(map_json, tick):
    ts_a = map_json["timing"]["ts"];
    if tick < ts_a[0]["beginTime"]:
        return ts_a[0]["sliderLength"];
    for ts in reversed(ts_a):
        if tick >= ts["beginTime"]:
            return ts["sliderLength"];

def get_slider_len_ts(ts_a, tick):
    if tick < ts_a[0]["beginTime"]:
        return ts_a[0]["sliderLength"];
    for ts in reversed(ts_a):
        if tick >= ts["beginTime"]:
            return ts["sliderLength"];

def get_end_time(note):
    if note["type"] & 8:
        return note["spinnerEndTime"];
    elif note["type"] & 2:
        return note["sliderData"]["endTime"];
    #elif note["type"] & 128:
    #    return note["holdEndTime"];
    else:
        return note["time"];

# edited from uts to ts wwww
def get_all_ticks_and_lengths_from_ts(uts_array, ts_array, end_time, divisor=4):
    # Returns array of all timestamps, ticklens and sliderlens.
    endtimes = ([uts["beginTime"] for uts in uts_array] + [end_time])[1:];
    ticks = [np.arange(uts["beginTime"], endtimes[i], uts["tickLength"] / divisor) for i, uts in enumerate(uts_array)];
    tick_len = [[uts["tickLength"]] * len(np.arange(uts["beginTime"], endtimes[i], uts["tickLength"] / divisor)) for i, uts in enumerate(uts_array)];
    # slider_len = [[ts["sliderLength"]] * len(np.arange(ts["beginTime"], endtimes[i], ts["tickLength"] / divisor)) for i, ts in enumerate(ts_array)];
    slider_len = [get_slider_len_ts(ts_array, tick) for tick in np.concatenate(ticks)];
    return np.round(np.concatenate(ticks)).astype(int), np.concatenate(tick_len), np.array(slider_len);

def get_end_point(note):
    if note["type"] & 8:
        return np.array([256, 192]);
    elif note["type"] & 2:
        return np.array(note["sliderData"]["endpoint"]);
    else:
        return np.array([note["x"], note["y"]]);

def get_input_vector(note, prev_note):
    if note["type"] & 8:
        return None;
    #elif note["type"] & 2:
    #    return np.array(note["sliderData"]["dIn"]);
    else:
        vec = np.array([note["x"], note["y"]]) - get_end_point(prev_note);
        return vec / max(0.001, np.sqrt(vec.dot(vec)));

def get_output_vector(note, prev_note):
    if note["type"] & 8:
        return None;
    elif note["type"] & 2:
        return np.array(note["sliderData"]["dOut"]);
    else:
        vec = np.array([note["x"], note["y"]]) - get_end_point(prev_note);
        return vec / max(0.001, np.sqrt(vec.dot(vec)));

def get_angular_momentum(note, prev_note, prev2_note):
    v1 = get_input_vector(note, prev_note);
    v0 = get_output_vector(prev_note, prev2_note);
    if v0 is None or v1 is None or v0[0] is None or v1[0] is None:
        return 0;
    return (np.arctan2(v1[1], v1[0]) - np.arctan2(v0[1], v0[0])) / max(10, (note["time"] - get_end_time(prev_note)));

def get_momentum(note, prev_note):
    v1 = np.array([note["x"], note["y"]]);
    v0 = get_end_point(prev_note);
    v = v1 - v0;
    if note["time"] - get_end_time(prev_note) == 0 or note["time"] - prev_note["time"] == 0:
        # it has the same time the previous note ends. either a bugged sliderend or a double note
        return 0;
    end_type_momentum = np.sqrt(v.dot(v)) / (note["time"] - get_end_time(prev_note));

    # Since slider jumps in maps cause this parameters to learned too high
    # we try to deal with slider leniency by using the beginning of slider
    v2 = np.array([prev_note["x"], prev_note["y"]]);
    v3 = v1 - v2;
    start_type_momentum = np.sqrt(v3.dot(v3)) / (note["time"] - prev_note["time"]);
    return np.min([end_type_momentum, start_type_momentum]);

def get_map_notes(map_json, **kwargs):
    length = kwargs.get("length", -1);
    divisor = kwargs.get("divisor", 4);
    tick_times = get_map_timing_array(map_json, length = length, divisor = divisor);

    objs = map_json["obj"];
    obj_times = list(map(lambda obj: obj["time"], objs));

    def get_note_type(obj):
        if not obj:
            return 0;
        if obj["type"] & 2:
            return 2;
        elif obj["type"] & 8:
            return 3;
        return 1;

    po = 0;
    note_max_wait_time = kwargs.get("note_max_wait_time", 1000);
    start_time = obj_times[0] - note_max_wait_time;
    last_obj_time = start_time;
    sliding = 0;
    slider_end_time = 0;
    spinning = 0;
    spinner_end_time = 0;
    data = [];
    flow_data = [];

    tlen_mp = 1/500;
    tlen_s = 1;
    bpm_mp = 1/120;
    bpm_s = 1;
    slen_mp = 1/150;
    slen_s = 1;

    for i, tick in enumerate(tick_times):

        # Attach extra vars at the end of each note datum
        tlen = get_tick_len(map_json, tick);
        bpm = 60000 / tlen;
        slen = get_slider_len(map_json, tick);
        ex1 = tlen * tlen_mp - tlen_s;
        ex2 = bpm * bpm_mp - bpm_s;
        ex3 = slen * slen_mp - slen_s;

        while obj_times[po] < tick - 5 and po < len(obj_times) - 1:
            po += 1;
        if obj_times[po] >= tick - 5 and obj_times[po] <= tick + 5: # found note
            last_obj_time = tick;
            note_type = get_note_type(objs[po]);

            # calculate momentum
            if po >= 1:
                momentum = get_momentum(objs[po], objs[po-1]);
            else:
                momentum = 0;

            # calculate angular momentum
            if po >= 2:
                angular_momentum = get_angular_momentum(objs[po], objs[po-1], objs[po-2]);
            else:
                angular_momentum = 0;

            # flow data
            if po >= 1:
                input_vector = get_input_vector(objs[po], objs[po-1]);
                output_vector = get_output_vector(objs[po], objs[po-1]);
            else:
                input_vector = [0, 0];
                output_vector = [0, 0];
            if input_vector is None or input_vector[0] is None or input_vector[1] is None:
                input_vector = [0, 0];
            if output_vector is None or output_vector[0] is None or output_vector[1] is None:
                output_vector = [0, 0];

            # end point
            endpoint = get_end_point(objs[po]);
            flow_data.append([i, tick, note_type, objs[po]["x"], objs[po]["y"], input_vector[0], input_vector[1], output_vector[0], output_vector[1], endpoint[0], endpoint[1]]);

            # put data
            if note_type == 1:
                spinning = 0;
                sliding = 0;
            elif note_type == 2:
                sliding = 1;
                slider_end_time = objs[po]["sliderData"]["endTime"];
            elif note_type == 3:
                spinning = 1;
                spinner_end_time = objs[po]["spinnerEndTime"];
                # because the spinner sometimes get over 3 secs
                last_obj_time = spinner_end_time;

            # TICK, TIME, NOTE, NOTE_TYPE, SLIDING, SPINNING, MOMENTUM, ANGULAR_MOMENTUM, Ex1, Ex2, Ex3
            data.append([i, tick, 1, note_type, sliding, spinning, momentum, angular_momentum, ex1, ex2, ex3]);
        elif spinning == 1:
            if tick >= spinner_end_time - 5:
                # somehow it is better not to put a note here (?)
                spinning = 0;
                data.append([i, tick, 1, 5, 0, 0, 0, 0, ex1, ex2, ex3]);
            else:
                data.append([i, tick, 0, 0, 0, 1, 0, 0, ex1, ex2, ex3]);
        elif sliding == 1:
            if tick >= slider_end_time - 5:
                # somehow it is better not to put a note here (?)
                sliding = 0;
                data.append([i, tick, 1, 4, 0, 0, 0, 0, ex1, ex2, ex3]);
            else:
                data.append([i, tick, 0, 0, 1, 0, 0, 0, ex1, ex2, ex3]);
        else: # not found
            if tick - last_obj_time < note_max_wait_time and tick >= start_time:
                data.append([i, tick, 0, 0, 0, 0, 0, 0, ex1, ex2, ex3]);
    return data, flow_data;

def get_freqs(sig, fft_size):
    Lf = np.fft.fft(sig, fft_size);
    Lc = Lf[0:fft_size//2];
    La = np.abs(Lc[0:fft_size//2]);
    Lg = np.angle(Lc[0:fft_size//2]);
    return La, Lg;

def slice_wave_at(ms, sig, samplerate, size):
    ind = (ms/1000 * samplerate)//1;
    return sig[max(0, int(ind - size//2)):int(ind + size - size//2)];

def lrmix(sig):
    return (sig[:,0]+sig[:,1])/2;

def get_wav_data_at(ms, sig, samplerate, fft_size=2048, freq_low=0, freq_high=-1):
    if freq_high == -1:
        freq_high = samplerate//2;
    waveslice = slice_wave_at(ms, sig, samplerate, fft_size);

    # since osu! maps are usually not mapped to stereo wave, let's mix it to reduce 50% of data
    waveslice_lr = lrmix(waveslice);

    # do a nice FFT
    La, Lg = get_freqs(waveslice_lr, fft_size);

    # cut the frequency bins
    # freq_step * size == samplerate
    # freq_step * k == frequency
    # k/freq == size/smr
    # T O T A L L Y I D E N T I C A L
    La = La[fft_size*freq_low//samplerate:fft_size*freq_high//samplerate];
    Lg = Lg[fft_size*freq_low//samplerate:fft_size*freq_high//samplerate];

    return La, Lg;

def read_wav_data(timestamps, wavfile, snapint=[-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3], fft_size = 1024):
    sig, samplerate = soundfile.read(wavfile);
    data = list();

    # normalize sound wave
    # sig = sig / np.sqrt(np.mean(sig**2, axis=0));
    sig = sig / np.max(np.max(np.abs(sig), axis=0));

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


#
# Main function
# Generated data shape:
#     - "lst" file, table of [TICK, TIME, NOTE, IS_CIRCLE, IS_SLIDER, IS_SPINNER, IS_SLIDER_END, IS_SPINNER_END, SLIDING, SPINNING, MOMENTUM, ANGULAR_MOMENTUM, EX1, EX2, EX3], length MAPTICKS
#                                0,    1,    2,         3,         4,          5,             6,              7,        8,       9,       10,               11
#     - "wav" file, np.array, shape of [len(snapsize), MAPTICKS, 2, fft_size//4]
#     - "flow" file, table of [TICK, TIME, TYPE, X, Y, IN_DX, IN_DY, OUT_DX, OUT_DY] notes only
#
# MAPTICKS = (Total map time + 3000) / tickLength / (divisor = 4) - EMPTY_TICKS
# EMPTY_TICKS = ticks where no note around in 5 secs
#
def read_and_save_osu_file(path, filename = "saved", divisor=4):
    osu_dict, wav_file = read_osu_file(path, convert = True);
    data, flow_data = get_map_notes(osu_dict, divisor=divisor);
    timestamps = [c[1] for c in data];
    wav_data = read_wav_data(timestamps, wav_file, snapint=[-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3], fft_size = 128);
    # in order to match first dimension
    wav_data = np.swapaxes(wav_data, 0, 1);

    # change the representation of note_type
    # a bit of copypaste code because I changed the data structure many times here
    transformed_data = [];
    for d in data:
        if d[3] == 1:
            transformed_data.append([d[0], d[1], d[2], 1, 0, 0, 0, 0, d[4], d[5], d[6], d[7], d[8], d[9], d[10]]);
        elif d[3] == 2:
            transformed_data.append([d[0], d[1], d[2], 0, 1, 0, 0, 0, d[4], d[5], d[6], d[7], d[8], d[9], d[10]]);
        elif d[3] == 3:
            transformed_data.append([d[0], d[1], d[2], 0, 0, 1, 0, 0, d[4], d[5], d[6], d[7], d[8], d[9], d[10]]);
        elif d[3] == 4:
            transformed_data.append([d[0], d[1], d[2], 0, 0, 0, 1, 0, d[4], d[5], d[6], d[7], d[8], d[9], d[10]]);
        elif d[3] == 5:
            transformed_data.append([d[0], d[1], d[2], 0, 0, 0, 0, 1, d[4], d[5], d[6], d[7], d[8], d[9], d[10]]);
        else:
            transformed_data.append([d[0], d[1], d[2], 0, 0, 0, 0, 0, d[4], d[5], d[6], d[7], d[8], d[9], d[10]]);

    # import pandas as pd;
    # pd.DataFrame(flow_data).to_csv("flow.csv", header=["TICK", "TIME", "TYPE", "X", "Y", "IN_DX", "IN_DY", "OUT_DX", "OUT_DY"]);

    np.savez_compressed(filename, lst = transformed_data, wav = wav_data, flow = flow_data);
    
def read_and_save_timestamps(path, filename = "saved", divisor=4):
    osu_dict, wav_file = read_osu_file(path, convert = True);
    data, flow_data = get_map_notes(osu_dict, divisor=divisor);
    timestamps = [c[1] for c in data];
    with open(filename + "_ts.json", "w") as json_file:
        json.dump(np.array(timestamps).tolist(), json_file);
        
def read_and_save_osu_file_using_json_wavdata(path, json_path, filename = "saved", divisor=4):
    osu_dict, wav_file = read_osu_file(path, convert = True);
    data, flow_data = get_map_notes(osu_dict, divisor=divisor);
    with open(json_path) as wav_json:
        wav_data = json.load(wav_json)
    # in order to match first dimension
    # wav_data = np.swapaxes(wav_data, 0, 1);

    # change the representation of note_type
    # a bit of copypaste code because I changed the data structure many times here
    transformed_data = [];
    for d in data:
        if d[3] == 1:
            transformed_data.append([d[0], d[1], d[2], 1, 0, 0, 0, 0, d[4], d[5], d[6], d[7], d[8], d[9], d[10]]);
        elif d[3] == 2:
            transformed_data.append([d[0], d[1], d[2], 0, 1, 0, 0, 0, d[4], d[5], d[6], d[7], d[8], d[9], d[10]]);
        elif d[3] == 3:
            transformed_data.append([d[0], d[1], d[2], 0, 0, 1, 0, 0, d[4], d[5], d[6], d[7], d[8], d[9], d[10]]);
        elif d[3] == 4:
            transformed_data.append([d[0], d[1], d[2], 0, 0, 0, 1, 0, d[4], d[5], d[6], d[7], d[8], d[9], d[10]]);
        elif d[3] == 5:
            transformed_data.append([d[0], d[1], d[2], 0, 0, 0, 0, 1, d[4], d[5], d[6], d[7], d[8], d[9], d[10]]);
        else:
            transformed_data.append([d[0], d[1], d[2], 0, 0, 0, 0, 0, d[4], d[5], d[6], d[7], d[8], d[9], d[10]]);

    # import pandas as pd;
    # pd.DataFrame(flow_data).to_csv("flow.csv", header=["TICK", "TIME", "TYPE", "X", "Y", "IN_DX", "IN_DY", "OUT_DX", "OUT_DY"]);

    np.savez_compressed(filename, lst = transformed_data, wav = wav_data, flow = flow_data);

def read_and_save_osu_tester_file(path, filename = "saved", json_name="mapthis.json", divisor=4):
    osu_dict, wav_file = read_osu_file(path, convert = True, json_name=json_name);
    sig, samplerate = soundfile.read(wav_file);
    file_len = (sig.shape[0] / samplerate * 1000 - 3000);

    timestamps, tick_lengths, slider_lengths = get_all_ticks_and_lengths_from_ts(osu_dict["timing"]["uts"], osu_dict["timing"]["ts"], file_len, divisor=divisor);
    ticks = np.array([i for i,k in enumerate(timestamps)]);
    # uts = osu_dict["timing"]["uts"][0];
    # ticks = np.array(list(range(0,int((file_len - uts["beginTime"])/uts["tickLength"]*4))));
    # timestamps = np.floor(ticks * uts["tickLength"]/4 + uts["beginTime"]);
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

# import pandas as pd;
# pd.DataFrame(data).to_csv("hmmmm.csv", header=["TICK", "TIME", "NOTE", "NOTE_TYPE", "SLIDING", "SPINNING", "MOMENTUM", "ANGULAR_MOMENTUM"]);
# print(subprocess.call("node load_map.js j pinkheart.osu t.json"));
# print(subprocess.call(["node", "load_map.js", "o", "t.json", "z.osu"]));

def test_process_path(path):
    try:
        subprocess.call([path, "--version"]);
        return True;
    except:
        print("Cannot find executable on {}".format(path));
        return False;
