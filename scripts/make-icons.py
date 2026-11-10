"""Dependency-free PNG icons; run only when changing the app mark."""
import struct, zlib
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1] / 'icons'
def icon(n, name):
    rows=[]
    for y in range(n):
        row=bytearray([0])
        for x in range(n):
            a,b=x/n,y/n
            color=(12,16,21)
            if .16<a<.84 and .16<b<.84: color=(201,244,119)
            if (.32<a<.41 and .33<b<.67) or (.59<a<.68 and .33<b<.67) or (.39<a<.61 and abs(b-(.34+(a-.39)*1.5))<.055) or ((a-.675)**2+(b-.285)**2<.0015): color=(23,34,13)
            row.extend(color)
        rows.append(row)
    def chunk(tag,data):return struct.pack('!I',len(data))+tag+data+struct.pack('!I',zlib.crc32(tag+data)&0xffffffff)
    (ROOT/name).write_bytes(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('!2I5B',n,n,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(b''.join(rows),9))+chunk(b'IEND',b''))
for n,name in [(192,'icon-192.png'),(512,'icon-512.png'),(180,'apple-touch-icon.png')]:icon(n,name)
