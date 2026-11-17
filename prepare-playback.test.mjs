import test from 'node:test';
import assert from 'node:assert/strict';
import {ladderFor,inspectPlaylist} from './tools/prepare-playback.mjs';

test('playback ladder preserves orientation and never upscales small originals',()=>{
 assert.deepEqual(ladderFor(1920,1080).map(x=>[x.width,x.height]),[[852,480],[1280,720],[1920,1080]]);
 assert.deepEqual(ladderFor(1080,1920).map(x=>[x.width,x.height]),[[480,852],[720,1280],[1080,1920]]);
 assert.deepEqual(ladderFor(544,960).map(x=>[x.width,x.height]),[[480,846]]);
 assert.deepEqual(ladderFor(320,240).map(x=>[x.width,x.height]),[[320,240]]);
 assert.deepEqual(ladderFor(1922,1080).at(-1).width,1920);
 assert.deepEqual(ladderFor(1080,1922).at(-1).height,1920);
 assert.ok(ladderFor(3840,1600).every(x=>Math.ceil(x.width/16)*Math.ceil(x.height/16)<=8192));
});
const valid=['#EXTM3U','#EXT-X-INDEPENDENT-SEGMENTS','#EXTINF:4,','#EXT-X-BYTERANGE:1000@0','stream.ts','#EXTINF:1.5,','#EXT-X-BYTERANGE:500@1000','stream.ts','#EXT-X-ENDLIST'].join('\n');
test('validation rejects truncated, gapped or oversized segmented media',()=>{
 assert.equal(inspectPlaylist(valid,1500,5.5).segments.length,2);
 assert.throws(()=>inspectPlaylist(valid,1500,6));
 assert.throws(()=>inspectPlaylist(valid,1400,5.5));
 assert.throws(()=>inspectPlaylist(valid.replace('500@1000','500@900'),1500,5.5));
 assert.throws(()=>inspectPlaylist(valid.replace('1000@0','3000000@0'),1500,5.5));
 assert.throws(()=>inspectPlaylist(valid.replace('#EXT-X-ENDLIST',''),1500,5.5));
 assert.throws(()=>inspectPlaylist(valid.replace('#EXT-X-INDEPENDENT-SEGMENTS',''),1500,5.5));
});
