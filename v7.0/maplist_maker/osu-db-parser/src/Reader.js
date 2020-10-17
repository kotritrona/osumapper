/* Reader base from osu-packet! */
const OsuBuffer = require('osu-buffer');

class Reader {
    constructor() {
    }

    /**
     * Reads a set of data from a buffer
     * @param {OsuBuffer} buff
     * @param {Object} layout
     * @param {null|Number|Boolean|Object|Array|String} requires
     * @param {Object|Array} data
     * @return {Object|Array}
     */
    Read(buff, layout, data = {}) {
      switch (layout.type.toLowerCase()) {
        case 'int8':
          data = buff.ReadInt8();
          break;
        case 'uint8':
          data = buff.ReadUInt8();
          break;
        case 'int16':
          data = buff.ReadInt16();
          break;
        case 'uint16':
          data = buff.ReadUInt16();
          break;
        case 'int32':
          data = buff.ReadInt32();
          break;
        case 'uint32':
          data = buff.ReadUInt32();
          break;
        case 'int64':
          data = buff.ReadInt64();
          break;
        case 'uint64':
          data = buff.ReadUInt64();
          break;
        case 'string':
          data = buff.ReadOsuString();
          break;
        case 'float':
          data = buff.ReadFloat();
          break;
        case 'double':
          data = buff.ReadDouble();
          break;
        case 'boolean':
          data = buff.ReadBoolean();
          break;
        case 'byte':
          data = buff.ReadByte();
          break;
        case 'int32array': {
          let len = buff.ReadInt16();
          data = [];
          for (let i = 0; i < len; i++) {
            data.push(buff.ReadInt32());
          }
          break;
        }
        case "collections": {
          let collectionsCount = data['collectionscount'];
          data = [];
          for (let i=0; i < collectionsCount; i++) {
            let collection = {
              'name': buff.ReadOsuString(),
              'beatmapsCount': buff.ReadInt32(),
              'beatmapsMd5': []
            }

            for (let i=0; i<collection['beatmapsCount']; i++) {
              let bmmd5 = buff.ReadOsuString();
              collection['beatmapsMd5'].push(bmmd5)
            }

            data.push(collection);
          }
          break;
        }
        case "beatmaps": {
            let osuver = data['osuver'];
            let beatmapscount = data['beatmaps_count'];
            data = [];
            for (let i = 0; i < beatmapscount; i++) {
                if (osuver < 20191107) {
                  buff.ReadInt32(); // entry size xd
                }
                let beatmap = {
                  'artist_name': buff.ReadOsuString(),
                  'artist_name_unicode': buff.ReadOsuString(),
                  'song_title': buff.ReadOsuString(),
                  'song_title_unicode': buff.ReadOsuString(),
                  'creator_name': buff.ReadOsuString(),
                  'difficulty': buff.ReadOsuString(),
                  'audio_file_name': buff.ReadOsuString(),
                  'md5': buff.ReadOsuString(),
                  'osu_file_name': buff.ReadOsuString(),
                  'ranked_status': buff.ReadByte(),
                  'n_hitcircles': buff.ReadInt16(),
                  'n_sliders': buff.ReadInt16(),
                  'n_spinners': buff.ReadInt16(),
                  'last_modification_time': buff.ReadInt64()
                }

                if (osuver < 20140609) {
                  beatmap = {
                    ...beatmap,
                    'approach_rate': buff.ReadByte(),
                    'circle_size': buff.ReadByte(),
                    'hp_drain': buff.ReadByte(),
                    'overall_difficulty': buff.ReadByte()
                  }
                } else {
                  beatmap = {
                    ...beatmap,
                    'approach_rate': buff.ReadFloat(),
                    'circle_size': buff.ReadFloat(),
                    'hp_drain': buff.ReadFloat(),
                    'overall_difficulty': buff.ReadFloat()
                  }
                }

                beatmap['slider_velocity'] = buff.ReadDouble()

                if (osuver >= 20140609) {
                  let difficulties = []

                  for(let i = 0; i<4; i++) {
                    let length = buff.ReadInt32()
                    let diffs = {}
                    for(let i=0; i<length; i++) {
                        buff.ReadByte()
                        let mode = buff.ReadInt32();
                        buff.ReadByte();
                        let diff = buff.ReadDouble();
                        diffs[mode] = diff
                    }
                    difficulties.push(diffs)
                  }

                  beatmap = {
                    ...beatmap,
                    'star_rating_standard': difficulties[0],
                    'star_rating_taiko': difficulties[1],
                    'star_rating_ctb': difficulties[2],
                    'star_rating_mania': difficulties[3],
                  }
                }

                beatmap = {
                  ...beatmap,
                  'drain_time': buff.ReadInt32(),
                  'total_time': buff.ReadInt32(),
                  'preview_offset': buff.ReadInt32(),
                }

                let timingPoints = [];
                let timingPointsLength = buff.ReadInt32()
                for (let i = 0; i < timingPointsLength; i++) {
                  timingPoints.push([
                    buff.ReadDouble(), //BPM
                    buff.ReadDouble(), // offset
                    buff.ReadBoolean() // Boolean
                  ])
                }

                beatmap = {
                  ...beatmap,
                  'timing_points': timingPoints,
                  'beatmap_id': buff.ReadInt32(),
                  'beatmapset_id': buff.ReadInt32(),
                  'thread_id': buff.ReadInt32(),
                  'grade_standard': buff.ReadByte(),
                  'grade_taiko': buff.ReadByte(),
                  'grade_ctb': buff.ReadByte(),
                  'grade_mania': buff.ReadByte(),
                  'local_beatmap_offset': buff.ReadInt16(),
                  'stack_leniency': buff.ReadFloat(),
                  'mode': buff.ReadByte(),
                  'song_source': buff.ReadOsuString(),
                  'song_tags': buff.ReadOsuString(),
                  'online_offset': buff.ReadInt16(),
                  'title_font': buff.ReadOsuString(),
                  'unplayed': buff.ReadBoolean(),
                  'last_played': buff.ReadInt64(),
                  'osz2': buff.ReadBoolean(),
                  'folder_name': buff.ReadOsuString(),
                  'last_checked_against_repository': buff.ReadInt64(),
                  'ignore_sound': buff.ReadBoolean(),
                  'ignore_skin': buff.ReadBoolean(),
                  'disable_storyboard': buff.ReadBoolean(),
                  'disable_video': buff.ReadBoolean(),
                  'visual_override': buff.ReadBoolean()
                }

                if (osuver < 20140609) {
                  buff.ReadInt16()
                }
                beatmap['last_modification_time_2'] = buff.ReadInt32();

                beatmap['mania_scroll_speed'] = buff.ReadByte()

                data.push(beatmap);
            }
        }
      }
      return data;
    }

    /**
     * Unmarshal's the buffer from the layout
     * @param {OsuBuffer|Buffer} raw
     * @param {Array|Object|Null} layout
     * @return {Object|Null}
     */
    UnmarshalPacket(raw, layout = null) {
      if (!raw) {
        return null;
      }
      let buff = raw;
      if (raw instanceof Buffer) {
        buff = OsuBuffer.from(raw);
      }
      let data = {};
      if (layout instanceof Array) {
        layout.forEach(item => {
          if(item.uses) {
            let needelements = item.uses.split(",")
            let dater = {}
            for (let datak of needelements) {
              dater[datak] = data[datak]
            }

            data[item.name] = this.Read(buff, item, item.uses ? dater : null);
          } else {
            data[item.name] = this.Read(buff, item);
          }
        });
      } else if (layout instanceof Object) {
        data = this.Read(buff, layout);
      }
      return data;
    }

  }

  module.exports = Reader;