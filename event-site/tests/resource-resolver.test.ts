import test from 'node:test';
import assert from 'node:assert/strict';
import {selectLatestCkanCsvResource} from '../../shared/machiibe-ingestion/resource-resolver';

test('CKAN resolver selects newest active HTTPS CSV and reports freshness',()=>{
  const resolved=selectLatestCkanCsvResource([
    {id:'old',url:'https://data.test/old.csv',format:'CSV',state:'active',last_modified:'2026-07-01T00:00:00Z'},
    {id:'xlsx',url:'https://data.test/new.xlsx',format:'XLSX',state:'active',last_modified:'2026-09-29T00:00:00Z'},
    {id:'new',url:'https://data.test/new.csv',mimetype:'text/csv',state:'active',last_modified:'2026-09-20T00:00:00Z'},
    {id:'deleted',url:'https://data.test/deleted.csv',format:'CSV',state:'deleted',last_modified:'2026-09-29T00:00:00Z'}
  ],{now:'2026-09-30T00:00:00Z',maxAgeDays:45});
  assert.equal(resolved?.id,'new');
  assert.equal(resolved?.url,'https://data.test/new.csv');
  assert.equal(resolved?.fresh,true);
  assert.equal(resolved?.ageDays,10);
});

test('CKAN resolver fails closed on stale or non-HTTPS resources',()=>{
  const stale=selectLatestCkanCsvResource([
    {id:'stale',url:'https://data.test/stale.csv',format:'CSV',state:'active',last_modified:'2026-03-01T00:00:00Z'}
  ],{now:'2026-09-30T00:00:00Z',maxAgeDays:45});
  assert.equal(stale?.fresh,false);

  const none=selectLatestCkanCsvResource([
    {id:'http',url:'http://data.test/a.csv',format:'CSV',state:'active',last_modified:'2026-09-29T00:00:00Z'}
  ],{now:'2026-09-30T00:00:00Z'});
  assert.equal(none,null);
});

test('CKAN resolver validates freshness options',()=>{
  assert.throws(()=>selectLatestCkanCsvResource([],{now:'not-a-date'}),/invalid resolver now timestamp/);
  assert.throws(()=>selectLatestCkanCsvResource([],{maxAgeDays:-1}),/invalid maxAgeDays/);
});
