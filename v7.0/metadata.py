# -*- coding: utf-8 -*-

#
# Metadata of .osu
#

import numpy as np

def get_difficulty_name():
    """
    Obtain a random difficulty name
    """
    diffs = ["Easy", "Normal", "Hard", "Insane", "Lunatic", "Extra", "Beginner", "Hyper", "Another", "Basic", "Novice", "Advanced",
             "Hell", "Expert", "Extra Stage", "Collab", "Colab", "FOUR DIMENSIONS", ".-- .-. --- -. --. .-- .- -.--"]
    return diffs[np.random.randint(0,len(diffs))]

def hsv_to_rgb(h, s, v):
    """
    Taken from stackoverflow 24852345
    """
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
    """
    Obtain a list of 5-8 random bright colors
    """
    count = np.random.randint(4,9)
    text_list = []
    for i in range(1, 1+count):
        text_list.append("Combo{} : {},{},{}".format(i, *hsv_to_rgb_255(np.random.random(), 0.4 + np.random.random() * 0.4, 1)))
    return "\n".join(text_list)
