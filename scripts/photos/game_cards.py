"""Pictures for two game cards on the Learn-by-playing hub (src/pages/public/Games.jsx), both real:

  season-showdown  Season Showdown (/play): "A smiling farmer on a winter morning", a farmer in his mustard field,
                   Sanvi Ahmed Saim, 23 Dec 2023, CC BY-SA 4.0, Wikimedia Commons. Cropped to 16:9 around him.
  seven-fields     Seven Fields Challenge (/stories): Bangladesh from space, NASA Terra MODIS corrected-reflectance
                   true colour, 31 Oct 2023 (a clear post-monsoon day), via NASA GIBS; public domain. Contrast and
                   colour lifted a little to cut the haze; nothing added or removed.

Writes src/assets/images/<name>-{900,1600,2400,3200}.webp like every photo there (credits in index.js).
Run: npm run photos:cards   (Pillow from .cache/venv-sr; cwebp from libwebp)
"""
import io, json, subprocess, urllib.request, urllib.parse
from pathlib import Path
from PIL import Image, ImageEnhance, ImageOps, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'src/assets/images'
TMP = ROOT / '.cache/game-cards'
TMP.mkdir(parents=True, exist_ok=True)
UA = {'User-Agent': 'AgroVision-photos/1.0 (NASA Space Apps project)'}

def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=180).read()

def commons(title, width=3200):
    q = urllib.parse.urlencode({'action': 'query', 'format': 'json', 'titles': title, 'prop': 'imageinfo', 'iiprop': 'url', 'iiurlwidth': width})
    info = next(iter(json.loads(get(f'https://commons.wikimedia.org/w/api.php?{q}'))['query']['pages'].values()))['imageinfo'][0]
    return Image.open(io.BytesIO(get(info['thumburl']))).convert('RGB')

def gibs(day, bbox='21.4,85.5,26.6,94.75'):  # Bangladesh centred, 16:9 in degrees
    q = urllib.parse.urlencode({'SERVICE': 'WMS', 'REQUEST': 'GetMap', 'VERSION': '1.3.0', 'LAYERS': 'MODIS_Terra_CorrectedReflectance_TrueColor', 'STYLES': '',
                                'FORMAT': 'image/jpeg', 'CRS': 'EPSG:4326', 'BBOX': bbox, 'WIDTH': 3200, 'HEIGHT': 1800, 'TIME': day})
    return Image.open(io.BytesIO(get(f'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?{q}'))).convert('RGB')

def crop169(im, cy):
    """16:9 crop at full width, centred on the fraction cy of the height."""
    w, h = im.size; ch = round(w * 9 / 16)
    y0 = min(max(0, round(cy * h - ch / 2)), h - ch)
    return im.crop((0, y0, w, y0 + ch))

def save(im, name):
    src = TMP / f'{name}.png'; im.save(src)
    for w in (900, 1600, 2400, 3200):
        subprocess.run(['cwebp', '-quiet', '-q', '78' if w >= 2400 else '82', '-resize', str(w), '0', str(src), '-o', str(OUT / f'{name}-{w}.webp')], check=True)
    print(name, '->', [f'{name}-{w}.webp' for w in (900, 1600, 2400, 3200)])

farmer = crop169(commons('File:A smiling farmer on a winter morning.jpg'), 0.47)
save(farmer, 'season-showdown')

sat = gibs('2023-10-31')
sat = ImageOps.autocontrast(sat, cutoff=0.4)
sat = sat.point(lambda v: round(255 * (v / 255) ** 0.88))  # a little brighter in the shadows
sat = ImageEnhance.Color(sat).enhance(1.28)
sat = ImageEnhance.Contrast(sat).enhance(1.08).filter(ImageFilter.UnsharpMask(radius=1.4, percent=60, threshold=2))
save(sat, 'seven-fields')
