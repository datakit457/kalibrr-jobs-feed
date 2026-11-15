#!/usr/bin/env node
// kalibrr-jobs: export Philippines job listings from Kalibrr's public job board, optionally only new ones.
// No dependencies, Node 18+. Same logic as the hosted Apify Actor https://apify.com/datakit/kalibrr-jobs-feed (built by datakit457).
// Usage: node kalibrr-jobs.mjs [--keywords developer,accountant] [--cities makati,cebu] [--functions "IT and Software"]
//          [--wfh] [--new] [--state .kalibrr-seen.json] [--max 1000] [--format csv|jsonl] [--description]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const HEADERS = { accept: 'application/json', 'user-agent': 'kalibrr-jobs-cli/1.0 (+https://github.com/datakit457/kalibrr-jobs-feed)' };
async function getJson(url, tries = 4) {
    for (let i = 0; i < tries; i++) {
        try {
            const r = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(60000) });
            if (r.ok) return await r.json();
            if (r.status < 500 && r.status !== 429) throw new Error(`HTTP ${r.status}`);
        } catch (e) { if (i === tries - 1) throw e; }
        await new Promise((res) => setTimeout(res, 1500 * (i + 1)));
    }
}
const text = (h) => (h ?? '').replace(/<\/(p|li|ul|h\d)>/gi, '\n').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\n{3,}/g, '\n\n').trim();
const lc = (s) => String(s ?? '').toLowerCase();

const argv = process.argv.slice(2), opt = { format: 'csv', state: '.kalibrr-seen.json', max: '1000' };
for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--wfh') opt.wfh = true; else if (a === '--new') opt.new = true; else if (a === '--description') opt.description = true;
    else if (['--keywords', '--cities', '--functions', '--format', '--state', '--max'].includes(a)) opt[a.slice(2)] = argv[++i];
    else { console.log(readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 5).join('\n')); process.exit(a === '-h' || a === '--help' ? 0 : 2); }
}
const split = (s) => String(s ?? '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
const kw = split(opt.keywords), cs = split(opt.cities), fs = split(opt.functions), maxItems = Math.max(1, parseInt(opt.max, 10) || 1000);
const seen = new Set(opt.new && existsSync(opt.state) ? JSON.parse(readFileSync(opt.state, 'utf8')) : []);
const allIds = new Set(seen), runIds = new Set(), rows = [];
let offset = 0, total = Infinity, scanned = 0;
const LIMIT = 100;
while (offset < total && rows.length < maxItems) {
    const d = await getJson(`https://www.kalibrr.com/kjs/job_board/search?limit=${LIMIT}&offset=${offset}&country=Philippines`);
    total = d?.count ?? 0;
    const jobs = d?.jobs ?? [];
    if (!jobs.length) break;
    for (const j of jobs) {
        if (runIds.has(j.id)) continue; // listing shifts while paging, so offsets can repeat jobs
        runIds.add(j.id); scanned++; allIds.add(j.id);
        if (opt.new && seen.has(j.id)) continue;
        const loc = j.google_location?.address_components ?? {};
        if (opt.wfh && !j.is_work_from_home) continue;
        if (cs.length && !cs.some((c) => lc(loc.city).includes(c) || lc(loc.region).includes(c))) continue;
        if (fs.length && !fs.some((f) => lc(j.function).includes(f))) continue;
        if (kw.length && !kw.some((k) => lc(j.name).includes(k) || lc(j.function).includes(k) || lc(j.company_name).includes(k))) continue;
        if (rows.length >= maxItems) break;
        const row = {
            id: j.id, title: j.name, company: j.company_name, companyIndustry: j.company?.industry ?? null,
            function: j.function, employmentType: j.tenure, city: loc.city ?? null, region: loc.region ?? null,
            workFromHome: !!j.is_work_from_home, hybrid: !!j.is_hybrid, openToFreshGrads: !!j.is_open_to_fresh_grads,
            salaryMin: j.base_salary ?? null, salaryMax: j.maximum_salary ?? null, salaryCurrency: j.salary_currency ?? null, salaryInterval: j.salary_interval ?? null,
            postedAt: j.activation_date ?? j.created_at ?? null, applyBy: j.application_end_date ?? null,
            url: `https://www.kalibrr.com/c/${j.company?.code}/jobs/${j.id}/${j.slug}`,
        };
        if (opt.description) { row.description = text(j.description); row.qualifications = text(j.qualifications); }
        rows.push(row);
    }
    offset += LIMIT;
    console.error(`scanned ${scanned} of ${total}`);
}
if (opt.new) { if (offset >= total) writeFileSync(opt.state, JSON.stringify([...allIds])); else console.error('--max reached before the full list was scanned; state not updated.'); }
if (opt.format === 'jsonl') { for (const r of rows) console.log(JSON.stringify(r)); }
else {
    const cols = Object.keys(rows[0] ?? { id: 0, title: 0, company: 0, url: 0 });
    const q = (v) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    console.log(cols.join(','));
    for (const r of rows) console.log(cols.map((c) => q(r[c])).join(','));
}
console.error(`${rows.length} jobs written.`);
