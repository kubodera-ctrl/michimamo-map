import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {OSHI_ENTITY_TYPES,classifyOshiEventType,entityMatchesQuery,isEventLikeLimitedRetail,type OshiEntity} from '../../shared/machiibe-ingestion/oshi';

test('oshi event taxonomy identifies compound event types',()=>{
  const types=classifyOshiEventType('キャラクターショー＆ミニライブ・撮影会');
  assert.ok(types.includes('character_show'));
  assert.ok(types.includes('mini_live'));
  assert.ok(types.includes('photo_session'));
});

test('entity aliases support normalized cross-search',()=>{
  const entity:OshiEntity={id:'e',type:'character',canonicalName:'シナモロール',aliases:['シナモン'],parentEntityIds:[],relatedEntityIds:[],officialUrls:[],active:true};
  assert.equal(entityMatchesQuery(entity,'シナモン'),true);
});

test('limited retail is an event only when visiting is itself a destination purpose',()=>{
  assert.equal(isEventLikeLimitedRetail({limited:true,destinationPurpose:true,hasExperienceOrExhibition:false,ordinarySale:false}),true);
  assert.equal(isEventLikeLimitedRetail({limited:false,destinationPurpose:false,hasExperienceOrExhibition:false,ordinarySale:true}),false);
});

test('verified real oshi fixtures classify only from official evidence',()=>{
  const raw=fs.readFileSync(new URL('../../data/machiibe/fixtures/oshi_real_events_v1.json',import.meta.url),'utf8');
  const fixture=JSON.parse(raw) as {events:Array<{source_url:string;classification_text:string;expected_event_types:string[];verified_entities:Array<{type:string;canonical_name:string;relation:string}>;reservation?:{mode?:string;state?:string;checked_at?:string;source_url?:string}}>};
  assert.ok(fixture.events.length>=8);
  for(const event of fixture.events){
    assert.match(event.source_url,/^https:\/\//);
    const actual=classifyOshiEventType(event.classification_text);
    for(const expected of event.expected_event_types)assert.ok(actual.includes(expected as never),expected+' should classify');
    for(const entity of event.verified_entities){
      assert.ok(OSHI_ENTITY_TYPES.includes(entity.type as never));
      assert.ok(entity.canonical_name.trim().length>0);
      assert.ok(['featured','appearing','collaboration','subject','host'].includes(entity.relation));
    }
    if(event.reservation?.checked_at){
      assert.match(event.reservation.checked_at,/^\d{4}-\d{2}-\d{2}$/);
      assert.match(event.reservation.source_url||'',/^https:\/\//);
    }
  }
});


test('verified oshi entity graph resolves aliases and only links known entity ids',()=>{
  const raw=fs.readFileSync(new URL('../../data/machiibe/fixtures/oshi_entity_graph_v1.json',import.meta.url),'utf8');
  const graph=JSON.parse(raw) as {
    entities:OshiEntity[];
    verifiedRelationships:Array<{childEntityId:string;parentEntityId:string;relation:string;sourceUrl:string}>;
  };
  assert.ok(graph.entities.length>=5);
  const ids=new Set(graph.entities.map((entity)=>entity.id));
  assert.equal(ids.size,graph.entities.length);

  for(const entity of graph.entities){
    assert.ok(OSHI_ENTITY_TYPES.includes(entity.type));
    assert.ok(entity.canonicalName.trim());
    assert.ok(entity.officialUrls.every((url)=>/^https:\/\//.test(url)));
    assert.ok(entity.parentEntityIds.every((id)=>ids.has(id)&&id!==entity.id));
    assert.ok(entity.relatedEntityIds.every((id)=>ids.has(id)&&id!==entity.id));
  }

  const cinnamoroll=graph.entities.find((entity)=>entity.id==='character-cinnamoroll')!;
  assert.equal(entityMatchesQuery(cinnamoroll,'シナモン'),true);
  assert.equal(entityMatchesQuery(cinnamoroll,'CINNAMOROLL'),true);

  const pokemonCard=graph.entities.find((entity)=>entity.id==='work-pokemon-card-game')!;
  assert.equal(entityMatchesQuery(pokemonCard,'ポケカ'),true);
  assert.deepEqual(pokemonCard.parentEntityIds,['franchise-pokemon']);

  const genjibu=graph.entities.find((entity)=>entity.id==='group-genjibu')!;
  assert.equal(entityMatchesQuery(genjibu,'ゲンジブ'),true);
  assert.equal(entityMatchesQuery(genjibu,'GNJB'),true);

  for(const relation of graph.verifiedRelationships){
    assert.ok(ids.has(relation.childEntityId));
    assert.ok(ids.has(relation.parentEntityId));
    assert.ok(['part_of_franchise','member_of'].includes(relation.relation));
    assert.match(relation.sourceUrl,/^https:\/\//);
  }
});
