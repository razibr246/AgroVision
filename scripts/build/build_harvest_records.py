"""Real harvest records for Bangladesh: every crop's yield, harvested area and production for every year FAOSTAT
has (1961 onwards), from the FAOSTAT Production_Crops_Livestock bulk file. Standard library only.

    python3 scripts/build/build_harvest_records.py

Writes src/data/harvest/harvest_records.json. Each crop-year is one harvest of the whole country (national average,
all seasons of that crop together; FAOSTAT does not split Aman, Boro and Aus rice). A good or bad year is judged
later, against the crop's own trend (scripts/build/train_harvest_model.mjs), because yields rise year on year.
The season each crop grows in (rainy / summer / winter) is a property of the crop in Bangladesh (CROPS below,
from the BBS crop calendar), not of the record.
"""
import csv
import io
import zipfile
from datetime import date

from _common import SRC_DATA, fetch, write_json

FAO = 'https://bulks-faostat.fao.org/production/Production_Crops_Livestock_E_Asia.zip'

# key -> (FAOSTAT item, English, Bangla, main growing season in Bangladesh, growing months for its weather window)
# Seasons: kharif-1 "summer" (Mar–Jun), kharif-2 "rainy" (Jul–Oct), rabi "winter" (Nov–Mar). Rice is all three
# (Aus, Aman, Boro); its window is the whole crop year.
CROPS = {
    'rice': ('Rice', 'Rice (all seasons)', 'ধান (সব মৌসুম)', 'all', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
    'wheat': ('Wheat', 'Wheat', 'গম', 'winter', [11, 12, 1, 2, 3]),
    'maize': ('Maize (corn)', 'Maize', 'ভুট্টা', 'winter', [11, 12, 1, 2, 3, 4]),
    'potato': ('Potatoes', 'Potato', 'আলু', 'winter', [11, 12, 1, 2]),
    'tomato': ('Tomatoes', 'Tomato', 'টমেটো', 'winter', [11, 12, 1, 2, 3]),
    'lentil': ('Lentils, dry', 'Lentil', 'মসুর', 'winter', [11, 12, 1, 2, 3]),
    'mustard': ('Rape or colza seed', 'Mustard / rapeseed', 'সরিষা', 'winter', [11, 12, 1, 2]),
    'chickpea': ('Chick peas, dry', 'Chickpea', 'ছোলা', 'winter', [11, 12, 1, 2, 3]),
    'onion': ('Onions and shallots, dry (excluding dehydrated)', 'Onion', 'পেঁয়াজ', 'winter', [11, 12, 1, 2, 3]),
    'garlic': ('Green garlic', 'Garlic', 'রসুন', 'winter', [11, 12, 1, 2, 3]),
    'cabbage': ('Cabbages', 'Cabbage', 'বাঁধাকপি', 'winter', [10, 11, 12, 1, 2]),
    'cauliflower': ('Cauliflowers and broccoli', 'Cauliflower', 'ফুলকপি', 'winter', [10, 11, 12, 1, 2]),
    'eggplant': ('Eggplants (aubergines)', 'Eggplant', 'বেগুন', 'all', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
    'chili': ('Chillies and peppers, green (Capsicum spp. and Pimenta spp.)', 'Chili (green)', 'কাঁচা মরিচ', 'winter', [10, 11, 12, 1, 2, 3]),
    'chili_dry': ('Chillies and peppers, dry (Capsicum spp., Pimenta spp.), raw', 'Chili (dry)', 'শুকনা মরিচ', 'winter', [10, 11, 12, 1, 2, 3]),
    'groundnut': ('Groundnuts, excluding shelled', 'Groundnut', 'চীনাবাদাম', 'winter', [11, 12, 1, 2, 3, 4]),
    'sesame': ('Sesame seed', 'Sesame', 'তিল', 'summer', [2, 3, 4, 5, 6]),
    'jute': ('Jute, raw or retted', 'Jute', 'পাট', 'summer', [3, 4, 5, 6, 7, 8]),
    'sugarcane': ('Sugar cane', 'Sugarcane', 'আখ', 'all', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
    'pumpkin': ('Pumpkins, squash and gourds', 'Pumpkin and gourds', 'কুমড়া ও লাউ', 'all', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
    'watermelon': ('Watermelons', 'Watermelon', 'তরমুজ', 'summer', [1, 2, 3, 4, 5]),
    'banana': ('Bananas', 'Banana', 'কলা', 'all', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
    'mango': ('Mangoes, guavas and mangosteens', 'Mango and guava', 'আম ও পেয়ারা', 'summer', [1, 2, 3, 4, 5, 6]),
    'ginger': ('Ginger, raw', 'Ginger', 'আদা', 'all', [4, 5, 6, 7, 8, 9, 10, 11, 12]),
    'tea': ('Tea leaves', 'Tea', 'চা', 'all', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
    'barley': ('Barley', 'Barley', 'যব', 'winter', [11, 12, 1, 2, 3]),
    'millet': ('Millet', 'Millet', 'কাউন', 'winter', [11, 12, 1, 2, 3]),
    'peas': ('Peas, dry', 'Peas', 'মটর', 'winter', [11, 12, 1, 2, 3]),
    'mungbean': ('Mung beans, dry', 'Mung bean', 'মুগ', 'summer', [2, 3, 4, 5, 6]),
}
ELEMENTS = {'Yield': 'yield', 'Area harvested': 'area', 'Production': 'production'}
SCALE = {'kg/ha': 1000, 'hg/ha': 10000, 'g/ha': 1e6, '100 g/ha': 10000, 't/ha': 1}


def main():
    z = zipfile.ZipFile(fetch(FAO, 'Production_Crops_Livestock_E_Asia.zip'))
    name = next(n for n in z.namelist() if n.endswith('_Asia_NOFLAG.csv'))
    rows = [r for r in csv.DictReader(io.TextIOWrapper(z.open(name), encoding='latin-1'))
            if r['Area'] == 'Bangladesh' and r['Element'] in ELEMENTS]
    by_item = {}
    for r in rows:
        by_item.setdefault(r['Item'], {})[ELEMENTS[r['Element']]] = r
    years = sorted(int(c[1:]) for c in rows[0] if c.startswith('Y') and c[1:].isdigit())
    crops, missing = {}, []
    for key, (item, en, bn, season, months) in CROPS.items():
        el = by_item.get(item)
        if not el or 'yield' not in el:
            missing.append(item)
            continue
        y = el['yield']
        k = SCALE.get(y['Unit'])
        if k is None:
            missing.append(f'{item} (unit {y["Unit"]})')
            continue
        recs = []
        for yr in years:
            v = y.get(f'Y{yr}')
            if not v:
                continue
            rec = {'year': yr, 'yieldTHa': round(float(v) / k, 3)}
            a = el.get('area', {}).get(f'Y{yr}')
            p = el.get('production', {}).get(f'Y{yr}')
            if a:
                rec['areaHa'] = round(float(a))
            if p:
                rec['productionT'] = round(float(p))
            recs.append(rec)
        if len(recs) >= 10:
            crops[key] = {'item': item, 'name': {'en': en, 'bn': bn}, 'season': season, 'months': months, 'records': recs}
    write_json(SRC_DATA / 'harvest' / 'harvest_records.json', {
        'provenance': {
            'status': 'REAL',
            'dataset': f'FAOSTAT Production_Crops_Livestock, Bangladesh, yield / area harvested / production {years[0]}-{years[-1]} (national, all seasons of each crop)',
            'url': FAO, 'retrieved': date.today().isoformat(),
            'units': {'yieldTHa': 't/ha', 'areaHa': 'ha', 'productionT': 't'},
            'notes': 'Each record is one national harvest year. Good and bad years are judged against the crop trend in train_harvest_model.mjs. Season and months are the crop calendar in Bangladesh (BBS), set in build_harvest_records.py.',
        },
        'years': [years[0], years[-1]],
        'crops': crops,
    })
    n = sum(len(c['records']) for c in crops.values())
    print(f'harvest records: {len(crops)} crops, {n} crop-years ({years[0]}-{years[-1]})')
    if missing:
        print('not in FAOSTAT for Bangladesh:', '; '.join(missing))


if __name__ == '__main__':
    main()
