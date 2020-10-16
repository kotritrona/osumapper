import struct
import sys
import zlib

""" Read ID3 tags from a file.
    Ned Batchelder, http://nedbatchelder.com/code/modules/id3reader.html
    This code is in the public domain.
"""

__version__ = '2.00.20170522'  # History at the end of the file.

# ID3 specs: http://www.id3.org/develop.html

# These are the text encodings, indexed by the first byte of a text value.
_encodings = ['iso8859-1', 'utf-16', 'utf-16be', 'utf-8']

# Simple pseudo-id's, mapped to their various representations.
# Use these ids with getValue, and you don't need to know what
# version of ID3 the file contains.
_simpleDataMapping = {
    'album': ('TALB', 'TAL', 'v1album', 'TOAL'),
    'performer': ('TPE1', 'TP1', 'v1performer', 'TOPE'),
    'title': ('TIT2', 'TT2', 'v1title'),
    'track': ('TRCK', 'TRK', 'v1track'),
    'year': ('TYER', 'TYE', 'v1year'),
    'genre': ('TCON', 'TCO', 'v1genre'),
    'comment': ('COMM', 'COM', 'v1comment'),
}

# Tracing
_t = False


def _trace(msg):
    print(msg)


# Coverage
_c = False
_features = {}


def _coverage(feat):
    # if _t: _trace('feature '+feat)
    _features[feat] = _features.setdefault(feat, 0) + 1


def _safestr(s):
    """ Get a good string for printing, that won't throw exceptions,
        no matter what's in it.
    """
    try:
        return s.encode(sys.getdefaultencoding())
    except UnicodeError:
        return '?: ' + repr(s)


# Can I just say that I think the whole concept of genres is bogus,
# since they are so subjective?  And the idea of letting someone else pick
# one of these things and then have it affect the categorization of my music
# is extra bogus.  And the list itself is absurd. Polsk Punk?
_genres = [
    # 0-19
    'Blues', 'Classic Rock', 'Country', 'Dance', 'Disco', 'Funk', 'Grunge', 'Hip - Hop', 'Jazz', 'Metal',
    'New Age', 'Oldies', 'Other', 'Pop', 'R&B', 'Rap', 'Reggae', 'Rock', 'Techno', 'Industrial',
    # 20-39
    'Alternative', 'Ska', 'Death Metal', 'Pranks', 'Soundtrack', 'Euro - Techno', 'Ambient', 'Trip - Hop',
    'Vocal', 'Jazz + Funk', 'Fusion', 'Trance', 'Classical', 'Instrumental', 'Acid', 'House', 'Game',
    'Sound Clip', 'Gospel', 'Noise',
    # 40-59
    'Alt Rock', 'Bass', 'Soul', 'Punk', 'Space', 'Meditative', 'Instrumental Pop', 'Instrumental Rock', 'Ethnic',
    'Gothic', 'Darkwave', 'Techno - Industrial', 'Electronic', 'Pop - Folk', 'Eurodance', 'Dream', 'Southern Rock',
    'Comedy', 'Cult', 'Gangsta Rap',
    # 60-79
    'Top 40', 'Christian Rap', 'Pop / Funk', 'Jungle', 'Native American', 'Cabaret', 'New Wave', 'Psychedelic',
    'Rave', 'Showtunes', 'Trailer', 'Lo - Fi', 'Tribal', 'Acid Punk', 'Acid Jazz', 'Polka', 'Retro', 'Musical',
    'Rock & Roll', 'Hard Rock',
    # 80-99
    'Folk', 'Folk / Rock', 'National Folk', 'Swing', 'Fast - Fusion', 'Bebob', 'Latin', 'Revival', 'Celtic',
    'Bluegrass', 'Avantgarde', 'Gothic Rock', 'Progressive Rock', 'Psychedelic Rock', 'Symphonic Rock',
    'Slow Rock', 'Big Band', 'Chorus', 'Easy Listening', 'Acoustic',
    # 100-119
    'Humour', 'Speech', 'Chanson', 'Opera', 'Chamber Music', 'Sonata', 'Symphony', 'Booty Bass', 'Primus',
    'Porn Groove', 'Satire', 'Slow Jam', 'Club', 'Tango', 'Samba', 'Folklore', 'Ballad', 'Power Ballad',
    'Rhythmic Soul', 'Freestyle',
    # 120-139
    'Duet', 'Punk Rock', 'Drum Solo', 'A Cappella', 'Euro - House', 'Dance Hall', 'Goa', 'Drum & Bass',
    'Club - House', 'Hardcore', 'Terror', 'Indie', 'BritPop', 'Negerpunk', 'Polsk Punk', 'Beat',
    'Christian Gangsta Rap', 'Heavy Metal', 'Black Metal', 'Crossover',
    # 140-147
    'Contemporary Christian', 'Christian Rock', 'Merengue', 'Salsa', 'Thrash Metal', 'Anime', 'JPop', 'Synthpop'
]


