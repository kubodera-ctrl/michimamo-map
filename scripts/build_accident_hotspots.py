#!/usr/bin/env python3
"""Aggregate NPA traffic-accident open data into privacy-conscious map cells."""
from __future__ import annotations
import argparse,csv,hashlib,json,math
from pathlib import Path

EARTH_RADIUS_M=6_378_137.0
YEARS=(2022,2023,2024)

def dms_to_decimal(value:str,degree_digits:int)->float:
    value=str(value).strip().zfill(degree_digits+7)
    degrees=int(value[:degree_digits]);minutes=int(value[degree_digits:degree_digits+2])
    seconds=int(value[degree_digits+2:degree_digits+4]);millis=int(value[degree_digits+4:degree_digits+7])
    return degrees+minutes/60+(seconds+millis/1000)/3600

def cell_for(lat:float,lng:float,cell_m:int)->tuple[int,int]:
    x=EARTH_RADIUS_M*math.radians(lng)
    y=EARTH_RADIUS_M*math.log(math.tan(math.pi/4+math.radians(lat)/2))
    return math.floor(x/cell_m),math.floor(y/cell_m)

def cell_center(grid_x:int,grid_y:int,cell_m:int)->tuple[float,float]:
    x=(grid_x+0.5)*cell_m;y=(grid_y+0.5)*cell_m
    return math.degrees(2*math.atan(math.exp(y/EARTH_RADIUS_M))-math.pi/2),math.degrees(x/EARTH_RADIUS_M)

def main()->None:
    parser=argparse.ArgumentParser()
    parser.add_argument('--input-dir',type=Path,required=True);parser.add_argument('--output-dir',type=Path,required=True)
    parser.add_argument('--cell-m',type=int,default=250);parser.add_argument('--min-count',type=int,default=5);parser.add_argument('--batch-size',type=int,default=1000)
    args=parser.parse_args();cells={};source_hashes={};accepted=rejected=0
    for source_year in YEARS:
        path=args.input_dir/f'honhyo_{source_year}.csv';source_hashes[path.name]=hashlib.sha256(path.read_bytes()).hexdigest()
        with path.open(encoding='cp932',newline='') as handle:
            for row in csv.DictReader(handle):
                try:
                    lat=dms_to_decimal(row['地点　緯度（北緯）'],2);lng=dms_to_decimal(row['地点　経度（東経）'],3)
                    if not(20<=lat<=50 and 120<=lng<=155):raise ValueError
                    year=int(row['発生日時　　年']);deaths=int(row['死者数']);injuries=int(row['負傷者数'])
                except (KeyError,TypeError,ValueError):rejected+=1;continue
                key=cell_for(lat,lng,args.cell_m);item=cells.setdefault(key,{'count':0,'deaths':0,'injuries':0,'first':year,'last':year})
                item['count']+=1;item['deaths']+=deaths;item['injuries']+=injuries;item['first']=min(item['first'],year);item['last']=max(item['last'],year);accepted+=1
    rows=[]
    for (grid_x,grid_y),item in cells.items():
        if item['count']<args.min_count:continue
        lat,lng=cell_center(grid_x,grid_y,args.cell_m);rows.append((grid_x,grid_y,lat,lng,item))
    rows.sort(key=lambda value:(value[0],value[1]));args.output_dir.mkdir(parents=True,exist_ok=True)
    for old in args.output_dir.glob('accident_hotspots_*.sql'):old.unlink()
    for batch_index in range(0,len(rows),args.batch_size):
        values=[]
        for grid_x,grid_y,lat,lng,item in rows[batch_index:batch_index+args.batch_size]:
            values.append(f"({grid_x},{grid_y},{lat:.7f},{lng:.7f},{item['count']},{item['deaths']},{item['injuries']},{item['first']},{item['last']},{args.cell_m})")
        sql='insert into public.accident_hotspots (grid_x,grid_y,lat,lng,accident_count,death_count,injury_count,first_year,last_year,cell_size_m) values\n'+',\n'.join(values)+'\non conflict (grid_x,grid_y) do update set lat=excluded.lat,lng=excluded.lng,accident_count=excluded.accident_count,death_count=excluded.death_count,injury_count=excluded.injury_count,first_year=excluded.first_year,last_year=excluded.last_year,cell_size_m=excluded.cell_size_m,updated_at=now();\n'
        (args.output_dir/f'accident_hotspots_{batch_index//args.batch_size:03d}.sql').write_text(sql)
    manifest={'source':'National Police Agency traffic accident open data','source_url':'https://www.npa.go.jp/publications/statistics/koutsuu/opendata/index_opendata.html','source_files':source_hashes,'source_release_years':list(YEARS),'cell_size_m':args.cell_m,'minimum_accidents':args.min_count,'accepted_records':accepted,'rejected_records':rejected,'hotspot_cells':len(rows)}
    (args.output_dir/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n');print(json.dumps(manifest,ensure_ascii=False))

if __name__=='__main__':main()
