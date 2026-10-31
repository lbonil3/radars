#!/usr/bin/env node
// Renders the magazine layout of each kept newsletter issue to texas/data/newsletters/pdf/YYYY-Www.pdf (Letter).
// Only re-renders when the issue or the layout changed. Needs puppeteer-core and a local Chrome (CHROME env or /usr/bin/google-chrome).
const fs = require('fs'), path = require('path'), L = require('./newsletter-pdf-lib.js');
const T = path.join(__dirname, '..', 'texas'), ND = path.join(T, 'data', 'newsletters'), PD = path.join(ND, 'pdf'), IX = path.join(PD, 'index.json');
const M = require(path.join(T, 'magazine.js'));
(async () => {
  const weeks = JSON.parse(fs.readFileSync(path.join(ND, 'index.json'), 'utf8')).weeks.filter((w) => w.items);
  const magJs = fs.readFileSync(path.join(T, 'magazine.js'), 'utf8'), css = fs.readFileSync(path.join(T, 'magazine.css'), 'utf8');
  const raw = {}, hashes = {}; weeks.forEach((w) => { raw[w.week] = fs.readFileSync(path.join(ND, w.week + '.json'), 'utf8'); hashes[w.week] = L.hash(L.stable(raw[w.week]), magJs, css); });
  let prev = null; try { prev = JSON.parse(fs.readFileSync(IX, 'utf8')); } catch (e) {}
  const pl = L.plan(weeks, hashes, prev); fs.mkdirSync(PD, { recursive: true });
  const old = {}; ((prev && prev.issues) || []).forEach((e) => { old[e.week] = e; });
  if (pl.render.length) {
    const puppeteer = require(process.env.PUPPETEER || 'puppeteer-core');
    const b = await puppeteer.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
    for (const wk of pl.render) {
      const pg = await b.newPage(); await pg.setContent(M.toDoc(JSON.parse(raw[wk]), css), { waitUntil: 'load' });
      const buf = await pg.pdf({ format: 'Letter', printBackground: true, preferCSSPageSize: false, tagged: true }); await pg.close();
      fs.writeFileSync(path.join(PD, wk + '.pdf'), buf); old[wk] = { week: wk, hash: hashes[wk], bytes: buf.length, generatedAt: new Date().toISOString() };
      console.log('pdf', wk, Math.round(buf.length / 1024) + ' KB');
    }
    await b.close();
  }
  let entries = weeks.filter((w) => old[w.week]).map((w) => Object.assign({}, old[w.week], { final: !!w.final }));
  const c = L.cap(entries); entries = c.entries;
  pl.prune.concat(c.dropped).forEach((wk) => { try { fs.unlinkSync(path.join(PD, wk + '.pdf')); console.log('pruned', wk); } catch (e) {} });
  const next = { issues: entries, totalBytes: c.total };
  const same = prev && JSON.stringify(prev.issues) === JSON.stringify(next.issues);
  if (!same) fs.writeFileSync(IX, JSON.stringify(Object.assign({ generatedAt: new Date().toISOString() }, next), null, 1) + '\n');
  console.log('pdfs: ' + entries.length + ' kept, ' + pl.render.length + ' rendered, ' + Math.round(c.total / 1024) + ' KB total');
})().catch((e) => { console.error(e); process.exit(1); });
