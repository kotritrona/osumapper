# -*- coding: utf-8 -*-

#
# OS related library functions
#

import re, os, subprocess, json;

def run_command(str_array):
    x = subprocess.Popen(str_array, stdout=subprocess.PIPE);
    return x.stdout.read();