class Id3Error(Exception):
    """ An exception caused by id3reader properly handling a bad ID3 tag.
    """
    pass


class _Header:
    """ Represent the ID3 header in a tag.
    """

    def __init__(self):
        self.majorVersion = 0
        self.revision = 0
        self.flags = 0
        self.size = 0
        self.bUnsynchronized = False
        self.bExperimental = False
        self.bFooter = False

    def __str__(self):
        return str(self.__dict__)


class _Frame:
    """ Represent an ID3 frame in a tag.
    """

    def __init__(self):
        self.id = ''
        self.size = 0
        self.flags = 0
        self.rawData = ''
        self.bTagAlterPreserve = False
        self.bFileAlterPreserve = False
        self.bReadOnly = False
        self.bCompressed = False
        self.bEncrypted = False
        self.bInGroup = False

    def __str__(self):
        return str(self.__dict__)

    def __repr__(self):
        return str(self.__dict__)

    def _interpret(self):
        """ Examine self.rawData and create a self.value from it.
        """
        if len(self.rawData) == 0:
            # This is counter to the spec, but seems harmless enough.
            # if _c: _coverage('zero data')
            return

        if self.bCompressed:
            # Decompress the compressed data.
            self.rawData = zlib.decompress(self.rawData)

        self.id = self.id.decode()  # no need to worry about the encoding here
        # print("in _interpret, id is {}, id[0] is {}".format(self.id, self.id[0]))
        if self.id[0] == 'T':
            # Text fields start with T
            # encoding = ord(self.rawData[0])
            encoding = self.rawData[0]
            # print("in _interpret, encoding is {}".format(encoding))
            if 0 <= encoding < len(_encodings):
                # if _c: _coverage('encoding%d' % encoding)
                value = self.rawData[1:].decode(_encodings[encoding])
                # print("decoded value {}".format(value))
            else:
                # if _c: _coverage('bad encoding')
                value = self.rawData[1:]
            # Don't let trailing zero bytes fool you.
            if value:
                value = value.strip('\0')
            # The value can actually be a list.
            if '\0' in value:
                value = value.split('\0')
                # if _c: _coverage('textlist')
            self.value = value
            # print("Assigned value {}".format(self.value))
        elif self.id[0] == 'W':
            # URL fields start with W
            print("in _interpret, self.rawData is {}".format(self.rawData))
            if isinstance(self.rawData, str):
                self.value = self.rawData.strip('\0')
            else:
                self.value = self.rawData.strip(b'\0')
            if self.id == 'WXXX':
                if isinstance(self.rawData, str):
                    self.value = self.value.split('\0')
                else:
                    self.value = self.value.split(b'\0')
        elif self.id == 'CDM':
            # ID3v2.2.1 Compressed Data Metaframe
            if self.rawData[0] == 'z':
                self.rawData = zlib.decompress(self.rawData[5:])
            else:
                # if _c: _coverage('badcdm!')
                raise Id3Error('Unknown CDM compression: {:02x}'.format(self.rawData[0]))
                # @TODO: re-interpret the decompressed frame.

        elif self.id in _simpleDataMapping['comment']:
            # comment field

            # In limited testing a typical comment looks like
            # '\x00XXXID3v1 Comment\x00comment test' so in this
            # case we need to find the second \x00 to know where
            # where we start for a comment.  In case we only find
            # one \x00, lets just start at the beginning for the
            # value
            s = str(self.rawData)

            pos = 0
            count = 0
            while pos < len(s) and count < 2:
                if ord(s[pos]) == 0:
                    count = count + 1
                pos = pos + 1
            if count < 2:
                pos = 1

            if 0 < pos < len(s):
                s = s[pos:]
                if ord(s[-1]) == 0:
                    s = s[:-1]

            self.value = s


