begin;set local role anon;
select 'toyooka' as key,count(*)::int as count from get_safety_spots(134.64,35.4,135.03,35.7,array['aed'],1500) where municipality='豊岡市' and source_url='https://data.bodik.jp/dataset/282090_aed_toyooka' union all
select 'kami' as key,count(*)::int as count from get_safety_spots(134.49,35.37,134.72,35.69,array['aed'],1500) where municipality='香美町' and source_url='https://data.bodik.jp/dataset/285854_aed' union all
select 'tondabayashi' as key,count(*)::int as count from get_safety_spots(135.54,34.43,135.65,34.55,array['aed'],1500) where municipality='富田林市' and source_url='https://data.bodik.jp/dataset/272141_aed' union all
select 'kumatori' as key,count(*)::int as count from get_safety_spots(135.32,34.34,135.41,34.43,array['aed'],1500) where municipality='熊取町' and source_url='https://data.bodik.jp/dataset/273619_aed' union all
select 'kaizuka' as key,count(*)::int as count from get_safety_spots(135.31,34.37,135.43,34.47,array['aed'],1500) where municipality='貝塚市' and source_url='https://data.bodik.jp/dataset/272086_aed' union all
select 'sango' as key,count(*)::int as count from get_safety_spots(135.64,34.57,135.72,34.64,array['aed'],1500) where municipality='三郷町' and source_url='https://data.bodik.jp/dataset/293431_aed' union all
select 'ibara' as key,count(*)::int as count from get_safety_spots(133.36,34.54,133.57,34.75,array['aed'],1500) where municipality='井原市' and source_url='https://www.okayama-opendata.jp/resources/17649' union all
select 'kurashiki' as key,count(*)::int as count from get_safety_spots(133.59,34.41,133.91,34.68,array['aed'],1500) where municipality='倉敷市' and source_url='https://www.okayama-opendata.jp/resources/17585' union all
select 'niimi' as key,count(*)::int as count from get_safety_spots(133.3,34.87,133.62,35.2,array['aed'],1500) where municipality='新見市' and source_url='https://www.okayama-opendata.jp/resources/17664' union all
select 'soja' as key,count(*)::int as count from get_safety_spots(133.62,34.62,133.83,34.76,array['aed'],1500) where municipality='総社市' and source_url='https://www.okayama-opendata.jp/resources/17651' union all
select 'misato' as key,count(*)::int as count from get_safety_spots(132.48,34.92,132.69,35.13,array['aed'],1500) where municipality='美郷町' and source_url='https://shimane-opendata.jp/resources/34774' union all
select 'minamiaso' as key,count(*)::int as count from get_safety_spots(130.97,32.79,131.12,32.89,array['aed'],1500) where municipality='南阿蘇村' and source_url='https://data.bodik.jp/dataset/434337_aed' union all
select 'shinkamigoto' as key,count(*)::int as count from get_safety_spots(128.97,32.81,129.21,33.08,array['aed'],1500) where municipality='新上五島町' and source_url='https://data.bodik.jp/dataset/424111_aedshinkamigoto' union all
select 'shibushi' as key,count(*)::int as count from get_safety_spots(130.96,31.43,131.18,31.61,array['aed'],1500) where municipality='志布志市' and source_url='https://data.bodik.jp/dataset/462217_aed_location' union all
select 'kirishima' as key,count(*)::int as count from get_safety_spots(130.64,31.59,130.92,31.93,array['aed'],1500) where municipality='霧島市' and source_url='https://data.bodik.jp/dataset/462187_aed';rollback;
