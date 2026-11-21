'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const source = fs.readFileSync('icon-logo-motion-studio.js', 'utf8');

test('Browser AI illustration catalogue covers 1,500 concepts across 30 real-world and imaginative domains', () => {
  const motifs = source.match(/const motifs=Array\.from\(\{length:(\d+)\}/);
  assert.equal(Number(motifs?.[1]), 1500);
  const start = source.indexOf('const logoDomains=[');
  const end = source.indexOf('];', start);
  assert.ok(start >= 0 && end > start);
  const domains = source.slice(start, end);
  assert.equal((domains.match(/'[^']+'/g) || []).length, 30);
  for (const term of ['Hewan & Satwa Liar','Tumbuhan & Botani','Kendaraan Darat','Antariksa & Planet','Fantasi & Mitologi','Robot & Android','Kuliner & Minuman','Profesi & Keahlian']) {
    assert.ok(domains.includes(term), 'missing domain: ' + term);
  }
});

test('all 1,500 concepts render distinct, multipart SVG artwork with 15 illustration families', () => {
  const start = source.indexOf('function svgFor(');
  const end = source.indexOf('function rectSvg(', start);
  assert.ok(start >= 0 && end > start);
  const fn = source.slice(start, end).trim();
  const svgFor = new Function('esc', 'rectSvg', 'return (' + fn + ');')(
    value => String(value).replace(/[&<>"']/g, ''),
    (x,y,w,h,fill) => '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="'+fill+'"/>'
  );
  const families = new Set();
  const artworks = new Set();
  for (let i=0;i<1500;i++) {
    const svg=svgFor({logoIndex:i,id:'same',name:'Same concept',color:'#ffbd45',accent:'#55c7dc',style:'Flat Color'});
    artworks.add(svg);
    const family=svg.match(/data-illustration-family="(\d+)"/);
    if(family) families.add(family[1]);
    assert.ok((svg.match(/data-part="/g)||[]).length>=5,'concept '+i+' must have multiple semantic parts');
    assert.match(svg,/@keyframes .*float/);
    assert.doesNotMatch(svg,/<rect[^>]*(?:width="(?:100%|240)"|height="(?:100%|240)")/,'no enclosing frame');
  }
  assert.equal(families.size,15,'all fifteen illustration families are represented');
  assert.equal(artworks.size,1500,'all 1,500 rendered artworks must be structurally distinct');
});