class Reader:
    """ An ID3 reader.
        Create one on a file object, and then use getValue('TIT2') (for example)
        to pull values.
    """

    def __init__(self, music_file):
        """ Create a reader from a file or filename. """
        self.file = music_file
        self.header = None
        self.frames = {}
        self.allFrames = []
        self.bytesLeft = 0
        self.padbytes = ''

        should_close = False
        # If self.file is a string of some sort, then open it to get a file.
        if isinstance(self.file, (type(''), type(u''))):
            self.file = open(self.file, 'rb')
            should_close = True

        self._read_id3()

        if should_close:
            self.file.close()

    def _read_bytes(self, num, desc=''):
        """ Read some bytes from the file.
            This method implements the "unsynchronization" scheme,
            where 0xFF bytes may have had 0x00 bytes stuffed after
            them.  These zero bytes have to be removed transparently.
        """
        # if _t: _trace("ask %d (%s)" % (num,desc))
        if num > self.bytesLeft:
            # if _c: _coverage('long!')
            raise Id3Error('Long read {}: {} {}'.format(desc, num, self.bytesLeft))
        bytes_read = self.file.read(num)
        self.bytesLeft -= num

        if len(bytes_read) < num:
            # if _t: _trace("short read with %d left, %d total" % (self.bytesLeft, self.header.size))
            # if _c: _coverage('short!')
            raise Id3Error('Short read {}: {} {}'.format(desc, len(bytes_read), num))

        if self.header.bUnsynchronized:
            unsync = 0
            i = 0
            while True:
                # print("Checking for \xFF\x00 in {}".format(bytes_read))
                i = bytes_read.find(b'\xFF\x00', i)
                if i == -1:
                    break
                # if _t: _trace("unsync at %d" % (i+1))
                # if _c: _coverage('unsyncbyte')
                unsync += 1
                # This is a stuffed byte to remove
                bytes_read = bytes_read[:i + 1] + bytes_read[i + 2:]
                # Have to read one more byte from the file to adjust
                bytes_read += self.file.read(1)
                self.bytesLeft -= 1
                i += 1
                # if _t: _trace("unsync'ed %d" % (unsync))

        # print("in _read_bytes, returning {}".format(bytes_read))
        return bytes_read

    def _unread_bytes(self, num):
        self.file.seek(-num, 1)
        self.bytesLeft += num

    @staticmethod
    def _get_sync_safe_int(bites):
        assert len(bites) == 4
        # if type(bites) == type(''):
        if isinstance(bites, str):
            bites = [ord(c) for c in bites]
        return (bites[0] << 21) + (bites[1] << 14) + (bites[2] << 7) + bites[3]

    @staticmethod
    def _get_integer(bites):
        i = 0
        # if type(bites) == type(''):
        if isinstance(bites, str):
            bites = [ord(c) for c in bites]
        for b in bites:
            i = i * 256 + b
        return i

    def _add_v1_frame(self, f_id, rawdata):
        # print("in _add_v1_frame, f_id is {}\n\trawdata is {}".format(f_id, rawdata))
        if f_id == 'v1genre':
            # assert len(rawdata) == 1
            # genre = ord(rawdata)
            genre = rawdata
            try:
                value = _genres[genre]
            except IndexError:
                value = "{}".format(genre)
        else:
            # print("in _add_v1_frame, rawdata is {}".format(rawdata))
            value = str(rawdata.strip(b' \t\r\n').split(b'\0')[0])

            encoding = rawdata[0]
            # print("in _interpret, encoding is {}".format(encoding))
            if 0 <= encoding < len(_encodings):
                value = rawdata.strip(b' \t\r\n\0').decode(_encodings[encoding])
            else:
                # This is a bit iffy.
                # It may seem more reasonable to try iso8859-1 first, but that fails the
                # ID3v1 test 272 in the test pack at http://id3.org/Developer%20Information.
                #
                # This may be a bad decision, in which case swap the two decode lines.
                # But we can only work with the test data available.
                try:
                    value = rawdata.strip(b' \t\r\n\0').decode()
                except UnicodeDecodeError:
                    try:
                        value = rawdata.strip(b' \t\r\n\0').decode('iso8859-1')
                    except UnicodeDecodeError:
                        value = None
        if value:
            frame = _Frame()
            frame.id = f_id
            frame.rawData = rawdata
            frame.value = value
            self.frames[f_id] = frame
            self.allFrames.append(frame)

    @staticmethod
    def _pass():
        """ Do nothing, for when we need to plug in a no-op function.
        """
        pass

    def _read_id3(self):
        header = self.file.read(10)
        if len(header) < 10:
            return
        hstuff = struct.unpack('!3sBBBBBBB', header)
        # print("Found hstuff {}".format(hstuff))
        if hstuff[0] != b"ID3":
            # Doesn't look like an ID3v2 tag,
            # Try reading an ID3v1 tag.
            self._read_id3v1()
            return

        self.header = _Header()
        self.header.majorVersion = hstuff[1]
        self.header.revision = hstuff[2]
        self.header.flags = hstuff[3]
        self.header.size = self._get_sync_safe_int(hstuff[4:8])
        # print("Header size is {}".format(self.header.size))

        self.bytesLeft = self.header.size

        self._readExtHeader = self._pass

        if self.header.majorVersion == 2:
            # if _c: _coverage('id3v2.2.%d' % self.header.revision)
            self._readFrame = self._read_frame_rev2
        elif self.header.majorVersion == 3:
            # if _c: _coverage('id3v2.3.%d' % self.header.revision)
            self._readFrame = self._read_frame_rev3
        elif self.header.majorVersion == 4:
            # if _c: _coverage('id3v2.4.%d' % self.header.revision)
            self._readFrame = self._read_frame_rev4
        else:
            # if _c: _coverage('badmajor!')
            raise Id3Error("Unsupported major version: {}".format(self.header.majorVersion))

        # Interpret the flags
        self._interpret_flags()

        # Read any extended header
        self._readExtHeader()

        # Read the frames
        while self.bytesLeft > 0:
            frame = self._readFrame()
            # print("in _read_id3, frame is {}".format(frame))
            if frame:
                # print("in _read_id3, interpreting frame")
                frame._interpret()
                self.frames[frame.id] = frame
                self.allFrames.append(frame)
            else:
                # if _c: _coverage('padding')
                break

    def _interpret_flags(self):
        """ Interpret ID3v2.x flags.
        """
        if self.header.flags & 0x80:
            self.header.bUnsynchronized = True
            # if _c: _coverage('unsynctag')

        if self.header.majorVersion == 2:
            if self.header.flags & 0x40:
                # if _c: _coverage('compressed')
                # "Since no compression scheme has been decided yet,
                # the ID3 decoder (for now) should just ignore the entire
                # tag if the compression bit is set."
                self.header.bCompressed = True

        if self.header.majorVersion >= 3:
            if self.header.flags & 0x40:
                # if _c: _coverage('extheader')
                if self.header.majorVersion == 3:
                    self._readExtHeader = self._read_ext_header_rev3
                else:
                    self._readExtHeader = self._read_ext_header_rev4
            if self.header.flags & 0x20:
                # if _c: _coverage('experimental')
                self.header.bExperimental = True

        if self.header.majorVersion >= 4:
            if self.header.flags & 0x10:
                # if _c: _coverage('footer')
                self.header.bFooter = True

    def _read_ext_header_rev3(self):
        """ Read the ID3v2.3 extended header.
        """
        # We don't interpret this yet, just eat the bytes.
        size = self._get_integer(self._read_bytes(4, 'rev3ehlen'))
        self._read_bytes(size, 'rev3ehdata')

    def _read_ext_header_rev4(self):
        """ Read the ID3v2.4 extended header.
        """
        # We don't interpret this yet, just eat the bytes.
        size = self._get_sync_safe_int(self._read_bytes(4, 'rev4ehlen'))
        self._read_bytes(size - 4, 'rev4ehdata')

    def _read_id3v1(self):
        """ Read the ID3v1 tag.
            spec: http://www.id3.org/id3v1.html
        """
        self.file.seek(-128, 2)
        tag = self.file.read(128)
        # print("in _read_id3v1, tag is {}".format(tag))
        if len(tag) != 128:
            return

        if tag[0:3] != b'TAG':
            return
        self.header = _Header()
        self.header.majorVersion = 1
        self.header.revision = 0

        self._add_v1_frame('v1title', tag[3:33])
        self._add_v1_frame('v1performer', tag[33:63])
        self._add_v1_frame('v1album', tag[63:93])
        self._add_v1_frame('v1year', tag[93:97])
        self._add_v1_frame('v1comment', tag[97:127])
        self._add_v1_frame('v1genre', tag[127])
        if tag[125] == '\0' and tag[126] != '\0':
            # if _c: _coverage('id3v1.1')
            self.header.revision = 1
            # print("calling add_v1_frame with {}".format(tag[126]))
            self._add_v1_frame('v1track', str(tag[126]))
        else:
            # if _c: _coverage('id3v1.0')
            pass
        return

    _validIdChars = b'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

    def _is_valid_id(self, id_bytes):
        """ Determine if the id bytes make a valid ID3 id.
        """
        # print("id_bytes is {}".format(id_bytes))
        for c in id_bytes:
            if c not in self._validIdChars:
                # if _c: _coverage('bad id')
                return False
        # if _c: _coverage('id '+id)
        return True

    def _read_frame_rev2(self):
        """ Read a frame for ID3v2.2: three-byte ids and lengths.
            spec: http://www.id3.org/id3v2-00.txt
        """
        if self.bytesLeft < 6:
            return None
        f_id = self._read_bytes(3, 'rev2id')
        if len(f_id) < 3 or not self._is_valid_id(f_id):
            self._unread_bytes(len(f_id))
            return None
        hstuff = struct.unpack('!BBB', self._read_bytes(3, 'rev2len'))
        frame = _Frame()
        frame.id = f_id
        frame.size = self._get_integer(hstuff[0:3])
        frame.rawData = self._read_bytes(frame.size, 'rev2data')
        return frame

    def _read_frame_rev3(self):
        """ Read a frame for ID3v2.3: four-byte ids and lengths.
        """
        if self.bytesLeft < 10:
            return None
        f_id = self._read_bytes(4, 'rev3id')
        # print("in _read_frame_rev3, f_id is {}".format(f_id))
        if len(f_id) < 4 or not self._is_valid_id(f_id):
            self._unread_bytes(len(f_id))
            return None
        hstuff = struct.unpack('!BBBBh', self._read_bytes(6, 'rev3head'))
        # print("in _read_frame_rev3, hstuff is {}".format(hstuff))
        frame = _Frame()
        frame.id = f_id
        frame.size = self._get_integer(hstuff[0:4])
        cb_data = frame.size
        frame.flags = hstuff[4]
        # if _t: _trace('flags = %x' % frame.flags)
        frame.bTagAlterPreserve = (frame.flags & 0x8000 != 0)
        frame.bFileAlterPreserve = (frame.flags & 0x4000 != 0)
        frame.bReadOnly = (frame.flags & 0x2000 != 0)
        frame.bCompressed = (frame.flags & 0x0080 != 0)
        if frame.bCompressed:
            frame.decompressedSize = self._get_integer(self._read_bytes(4, 'decompsize'))
            cb_data -= 4
            # if _c: _coverage('compress')
        frame.bEncrypted = (frame.flags & 0x0040 != 0)
        if frame.bEncrypted:
            frame.encryptionMethod = self._read_bytes(1, 'encrmethod')
            cb_data -= 1
            # if _c: _coverage('encrypt')
        frame.bInGroup = (frame.flags & 0x0020 != 0)
        if frame.bInGroup:
            frame.groupid = self._read_bytes(1, 'groupid')
            cb_data -= 1
            # if _c: _coverage('groupid')

        frame.rawData = self._read_bytes(cb_data, 'rev3data')
        # print("in _read_frame_rev3, frame is {}".format(frame))
        return frame

    def _read_frame_rev4(self):
        """ Read a frame for ID3v2.4: four-byte ids and lengths.
        """
        if self.bytesLeft < 10:
            return None
        f_id = self._read_bytes(4, 'rev4id')
        if len(f_id) < 4 or not self._is_valid_id(f_id):
            self._unread_bytes(len(f_id))
            return None
        hstuff = struct.unpack('!BBBBh', self._read_bytes(6, 'rev4head'))
        frame = _Frame()
        frame.id = f_id
        frame.size = self._get_sync_safe_int(hstuff[0:4])
        cb_data = frame.size
        frame.flags = hstuff[4]
        frame.bTagAlterPreserve = (frame.flags & 0x4000 != 0)
        frame.bFileAlterPreserve = (frame.flags & 0x2000 != 0)
        frame.bReadOnly = (frame.flags & 0x1000 != 0)
        frame.bInGroup = (frame.flags & 0x0040 != 0)
        if frame.bInGroup:
            frame.groupid = self._read_bytes(1, 'groupid')
            cb_data -= 1
            # if _c: _coverage('groupid')

        frame.bCompressed = (frame.flags & 0x0008 != 0)
        if frame.bCompressed:
            # if _c: _coverage('compress')
            pass
        frame.bEncrypted = (frame.flags & 0x0004 != 0)
        if frame.bEncrypted:
            frame.encryptionMethod = self._read_bytes(1, 'encrmethod')
            cb_data -= 1
            # if _c: _coverage('encrypt')
        frame.bUnsynchronized = (frame.flags & 0x0002 != 0)
        if frame.bUnsynchronized:
            # if _c: _coverage('unsyncframe')
            pass
        if frame.flags & 0x0001:
            frame.datalen = self._get_sync_safe_int(self._read_bytes(4, 'datalen'))
            cb_data -= 4
            # if _c: _coverage('datalenindic')

        frame.rawData = self._read_bytes(cb_data, 'rev3data')

        return frame

    def get_value(self, tag_id):
        """ Return the value for an ID3 tag id, or for a
            convenience label ('title', 'performer', ...),
            or return None if there is no such value.
        """
        if tag_id in self.frames:
            if hasattr(self.frames[tag_id], 'value'):
                return self.frames[tag_id].value
        if tag_id in _simpleDataMapping:
            for id2 in _simpleDataMapping[tag_id]:
                v = self.get_value(id2)
                if v:
                    return v
        return None

    def get_raw_data(self, f_id):
        if f_id in self.frames:
            return self.frames[f_id].rawData
        return None

    def dump(self):
        import pprint
        print("Header:")
        print(self.header)
        print("Frames:")
        for fr in self.allFrames:
            if len(fr.rawData) > 30:
                fr.rawData = fr.rawData[:30]
        pprint.pprint(self.allFrames)
        for fr in self.allFrames:
            if hasattr(fr, 'value'):
                print('{}: {}'.format(fr.id, _safestr(fr.value)))
            else:
                print('{}= {}'.format(fr.id, _safestr(fr.rawData)))
        for label in _simpleDataMapping.keys():
            v = self.get_value(label)
            if v:
                print('Label {}: {}'.format(label, _safestr(v)))

    @staticmethod
    def dump_coverage():
        feats = sorted(_features.keys())
        for feat in feats:
            print("Feature {:12}: {}".format(feat, _features[feat]))


