# -*- coding: utf-8 -*-

#
# Stream helpers
#

import numpy as np

def point_distance(p1, p2):
    x1, y1 = p1
    x2, y2 = p2
    return np.sqrt((x1-x2)**2 + (y1-y2)**2)

def find_center(p1, p2, r):
    x1, y1 = p1
    x2, y2 = p2
    x3 = (x1 + x2)/2
    y3 = (y1 + y2)/2
    L = np.sqrt((x1-x2)**2 + (y1-y2)**2)
    D = np.sqrt(r**2-(L/2)**2)
    x4 = x3 + D*(y1-y2)/L
    y4 = y3 + D*(x2-x1)/L
    x5 = x3 - D*(y1-y2)/L
    y5 = y3 - D*(x2-x1)/L
    return (x4, y4), (x5, y5)

def find_angle(p1, p2):
    x1, y1 = p1
    x2, y2 = p2
    return np.arctan2(y2 - y1, x2 - x1)

def get_arc_from_points_and_radius(p1, p2, r, direction=0):
    if direction == 0:
        c, _ = find_center(p1, p2, r)
    else:
        _, c = find_center(p1, p2, r)
    a1 = find_angle(c, p1)
    a2 = find_angle(c, p2)
    return c, a1, a2;

def get_point_from_arc(c, r, a):
    x, y = c;
    return (x + np.cos(a) * r, y + np.sin(a) * r);

def arc_interpolate(p1, p2, k, r=None, direction=None):
    if r is None:
        r = point_distance(p1, p2)/2 / np.random.random()
    elif r == -1:
        r = point_distance(p1, p2)/2 / np.random.random() / np.random.random()
    if direction is None:
        direction = np.random.randint(0,2)
    c, a1, a2 = get_arc_from_points_and_radius(p1, p2, r, direction)
    if a1-a2 > np.pi:
        a2 += np.pi * 2
    if a1-a2 < -np.pi:
        a2 -= np.pi * 2
    return get_point_from_arc(c, r, a1 * (1-k) + a2 * k)

def stream_regularizer(obj_array, data, mode=0):
    divisor = 4;

    if mode == 0:
        return obj_array, data;

    _, _, ticks, timestamps, is_slider, _, _, _, _, _, _, _ = data;

    starting_obj = -1;
    prev_tick = -32768;
    stream_count = 0;
    for i,obj in enumerate(obj_array):
        if ticks[i] - prev_tick == 1:
            stream_count += 1;
        else:
            if (mode == 3 or mode == 4) and stream_count >= 3:
                ending_obj = i-1;
                p1 = (obj_array[starting_obj][0], obj_array[starting_obj][1]);
                p2 = (obj_array[ending_obj][0], obj_array[ending_obj][1]);
                r = point_distance(p1, p2)/2 / np.random.random() / np.random.random();
                direction = np.random.randint(0,2);
                for k in range(stream_count - 2):
                    current_obj = starting_obj + k + 1;
                    pk = arc_interpolate(p1, p2, (k+1) / (stream_count-1), r, direction);
                    obj_array[current_obj][0], obj_array[current_obj][1] = pk;

            starting_obj = i;
            stream_count = 1;

        if mode == 4 and stream_count >= 5 and (ticks[i] % divisor == 0):
            if np.random.random() < 0.5:
                ending_obj = i;
                p1 = (obj_array[starting_obj][0], obj_array[starting_obj][1]);
                p2 = (obj_array[ending_obj][0], obj_array[ending_obj][1]);
                r = point_distance(p1, p2)/2 / np.random.random();
                direction = np.random.randint(0,2);
                for k in range(stream_count - 2):
                    current_obj = starting_obj + k + 1;
                    pk = arc_interpolate(p1, p2, (k+1) / (stream_count-1), r, direction);
                    obj_array[current_obj][0], obj_array[current_obj][1] = pk;

                starting_obj = i;
                stream_count = 1;

        if mode == 1 and stream_count == 3:
            if (ticks[starting_obj] % divisor == 0) or (ticks[starting_obj] % divisor == 2):
                # Move middle object to arc interpolated point
                p1 = (obj_array[starting_obj][0], obj_array[starting_obj][1]);
                p2 = (obj_array[i][0], obj_array[i][1]);
                p3 = arc_interpolate(p1, p2, 0.5);
                obj_array[starting_obj+1][0], obj_array[starting_obj+1][1] = p3;

                # Reset counter
                starting_obj = i;
                stream_count = 1;
            else:
                # Skip turn
                starting_obj += 1;
                stream_count -= 1;

        if mode == 2 and stream_count == 4:
            if ticks[starting_obj] % divisor == 0:
                # Move 2 middle objects to arc interpolated point
                p1 = (obj_array[starting_obj][0], obj_array[starting_obj][1]);
                p2 = (obj_array[i][0], obj_array[i][1]);
                r = point_distance(p1, p2)/2 / np.random.random() / np.random.random();
                direction = np.random.randint(0,2);
                p3 = arc_interpolate(p1, p2, 0.3333333, r, direction);
                p4 = arc_interpolate(p1, p2, 0.6666667, r, direction);
                obj_array[starting_obj+1][0], obj_array[starting_obj+1][1] = p3;
                obj_array[starting_obj+2][0], obj_array[starting_obj+2][1] = p4;

                # Force restart counter on next
                starting_obj = i+1;
                stream_count = 0;
                prev_tick = -32768;
                continue;
            else:
                # Skip turn
                starting_obj += 1;
                stream_count -= 1;

        prev_tick = ticks[i];

    return obj_array, data;