if __name__ == '__main__':
    if len(sys.argv) < 2 or '-?' in sys.argv:
        print("Give me a filename")
    else:
        id3 = Reader(sys.argv[1])
        id3.dump()
        # if _c: id3.dumpCoverage()

# History:
# 20040104: Created.
# 20040105: Two bugs: didn't read v1 properly, and didn't like empty strings in values.
#
# 20040109: Properly reads v2.3 properly (4-byte lens, but not synchsafe)
#           Handles unsynchronized tags properly.
#
# 20040110: Total length was wrong for unsynchronized tags.
#           Treat input filename better so path module can be used.
#           Frame ids are more closely scrutinized for validity.
#           Errors are now thrown as our own exception.
#           Pad bytes aren't retained any more.
#           Frame.value is not set if there is no interpretation performed.
#
# 20040111: Tracing and code coverage more formalized.
#           Exceptions are now all Id3Error.
#           Zero-length data in frames is handled pleasantly.
#           Compressed frames are decompressed.
#           Extended headers are read (but uninterpreted).
#           Non-zero pad bytes are handled.
#           Frame flags are read and interpreted.
#           W*** frames are interpreted.
#           Multi-string frames set .value to a list of strings.
#
# 20040113: Strip all trailing zero bytes from text strings.
#           If we opened the file, we should close the file.
#
# 20040205: Do a better job printing strings without throwing.
#           Support genre information, even if it is stupid.
#
# 20040913: When dumping strings, be more robust when trying to print
#               non-character data. Thanks to Duane Harkness for the fix.
#
# 20061230: Fix ommission of self. in a few places.
#
# 20070415: Extended headers in ID3v2.4 weren't skipped properly, throwing
#               everything out of whack.
#           Be more generous about finding album and performer names in the tag.
#
# 20170522: Python 3 conversion (hack, really).
