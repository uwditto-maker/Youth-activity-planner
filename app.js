/* Trailhead: plan Christ-centered outdoor activities, led by youth.
   No build step. Data stays on this device (localStorage); export a backup in Settings. */
(function () {
  'use strict';

  const D = window.TH_DATA;
  const KEY = 'trailhead.v1';
  const PCY_YEARS = 3; // Protecting Children and Youth training renews every 3 years.

  // ---------- state ----------
  const blank = () => ({ version: 1, unit: { name: '' }, youth: [], leaders: [], activities: [], deleted: {} });
  let S = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return Object.assign(blank(), JSON.parse(raw));
    } catch (e) { /* storage unavailable */ }
    return blank();
  }
  function saveLocal() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Could not save on this device'); }
  }
  function save() { saveLocal(); Sync.changed(); }
  const uid = () => Math.random().toString(36).slice(2, 10);
  // Every shared record carries u (last changed). Sync keeps the newest copy of each record.
  const touch = (rec) => { if (rec) rec.u = Date.now(); };
  const tombstone = (id) => { S.deleted[id] = Date.now(); };

  // ---------- helpers ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const byId = (arr, id) => arr.find((x) => x.id === id);
  const youthName = (id) => (byId(S.youth, id) || {}).name || '';
  const leaderName = (id) => (byId(S.leaders, id) || {}).name || '';

  function parseDate(s) { if (!s) return null; const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
  function fmtDate(s, opts) { const d = parseDate(s); return d ? d.toLocaleDateString(undefined, opts || { month: 'short', day: 'numeric' }) : ''; }
  function dateRange(a) {
    if (!a.start) return 'Date not set';
    if (!a.end || a.end === a.start) return fmtDate(a.start, { weekday: 'short', month: 'short', day: 'numeric' });
    return fmtDate(a.start) + ' – ' + fmtDate(a.end);
  }
  function nights(a) {
    const s = parseDate(a.start), e = parseDate(a.end);
    if (!s || !e) return 0;
    return Math.max(0, Math.round((e - s) / 86400000));
  }
  function dayLabels(a) {
    const n = nights(a), s = parseDate(a.start);
    const out = [];
    for (let i = 0; i <= n; i++) {
      if (s) { const d = new Date(s); d.setDate(d.getDate() + i); out.push(d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })); }
      else out.push('Day ' + (i + 1));
    }
    return out;
  }
  function kindLabel(a) { const n = nights(a); return n === 0 ? 'Day activity' : n === 1 ? '1 night' : n + ' nights'; }
  const isPast = (a) => { const e = parseDate(a.end || a.start); if (!e) return false; const t = new Date(); t.setHours(0, 0, 0, 0); return e < t; };

  function pcyStatus(l) {
    if (!l.pcyDate) return { ok: false, label: 'Training date missing' };
    const exp = parseDate(l.pcyDate); exp.setFullYear(exp.getFullYear() + PCY_YEARS);
    const ok = exp >= new Date();
    return { ok, label: (ok ? 'Current until ' : 'Expired ') + exp.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) };
  }

  function eligibleYouth(a) {
    return S.youth.filter((y) => a.who === 'Both' || y.org === a.who);
  }
  function att(a, yid) { return (a.attendance[yid] = a.attendance[yid] || { rsvp: '', invitedBy: '', permission: false, medical: false }); }
  function coming(a) { return eligibleYouth(a).filter((y) => (a.attendance[y.id] || {}).rsvp === 'yes'); }
  function leadersGoing(a) { return a.leadersAttending.map((id) => byId(S.leaders, id)).filter(Boolean); }

  // ---------- path binding ----------
  // Paths like "a.emergency.er" or "s.youth#abc.name" (#id selects an array item by id).
  function resolve(path) {
    const parts = path.split('.');
    let obj = parts[0] === 'a' ? currentActivity() : S;
    for (let i = 1; i < parts.length - 1; i++) {
      const [k, id] = parts[i].split('#');
      obj = obj[k];
      if (id !== undefined) obj = Array.isArray(obj) ? byId(obj, id) : (obj[id] = obj[id] || {});
      if (obj == null) return null;
    }
    return { obj, key: parts[parts.length - 1] };
  }
  function setPath(path, value) {
    const r = resolve(path);
    if (!r || !r.obj) return;
    r.obj[r.key] = value;
    const parts = path.split('.');
    if (parts[0] === 'a') touch(currentActivity());
    else if (parts[1] === 'unit') touch(S.unit);
    else { const [k, id] = parts[1].split('#'); touch(byId(S[k] || [], id)); }
    save();
  }

  // ---------- activity model ----------
  function newActivity(p) {
    return {
      id: uid(), title: p.title || '', placeId: p.placeId || '', location: p.location || '',
      pass: p.pass || '', start: p.start || '', end: p.end || '', who: p.who || 'YM',
      purpose: '', theme: '', scriptures: '', themeBy: '',
      devotionals: [], itinerary: [], weatherPlan: '', gear: [], meals: [],
      rides: [], budget: [], attendance: {}, leadersAttending: [],
      emergency: { er: '', erPhone: '', contact: '', cell: '', meet: '' },
      permitsDone: false, vehicleCheck: false, bishopApproved: false,
      reflections: [], created: Date.now(), u: Date.now()
    };
  }
  function currentActivity() { return byId(S.activities, route.id) || null; }
  const whyDone = (a) => a.purpose.trim().length >= 10 && a.theme.trim().length > 0;

  function checks(a) {
    const n = nights(a), going = coming(a), L = leadersGoing(a);
    const ym = going.some((y) => y.org === 'YM'), yw = going.some((y) => y.org === 'YW');
    const seats = a.rides.reduce((s, r) => s + (Number(r.seats) || 0), 0);
    const drivers = a.rides.filter((r) => r.driver).length;
    const riders = going.length + Math.max(0, L.length - drivers);
    const list = [
      { group: 'Christ at the center', ok: whyDone(a), text: 'Youth wrote the purpose and chose a gospel theme', tab: 'why' },
      { group: 'Christ at the center', ok: a.devotionals.length >= Math.max(1, n) && a.devotionals.every((d) => d.youth), text: n ? `A youth is assigned to at least one devotional moment per night (${Math.max(1, n)})` : 'A youth is assigned to a devotional moment', tab: 'why' },
      { group: 'Christ at the center', ok: a.devotionals.length > 0 && a.devotionals.every((d) => d.prepared), text: 'Every devotional leader says they are prepared', tab: 'why' },
      { group: 'Leaders', ok: L.length >= 2, text: `At least two adult leaders attending (${L.length})`, tab: 'people' },
      { group: 'Leaders', ok: L.length > 0 && L.every((l) => pcyStatus(l).ok), text: 'Every attending leader has current Protecting Children and Youth training', tab: 'people' },
      { group: 'Leaders', ok: !yw || L.some((l) => l.gender === 'F'), text: 'A woman leader attends when young women attend', tab: 'people', hide: !yw },
      { group: 'Leaders', ok: !ym || L.some((l) => l.gender === 'M'), text: 'A man leader attends when young men attend', tab: 'people', hide: !ym || n === 0 },
      { group: 'Youth', ok: going.length > 0, text: `Youth have said they are coming (${going.length})`, tab: 'people' },
      { group: 'Youth', ok: going.length > 0 && going.every((y) => att(a, y.id).permission && att(a, y.id).medical), text: 'Permission and medical forms received for every youth coming', tab: 'people' },
      { group: 'Travel', ok: seats >= riders && riders > 0, text: `Enough seats (${seats} seats for ${riders} riders)`, tab: 'rides' },
      { group: 'Travel', ok: a.vehicleCheck, text: 'No adult will be alone with one youth in a vehicle', tab: 'rides' },
      { group: 'Plan', ok: a.itinerary.length > 0, text: 'Schedule written', tab: 'plan' },
      { group: 'Plan', ok: a.weatherPlan.trim().length > 0, text: 'Bad-weather plan written', tab: 'plan' },
      { group: 'Plan', ok: a.gear.length > 0, text: 'Gear list made', tab: 'gear' },
      { group: 'Plan', ok: n === 0 || a.meals.length > 0, text: 'Meals planned', tab: 'food', hide: n === 0 },
      { group: 'Safety', ok: !!(a.emergency.er.trim() && a.emergency.contact.trim()), text: 'Emergency sheet has the nearest ER and an emergency contact', tab: 'safety' },
      { group: 'Safety', ok: a.permitsDone, text: 'Passes, permits and reservations done' + (a.pass ? ` (${a.pass})` : ''), tab: 'safety' },
      { group: 'Safety', ok: a.bishopApproved, text: 'Bishop approved the activity', tab: 'safety' }
    ];
    return list.filter((c) => !c.hide);
  }
  function readiness(a) { const c = checks(a); const ok = c.filter((x) => x.ok).length; return { ok, total: c.length, pct: Math.round((ok / c.length) * 100) }; }

  // ---------- routing ----------
  let route = {};
  function parseRoute() {
    const h = location.hash.replace(/^#\/?/, '').split('/');
    if (h[0] === 'a' && h[1]) return { view: 'activity', id: h[1], tab: h[2] || 'why' };
    if (h[0] === 'new') return { view: 'new', placeId: h[1] || '' };
    if (h[0] === 'people') return { view: 'people' };
    if (h[0] === 'settings') return { view: 'settings' };
    return { view: 'year' };
  }
  function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }

  // ---------- rendering ----------
  const app = $('#app'), topbar = $('#topbar');
  function render() {
    route = parseRoute();
    let html = '', top = '';
    if (route.view === 'year') [top, html] = viewYear();
    else if (route.view === 'new') [top, html] = viewNew();
    else if (route.view === 'people') [top, html] = viewPeople();
    else if (route.view === 'settings') [top, html] = viewSettings();
    else if (route.view === 'activity') {
      if (!currentActivity()) { go('#/'); return; }
      [top, html] = viewActivity();
    }
    topbar.innerHTML = top;
    app.innerHTML = html;
    const tab = route.view === 'activity' || route.view === 'new' ? 'year' : route.view;
    document.querySelectorAll('#tabbar a').forEach((el) => el.classList.toggle('on', el.dataset.tab === tab));
    document.body.classList.toggle('in-activity', route.view === 'activity');
    Sync.paint();
  }
  function bar(title, { back, action, left } = {}) {
    return `<div class="bar">${back ? `<a class="back" href="${back}" aria-label="Back">‹</a>` : left || '<span></span>'}<h1>${esc(title)}</h1>${action || '<span></span>'}</div>`;
  }
  const empty = (msg, btn) => `<div class="empty"><p>${msg}</p>${btn || ''}</div>`;

  // ----- Year -----
  function viewYear() {
    const acts = S.activities.slice().sort((x, y) => (x.start || '9999').localeCompare(y.start || '9999'));
    const count = acts.length;
    let body = `<section class="hero">
      <p class="eyebrow">${esc(S.unit.name || 'Your youth')}</p>
      <h2>This year's outdoor activities</h2>
      <p class="muted">${count} of 3–6 planned. Every activity starts with how it will bring us closer to Jesus Christ.</p>
      <div class="meter" aria-hidden="true">${[1, 2, 3, 4, 5, 6].map((i) => `<i class="${i <= count ? 'on' : ''} ${i > 3 ? 'opt' : ''}"></i>`).join('')}</div>
    </section>`;
    if (!count) {
      body += empty('No activities yet. Hold a planning night with your youth presidencies and add the first one.',
        `<a class="btn primary" href="#/new">Add an activity</a>${S.youth.length ? '' : '<button class="btn" data-action="sample">Load sample roster</button>'}`);
    } else {
      body += '<div class="cards">' + acts.map(cardActivity).join('') + '</div>';
      if (count < 6) body += `<a class="btn primary block" href="#/new">Add an activity</a>`;
    }
    body += inviteList();
    const left = Sync.on() ? `<a class="iconbtn" href="#/settings" aria-label="Sync status"><span class="syncdot" data-sync-status data-state=""></span></a>` : '';
    return [bar('Trailhead', { left, action: '<a class="iconbtn" href="#/new" aria-label="Add activity">＋</a>' }), body];
  }
  function cardActivity(a) {
    const r = readiness(a), n = coming(a).length;
    return `<a class="card act ${isPast(a) ? 'past' : ''}" href="#/a/${a.id}/${whyDone(a) ? 'safety' : 'why'}">
      <div class="row"><span class="tag">${esc(kindLabel(a))}</span><span class="tag ${a.who === 'Both' ? 'both' : ''}">${a.who === 'Both' ? 'YM + YW' : a.who}</span></div>
      <h3>${esc(a.title || 'Untitled activity')}</h3>
      <p class="muted">${esc(dateRange(a))}${a.location ? ' · ' + esc(a.location) : ''}</p>
      ${a.theme ? `<p class="theme">✦ ${esc(a.theme)}</p>` : '<p class="theme missing">Youth haven\'t chosen a theme yet</p>'}
      <div class="progress" role="img" aria-label="${r.pct}% ready"><span style="width:${r.pct}%"></span></div>
      <p class="small">${r.ok}/${r.total} ready · ${n} youth coming</p>
    </a>`;
  }
  function inviteList() {
    if (!S.youth.length || !S.activities.length) return '';
    const yearActs = S.activities.filter((a) => isPast(a));
    const notYet = S.youth.filter((y) => !yearActs.some((a) => (a.attendance[y.id] || {}).rsvp === 'yes'));
    if (!notYet.length) return '';
    return `<section class="panel"><h3>Personal invitations</h3>
      <p class="muted small">${yearActs.length ? "These youth haven't come to an activity yet this year." : 'Before the first activity, make sure every youth gets a personal invitation from another youth.'} Assign a youth leader to reach out.</p>
      <ul class="plain">${notYet.map((y) => `<li>${esc(y.name)} <span class="tag">${y.org}</span></li>`).join('')}</ul></section>`;
  }

  // ----- New activity -----
  function viewNew() {
    const p = D.places.find((x) => x.id === route.placeId);
    if (!route.placeId) {
      const list = D.places.map((pl) => `<a class="card place" href="#/new/${pl.id}">
        <h3>${esc(pl.name)}</h3><p class="muted small">${esc(pl.area)} · ${esc(pl.drive)}</p>
        <div class="row wrap">${pl.kinds.map((k) => `<span class="tag">${esc(k)}</span>`).join('')}</div></a>`).join('');
      return [bar('Choose a place', { back: '#/' }), `<p class="lead">Ideas near Spokane. Fees and rules change, so verify before you go.</p>
        <a class="card place custom" href="#/new/custom"><h3>Somewhere else</h3><p class="muted small">Enter your own place</p></a>
        <div class="cards">${list}</div>`];
    }
    const today = new Date().toISOString().slice(0, 10);
    return [bar(p ? p.name : 'New activity', { back: '#/new' }), `
      ${p ? `<section class="panel"><p>${esc(p.notes)}</p><p class="small muted">Pass: ${esc(p.pass)}</p></section>` : ''}
      <form class="panel form" id="newform">
        <label>Activity name<input name="title" required placeholder="${p ? esc(p.name) + ' campout' : 'e.g. Spring campout'}" value=""></label>
        ${p ? '' : '<label>Place<input name="location" placeholder="Where are you going?"></label>'}
        <div class="two"><label>Start<input type="date" name="start" min="${today}" required></label>
        <label>End<input type="date" name="end" min="${today}"></label></div>
        <p class="hint">Leave End empty for a one-day activity.</p>
        <fieldset><legend>Who's going</legend>
          <div class="seg">${['YM', 'YW', 'Both'].map((w, i) => `<label><input type="radio" name="who" value="${w}" ${i === 0 ? 'checked' : ''}><span>${w === 'YM' ? 'Young men' : w === 'YW' ? 'Young women' : 'Both'}</span></label>`).join('')}</div>
        </fieldset>
        <button class="btn primary block" type="submit">Create and start with the why</button>
      </form>`];
  }

  // ----- Activity -----
  const TABS = [
    ['why', 'Why'], ['plan', 'Schedule'], ['people', 'People'], ['gear', 'Gear'], ['food', 'Food'],
    ['rides', 'Rides'], ['budget', 'Budget'], ['safety', 'Ready?'], ['after', 'After']
  ];
  function viewActivity() {
    const a = currentActivity();
    if (route.tab === 'sheet') return [bar('Trip sheet', { back: `#/a/${a.id}/safety`, action: '<button class="iconbtn" data-action="print" aria-label="Print">⎙</button>' }), tripSheet(a)];
    const locked = !whyDone(a);
    let tab = route.tab, bounced = false;
    if (locked && !['why', 'safety'].includes(tab)) {
      tab = 'why'; bounced = true;
      history.replaceState(null, '', `#/a/${a.id}/why`); route.tab = 'why';
    }
    const tabs = `<div class="tabs" role="tablist">${TABS.map(([k, l]) => {
      const lock = locked && !['why', 'safety'].includes(k);
      return `<a role="tab" href="#/a/${a.id}/${k}" class="${k === tab ? 'on' : ''} ${lock ? 'locked' : ''}" aria-selected="${k === tab}">${lock ? '🔒 ' : ''}${l}</a>`;
    }).join('')}</div>`;
    const head = `<div class="acthead"><p class="muted small">${esc(dateRange(a))} · ${esc(kindLabel(a))}${a.location ? ' · ' + esc(a.location) : ''}</p></div>`;
    const views = { why: tabWhy, plan: tabPlan, people: tabPeople, gear: tabGear, food: tabFood, rides: tabRides, budget: tabBudget, safety: tabSafety, after: tabAfter };
    const lockNote = bounced ?'<div class="note">Start with the why. Once the youth write the purpose and choose a theme, the planning tabs open.</div>' : '';
    const action = `<button class="iconbtn" data-action="menu" aria-label="More">⋯</button>`;
    return [bar(a.title || 'Activity', { back: '#/', action }) + tabs, head + lockNote + views[tab](a)];
  }

  function youthOptions(sel, list) {
    const ys = list || S.youth;
    return `<option value="">Choose…</option>` + ys.map((y) => `<option value="${y.id}" ${y.id === sel ? 'selected' : ''}>${esc(y.name)}</option>`).join('');
  }
  function delBtn(list, id, label) { return `<button class="del" data-action="del" data-list="${list}" data-id="${id}" aria-label="Remove ${esc(label || '')}">✕</button>`; }

  function tabWhy(a) {
    const ys = eligibleYouth(a);
    return `<section class="panel christ">
      <h2>Start with the Savior</h2>
      <p class="muted">The youth decide why we're going and what gospel theme will guide the activity. Leaders can help, but the youth choose.</p>
      <label>Purpose<textarea data-bind="a.purpose" rows="3" placeholder="Through this activity we want to come closer to Jesus Christ by…">${esc(a.purpose)}</textarea></label>
      <label>Gospel theme (chosen by the youth)<input data-bind="a.theme" value="${esc(a.theme)}" placeholder="In your own words"></label>
      <label>Scriptures the youth picked<input data-bind="a.scriptures" value="${esc(a.scriptures)}" placeholder="Optional"></label>
      <label>Chosen by<select data-bind="a.themeBy" data-rerender>${youthOptions(a.themeBy, ys)}</select></label>
      <details><summary>Need help choosing a theme?</summary>
        <p class="small muted">Questions to talk through as a presidency:</p>
        <ol class="guide">${D.themeGuidance.map((q) => `<li>${esc(q)}</li>`).join('')}</ol>
      </details>
    </section>
    <section class="panel">
      <div class="row between"><h3>Devotional moments</h3><button class="btn small" data-action="add" data-list="devotionals">Add</button></div>
      <p class="muted small">Youth prepare these themselves.${nights(a) ? ` Plan at least one for each night (${nights(a)}).` : ''}</p>
      ${a.devotionals.length ? a.devotionals.map((d) => `<div class="item">
        <div class="grow"><input data-bind="a.devotionals#${d.id}.when" value="${esc(d.when)}" placeholder="When? e.g. Friday campfire, summit">
        <select data-bind="a.devotionals#${d.id}.youth" data-rerender>${youthOptions(d.youth, ys)}</select>
        <label class="check"><input type="checkbox" data-bind="a.devotionals#${d.id}.prepared" ${d.prepared ? 'checked' : ''}> Prepared</label></div>
        ${delBtn('devotionals', d.id, 'devotional')}</div>`).join('') : '<p class="small">No devotional moments yet.</p>'}
      <details><summary>Tips for youth leading a devotional</summary><ul>${D.devotionalTips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></details>
    </section>
    ${whyDone(a) ? `<a class="btn primary block" href="#/a/${a.id}/plan">Next: the schedule</a>` : '<p class="hint center">Write the purpose and theme to open the planning tabs.</p>'}`;
  }

  function tabPlan(a) {
    const days = dayLabels(a);
    const byDay = days.map((label, i) => {
      const items = a.itinerary.filter((x) => Number(x.day) === i).sort((x, y) => (x.time || '').localeCompare(y.time || ''));
      return `<section class="panel"><div class="row between"><h3>${esc(label)}</h3><button class="btn small" data-action="add" data-list="itinerary" data-day="${i}">Add</button></div>
        ${items.length ? items.map((it) => `<div class="item">
          <input class="time" type="time" data-bind="a.itinerary#${it.id}.time" value="${esc(it.time)}" data-rerender>
          <input class="grow" data-bind="a.itinerary#${it.id}.what" value="${esc(it.what)}" placeholder="What happens">
          ${delBtn('itinerary', it.id, 'item')}</div>`).join('') : '<p class="small">Nothing scheduled.</p>'}</section>`;
    }).join('');
    return `${a.itinerary.length ? '' : `<button class="btn block" data-action="starter-schedule">Add a starter schedule</button>`}
      ${byDay}
      <section class="panel"><h3>Bad-weather plan</h3>
      <textarea data-bind="a.weatherPlan" rows="3" placeholder="If it storms, gets too hot or smoke is bad, we will…">${esc(a.weatherPlan)}</textarea></section>`;
  }

  function tabPeople(a) {
    const ys = eligibleYouth(a);
    const going = coming(a);
    const rows = ys.map((y) => {
      const t = att(a, y.id);
      return `<div class="person">
        <div class="row between"><strong>${esc(y.name)}</strong><span class="tag">${y.org}</span></div>
        <div class="two">
          <label class="small">RSVP<select data-bind="a.attendance#${y.id}.rsvp" data-rerender>
            ${[['', 'Not invited'], ['invited', 'Invited'], ['yes', 'Coming'], ['no', "Can't come"]].map(([v, l]) => `<option value="${v}" ${t.rsvp === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          <label class="small">Invited by<select data-bind="a.attendance#${y.id}.invitedBy">${youthOptions(t.invitedBy, ys.filter((o) => o.id !== y.id))}</select></label>
        </div>
        ${t.rsvp === 'yes' ? `<div class="row"><label class="check"><input type="checkbox" data-bind="a.attendance#${y.id}.permission" ${t.permission ? 'checked' : ''} data-rerender> Permission form</label>
          <label class="check"><input type="checkbox" data-bind="a.attendance#${y.id}.medical" ${t.medical ? 'checked' : ''} data-rerender> Medical form</label></div>` : ''}
      </div>`;
    }).join('');
    const leaders = S.leaders.map((l) => {
      const p = pcyStatus(l), on = a.leadersAttending.includes(l.id);
      return `<label class="person check leader"><input type="checkbox" data-action="toggle-leader" data-id="${l.id}" ${on ? 'checked' : ''}>
        <span class="grow"><strong>${esc(l.name)}</strong> <span class="small muted">${l.gender === 'F' ? 'Woman' : 'Man'}</span><br>
        <span class="small ${p.ok ? 'ok' : 'bad'}">${p.ok ? '✓' : '!'} Protecting Children and Youth training: ${esc(p.label)}</span></span></label>`;
    }).join('');
    return `<section class="panel"><div class="row between"><h3>Youth</h3><span class="small">${going.length} coming</span></div>
        <p class="muted small">Personal invitations from other youth work best. Pick who will invite each person.</p>
        ${ys.length ? rows : empty('No youth on the roster yet.', '<a class="btn" href="#/people">Add youth</a>')}</section>
      <section class="panel"><h3>Adult leaders</h3>
        ${S.leaders.length ? leaders : empty('No leaders on the roster yet.', '<a class="btn" href="#/people">Add leaders</a>')}</section>
      <section class="panel"><h3>Reminders</h3>
        <p class="muted small">Opens your email or calendar app; nothing is sent automatically.</p>
        <div class="row wrap"><button class="btn" data-action="email-parents">Email parents</button>
        <button class="btn" data-action="copy-reminder">Copy reminder text</button>
        <button class="btn" data-action="ics">Add to calendar</button></div></section>`;
  }

  function tabGear(a) {
    const section = (scope, title) => {
      const items = a.gear.filter((g) => g.scope === scope);
      return `<section class="panel"><div class="row between"><h3>${title}</h3><button class="btn small" data-action="add" data-list="gear" data-scope="${scope}">Add</button></div>
        ${items.map((g) => `<div class="item"><input type="checkbox" aria-label="Packed" data-bind="a.gear#${g.id}.done" ${g.done ? 'checked' : ''}>
          <input class="grow" data-bind="a.gear#${g.id}.name" value="${esc(g.name)}" placeholder="Item">
          ${scope === 'group' ? `<input class="who" data-bind="a.gear#${g.id}.who" value="${esc(g.who || '')}" placeholder="Who brings">` : ''}
          ${delBtn('gear', g.id, g.name)}</div>`).join('') || '<p class="small">Nothing yet.</p>'}</section>`;
    };
    return `${a.gear.length ? '' : `<button class="btn block" data-action="starter-gear">Add a starter gear list for ${nights(a) ? 'an overnight' : 'a day activity'}</button>`}
      ${section('personal', 'Each person brings')}${section('group', 'Group gear')}`;
  }

  function tabFood(a) {
    if (!nights(a)) return `<section class="panel"><h3>Food</h3><p class="muted small">Day activity: list lunch and snacks in the gear list, or add meals here.</p></section>` + mealsList(a);
    return `${a.meals.length ? '' : '<button class="btn block" data-action="starter-meals">Add a slot for every meal</button>'}` + mealsList(a);
  }
  function mealsList(a) {
    const days = dayLabels(a);
    return `<section class="panel"><div class="row between"><h3>Meals</h3><button class="btn small" data-action="add" data-list="meals">Add</button></div>
      ${a.meals.map((m) => `<div class="item col">
        <div class="row"><select data-bind="a.meals#${m.id}.day" data-rerender>${days.map((d, i) => `<option value="${i}" ${Number(m.day) === i ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select>
        <select data-bind="a.meals#${m.id}.meal">${['Breakfast', 'Lunch', 'Dinner', 'Snack'].map((x) => `<option ${m.meal === x ? 'selected' : ''}>${x}</option>`).join('')}</select>${delBtn('meals', m.id, 'meal')}</div>
        <input data-bind="a.meals#${m.id}.menu" value="${esc(m.menu)}" placeholder="Menu">
        <input data-bind="a.meals#${m.id}.who" value="${esc(m.who)}" placeholder="Who cooks / brings"></div>`).join('') || '<p class="small">No meals yet.</p>'}
      <p class="hint">Ask about allergies on the medical form and plan around them.</p></section>`;
  }

  function tabRides(a) {
    const L = leadersGoing(a), going = coming(a);
    const seats = a.rides.reduce((s, r) => s + (Number(r.seats) || 0), 0);
    const drivers = a.rides.filter((r) => r.driver).length;
    const riders = going.length + Math.max(0, L.length - drivers);
    return `<section class="panel"><div class="row between"><h3>Drivers</h3><button class="btn small" data-action="add" data-list="rides">Add</button></div>
      <p class="small ${seats >= riders && riders ? 'ok' : 'bad'}">${seats} passenger seats for ${riders} riders</p>
      ${a.rides.map((r) => `<div class="item">
        <select class="grow" data-bind="a.rides#${r.id}.driver" data-rerender><option value="">Driver…</option>${S.leaders.map((l) => `<option value="${l.id}" ${l.id === r.driver ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}</select>
        <input class="num" type="number" min="0" inputmode="numeric" data-bind="a.rides#${r.id}.seats" value="${esc(r.seats)}" placeholder="Seats" data-rerender aria-label="Passenger seats">
        ${delBtn('rides', r.id, 'driver')}</div>`).join('') || '<p class="small">No drivers yet. Drivers should be adult leaders or approved parents.</p>'}
      </section>
      <section class="panel"><label class="check"><input type="checkbox" data-bind="a.vehicleCheck" ${a.vehicleCheck ? 'checked' : ''} data-rerender> No adult will be alone with one youth in a vehicle</label></section>`;
  }

  function tabBudget(a) {
    const total = a.budget.reduce((s, b) => s + (Number(b.cost) || 0), 0);
    const n = coming(a).length + leadersGoing(a).length;
    return `<section class="panel"><div class="row between"><h3>Budget</h3><button class="btn small" data-action="add" data-list="budget">Add</button></div>
      ${a.budget.map((b) => `<div class="item"><input class="grow" data-bind="a.budget#${b.id}.item" value="${esc(b.item)}" placeholder="Item (food, passes, rentals)">
        <input class="num" type="number" min="0" step="0.01" inputmode="decimal" data-bind="a.budget#${b.id}.cost" value="${esc(b.cost)}" placeholder="$" data-rerender aria-label="Cost">${delBtn('budget', b.id, b.item)}</div>`).join('') || '<p class="small">No costs yet.</p>'}
      <div class="total"><span>Total</span><strong>$${total.toFixed(2)}</strong></div>
      ${n ? `<p class="small muted">About $${(total / n).toFixed(2)} per person for ${n} people.</p>` : ''}</section>`;
  }

  function tabSafety(a) {
    const c = checks(a), r = readiness(a);
    const groups = [...new Set(c.map((x) => x.group))];
    return `<section class="panel ready"><div class="ring" style="--p:${r.pct}"><span>${r.pct}%</span></div>
      <div><h2>${r.pct === 100 ? 'Ready to go' : 'Getting ready'}</h2><p class="muted small">${r.ok} of ${r.total} checks done. Tap one to fix it.</p></div></section>
      ${groups.map((g) => `<section class="panel"><h3>${g}</h3><ul class="checks">${c.filter((x) => x.group === g).map((x) =>
        `<li class="${x.ok ? 'ok' : ''}"><a href="#/a/${a.id}/${x.tab}"><span class="dot">${x.ok ? '✓' : ''}</span>${esc(x.text)}</a></li>`).join('')}</ul></section>`).join('')}
      <section class="panel"><h3>Emergency sheet</h3><p class="muted small">Saved on this phone, so it works with no signal.</p>
        <label>Nearest emergency room<input data-bind="a.emergency.er" value="${esc(a.emergency.er)}" placeholder="Hospital name and town"></label>
        <label>ER phone<input type="tel" data-bind="a.emergency.erPhone" value="${esc(a.emergency.erPhone)}"></label>
        <label>Emergency contact at home<input data-bind="a.emergency.contact" value="${esc(a.emergency.contact)}" placeholder="Name and phone"></label>
        <label>Cell coverage and how to call for help<input data-bind="a.emergency.cell" value="${esc(a.emergency.cell)}" placeholder="e.g. No signal past the trailhead; satellite messenger with leader"></label>
        <label>Meeting point if separated<input data-bind="a.emergency.meet" value="${esc(a.emergency.meet)}"></label>
      </section>
      <section class="panel">
        <label class="check"><input type="checkbox" data-bind="a.permitsDone" ${a.permitsDone ? 'checked' : ''} data-rerender><span>Passes, permits and reservations done${a.pass ? `<br><span class="small muted">${esc(a.pass)}</span>` : ''}</span></label>
        <label class="check"><input type="checkbox" data-bind="a.bishopApproved" ${a.bishopApproved ? 'checked' : ''} data-rerender> Bishop approved</label>
        <p class="hint">These checks are a planning aid. Follow the General Handbook and your bishop's direction for activity and safety policy.</p>
      </section>`;
  }

  function tabAfter(a) {
    return `<section class="panel christ"><h2>Where did you see the Savior?</h2>
      <p class="muted">After the activity, invite each youth to share one moment. Use first names only, or none.</p>
      <textarea id="reflect" rows="3" placeholder="I felt the Savior when…"></textarea>
      <button class="btn primary block" data-action="add-reflection">Save</button></section>
      <section class="panel"><h3>Shared moments (${a.reflections.length})</h3>
      ${a.reflections.map((r) => `<blockquote>${esc(r.text)}<div class="row between"><span class="small muted">${new Date(r.at).toLocaleDateString()}</span>${delBtn('reflections', r.id, 'moment')}</div></blockquote>`).join('') || '<p class="small">None yet.</p>'}</section>`;
  }

  function tripSheet(a) {
    const days = dayLabels(a), L = leadersGoing(a), going = coming(a), e = a.emergency;
    const li = (arr) => arr.length ? `<ul>${arr.map((x) => `<li>${x}</li>`).join('')}</ul>` : '<p class="small">None listed.</p>';
    return `<article class="tripsheet panel">
      <h2>${esc(a.title)}</h2>
      <p>${esc(dateRange(a))} · ${esc(kindLabel(a))}${a.location ? ' · ' + esc(a.location) : ''}</p>
      <h3>Why we're going</h3><p>${esc(a.purpose) || '<em>Not written yet</em>'}</p>
      <p><strong>Theme:</strong> ${esc(a.theme) || '—'}${a.scriptures ? ` · ${esc(a.scriptures)}` : ''}${a.themeBy ? ` <span class="muted">(chosen by ${esc(youthName(a.themeBy))})</span>` : ''}</p>
      <h3>Devotional moments</h3>${li(a.devotionals.map((d) => `${esc(d.when || 'Time TBD')}: ${esc(youthName(d.youth) || 'unassigned')}`))}
      <h3>Emergency</h3>
      <p>ER: ${esc(e.er) || '—'} ${esc(e.erPhone)}<br>Home contact: ${esc(e.contact) || '—'}<br>Calling for help: ${esc(e.cell) || '—'}<br>Meeting point: ${esc(e.meet) || '—'}</p>
      <h3>Schedule</h3>${days.map((label, i) => `<h4>${esc(label)}</h4>${li(a.itinerary.filter((x) => Number(x.day) === i).sort((x, y) => (x.time || '').localeCompare(y.time || '')).map((x) => `${esc(fmtTime(x.time))} ${esc(x.what)}`))}`).join('')}
      ${a.weatherPlan ? `<p><strong>Bad weather:</strong> ${esc(a.weatherPlan)}</p>` : ''}
      <h3>Leaders (${L.length})</h3>${li(L.map((l) => esc(l.name)))}
      <h3>Youth coming (${going.length})</h3>${li(going.map((y) => esc(y.name)))}
      <h3>Drivers</h3>${li(a.rides.map((r) => `${esc(leaderName(r.driver) || 'Driver TBD')}: ${esc(r.seats || 0)} seats`))}
      ${a.meals.length ? `<h3>Meals</h3>${li(a.meals.slice().sort((x, y) => x.day - y.day).map((m) => `${esc(days[m.day] || '')} ${esc(m.meal)}: ${esc(m.menu || 'TBD')}${m.who ? ' — ' + esc(m.who) : ''}`))}` : ''}
      <h3>Group gear</h3>${li(a.gear.filter((g) => g.scope === 'group').map((g) => `${esc(g.name)}${g.who ? ' — ' + esc(g.who) : ''}`))}
      <button class="btn primary block noprint" data-action="print">Print or save as PDF</button>
    </article>`;
  }

  // ----- People -----
  function viewPeople() {
    const today = new Date().toISOString().slice(0, 10);
    const ys = S.youth.slice().sort((a, b) => a.name.localeCompare(b.name));
    return [bar('People'), `<section class="panel"><div class="row between"><h3>Youth (${S.youth.length})</h3><button class="btn small" data-action="add-youth">Add</button></div>
      <p class="muted small">Only what you need to plan and remind. Keep medical details on paper forms, not here.</p>
      ${ys.map((y) => `<div class="person"><div class="row"><input class="grow" data-bind="s.youth#${y.id}.name" value="${esc(y.name)}" placeholder="Name" aria-label="Name">
        <select data-bind="s.youth#${y.id}.org" data-rerender aria-label="Group"><option value="YM" ${y.org === 'YM' ? 'selected' : ''}>YM</option><option value="YW" ${y.org === 'YW' ? 'selected' : ''}>YW</option></select>
        ${delPerson('youth', y)}</div>
        <input data-bind="s.youth#${y.id}.parentEmail" type="email" value="${esc(y.parentEmail)}" placeholder="Parent email" aria-label="Parent email">
        <input data-bind="s.youth#${y.id}.parentPhone" type="tel" value="${esc(y.parentPhone)}" placeholder="Parent phone" aria-label="Parent phone"></div>`).join('') || '<p class="small">No youth yet.</p>'}</section>
      <section class="panel"><div class="row between"><h3>Adult leaders (${S.leaders.length})</h3><button class="btn small" data-action="add-leader">Add</button></div>
      ${S.leaders.map((l) => { const p = pcyStatus(l); return `<div class="person"><div class="row"><input class="grow" data-bind="s.leaders#${l.id}.name" value="${esc(l.name)}" placeholder="Name" aria-label="Name">
        <select data-bind="s.leaders#${l.id}.gender" data-rerender aria-label="Man or woman"><option value="M" ${l.gender === 'M' ? 'selected' : ''}>Man</option><option value="F" ${l.gender === 'F' ? 'selected' : ''}>Woman</option></select>
        ${delPerson('leaders', l)}</div>
        <label class="small">Protecting Children and Youth training completed<input type="date" max="${today}" data-bind="s.leaders#${l.id}.pcyDate" value="${esc(l.pcyDate)}" data-rerender></label>
        <p class="small ${p.ok ? 'ok' : 'bad'}">${esc(p.label)}</p></div>`; }).join('') || '<p class="small">No leaders yet.</p>'}</section>`];
  }
  function delPerson(list, p) { return `<button class="del" data-action="del-person" data-list="${list}" data-id="${p.id}" aria-label="Remove ${esc(p.name)}">✕</button>`; }

  // ----- Settings -----
  function viewSettings() {
    return [bar('Settings'), `<section class="panel form"><label>Quorum, class or ward name<input data-bind="s.unit.name" value="${esc(S.unit.name)}" placeholder="e.g. Spokane 5th Ward Young Men"></label></section>
      ${syncPanel()}
      <section class="panel"><h3>Backup</h3>
        <p class="muted small">Export a backup file to keep a copy or to hand the plan to another leader, who can import it.</p>
        <div class="row wrap"><button class="btn" data-action="export">Export backup</button>
        <label class="btn">Import backup<input type="file" accept="application/json,.json" id="importfile" hidden></label></div></section>
      <section class="panel"><h3>Install on iPhone</h3>
        <p class="small">In Safari, tap Share, then <strong>Add to Home Screen</strong>. Trailhead then opens like an app and works offline at camp.</p></section>
      <section class="panel"><h3>Try it out</h3><div class="row wrap">
        <button class="btn" data-action="sample">Load sample roster</button>
        <button class="btn danger" data-action="reset">Erase everything</button></div></section>
      <p class="hint center">Trailhead prototype. Not an official Church app.</p>`];
  }

  function syncPanel() {
    if (Sync.on()) {
      return `<section class="panel"><h3>Shared Google Sheet</h3>
        <p class="row"><span class="syncdot" data-sync-status data-state=""></span><span id="syncstatus" class="small">${esc(Sync.label())}</span></p>
        <p class="muted small">Changes sync automatically when you have a signal. Everyone using the same web app URL and passcode sees the same plan.</p>
        <div class="row wrap"><button class="btn" data-action="sync-now">Sync now</button><button class="btn danger" data-action="sync-off">Disconnect</button></div></section>`;
    }
    return `<section class="panel form"><h3>Shared Google Sheet</h3>
      <p class="muted small">Connect to your ward's Trailhead Data sheet so leaders and youth leaders share one plan. Ask the leader who set it up for the web app URL and passcode.</p>
      <label>Web app URL<input id="syncurl" type="url" inputmode="url" autocomplete="off" placeholder="https://script.google.com/macros/s/…/exec"></label>
      <label>Passcode<input id="synckey" type="password" autocomplete="off"></label>
      <button class="btn primary block" data-action="sync-connect">Connect</button></section>`;
  }

  // ---------- actions ----------
  const DEFAULTS = {
    devotionals: () => ({ when: '', youth: '', prepared: false }),
    itinerary: (el) => ({ day: Number(el.dataset.day || 0), time: '', what: '' }),
    gear: (el) => ({ scope: el.dataset.scope || 'personal', name: '', who: '', done: false }),
    meals: () => ({ day: 0, meal: 'Dinner', menu: '', who: '' }),
    rides: () => ({ driver: '', seats: '' }),
    budget: () => ({ item: '', cost: '' })
  };

  function onClick(e) {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const act = el.dataset.action, a = currentActivity();
    if (el.tagName === 'INPUT' && act !== 'toggle-leader') return;
    if (a && ['add', 'del', 'toggle-leader', 'starter-gear', 'starter-meals', 'starter-schedule', 'add-reflection'].includes(act)) touch(a);
    switch (act) {
      case 'add': {
        const item = Object.assign({ id: uid() }, DEFAULTS[el.dataset.list](el));
        a[el.dataset.list].push(item); save(); render();
        focusNew(item.id); break;
      }
      case 'del': {
        a[el.dataset.list] = a[el.dataset.list].filter((x) => x.id !== el.dataset.id); save(); render(); break;
      }
      case 'toggle-leader': {
        const id = el.dataset.id;
        a.leadersAttending = el.checked ? [...new Set([...a.leadersAttending, id])] : a.leadersAttending.filter((x) => x !== id);
        save(); render(); break;
      }
      case 'starter-schedule': starterSchedule(a); break;
      case 'starter-gear': {
        const t = D.gear[nights(a) ? 'overnight' : 'day'];
        a.gear = [...t.personal.map((name) => ({ id: uid(), scope: 'personal', name, who: '', done: false })),
          ...t.group.map((name) => ({ id: uid(), scope: 'group', name, who: '', done: false }))];
        save(); render(); break;
      }
      case 'starter-meals': {
        const n = nights(a);
        for (let d = 0; d <= n; d++) {
          const meals = d === 0 ? ['Dinner'] : d === n ? ['Breakfast', 'Lunch'] : ['Breakfast', 'Lunch', 'Dinner'];
          meals.forEach((meal) => a.meals.push({ id: uid(), day: d, meal, menu: '', who: '' }));
        }
        save(); render(); break;
      }
      case 'add-reflection': {
        const t = $('#reflect').value.trim();
        if (!t) return;
        a.reflections.unshift({ id: uid(), text: t, at: Date.now() }); save(); render(); toast('Saved'); break;
      }
      case 'add-youth': { const y = { id: uid(), name: '', org: 'YM', parentEmail: '', parentPhone: '', u: Date.now() }; S.youth.push(y); save(); render(); focusNew(y.id); break; }
      case 'add-leader': { const l = { id: uid(), name: '', gender: 'M', pcyDate: '', u: Date.now() }; S.leaders.push(l); save(); render(); focusNew(l.id); break; }
      case 'del-person': {
        const id = el.dataset.id, p = byId(S[el.dataset.list], id);
        if (!confirm(`Remove ${p.name || 'this person'} from the roster?`)) return;
        S[el.dataset.list] = S[el.dataset.list].filter((x) => x.id !== id);
        tombstone(id);
        S.activities.forEach((x) => {
          if (x.attendance[id] || x.leadersAttending.includes(id)) touch(x);
          delete x.attendance[id]; x.leadersAttending = x.leadersAttending.filter((i) => i !== id);
        });
        save(); render(); break;
      }
      case 'sync-connect': Sync.connect($('#syncurl').value.trim(), $('#synckey').value.trim()); break;
      case 'sync-now': Sync.now(true); break;
      case 'sync-off':
        if (confirm('Stop syncing this device? Your data stays on this phone and in the sheet.')) Sync.disconnect();
        break;
      case 'menu': activityMenu(a); break;
      case 'print': window.print(); break;
      case 'email-parents': emailParents(a); break;
      case 'copy-reminder': copy(reminderText(a)); break;
      case 'ics': downloadICS(a); break;
      case 'export': exportJSON(); break;
      case 'sample': loadSample(); break;
      case 'reset':
        if (confirm(Sync.on() ? "Erase this phone's copy? Your shared Google Sheet is not changed, and this phone will download it again on the next sync." : 'Erase all activities and people on this device? Export a backup first if you want to keep them.')) {
          S = blank(); saveLocal(); Sync.resetRev(); go('#/'); toast('Erased'); Sync.now();
        }
        break;
    }
  }
  function focusNew(id) {
    const el = document.querySelector(`[data-bind*="#${id}."]`);
    if (el) { el.focus({ preventScroll: true }); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  }

  function onInput(e) {
    const el = e.target;
    if (!el.dataset || !el.dataset.bind) return;
    if (el.type === 'checkbox' || el.tagName === 'SELECT') return; // handled on change
    setPath(el.dataset.bind, el.value);
  }
  function onChange(e) {
    const el = e.target;
    if (el.id === 'importfile') return importJSON(el.files[0]);
    if (!el.dataset || !el.dataset.bind) return;
    setPath(el.dataset.bind, el.type === 'checkbox' ? el.checked : el.value);
    if (el.hasAttribute('data-rerender')) { const y = window.scrollY; render(); window.scrollTo(0, y); }
  }
  function onSubmit(e) {
    if (e.target.id !== 'newform') return;
    e.preventDefault();
    const f = new FormData(e.target), p = D.places.find((x) => x.id === route.placeId);
    let start = f.get('start'), end = f.get('end') || start;
    if (end < start) end = start;
    const a = newActivity({ title: f.get('title').trim(), location: p ? p.name : (f.get('location') || '').trim(), placeId: p ? p.id : '', pass: p ? p.pass : '', start, end, who: f.get('who') });
    S.activities.push(a); save(); go(`#/a/${a.id}/why`);
  }

  function starterSchedule(a) {
    const n = nights(a), add = (day, time, what) => a.itinerary.push({ id: uid(), day, time, what });
    if (n === 0) {
      add(0, '08:00', 'Meet at the church: prayer, roll call, forms check'); add(0, '09:00', 'Arrive and safety briefing');
      add(0, '12:00', 'Lunch'); add(0, '12:45', 'Devotional moment (youth-led)'); add(0, '16:00', 'Return to the church');
    } else {
      add(0, '16:00', 'Meet at the church: prayer, roll call, forms check'); add(0, '18:00', 'Arrive, set up camp, safety briefing');
      add(0, '19:00', 'Dinner'); add(0, '20:30', 'Campfire devotional (youth-led)'); add(0, '22:00', 'Lights out');
      for (let d = 1; d < n; d++) { add(d, '07:30', 'Breakfast and morning prayer'); add(d, '09:00', 'Main activity'); add(d, '12:30', 'Lunch'); add(d, '20:30', 'Evening devotional (youth-led)'); }
      add(n, '07:30', 'Breakfast and morning devotional'); add(n, '09:00', 'Pack up; leave the site better than we found it'); add(n, '12:00', 'Return to the church');
    }
    save(); render(); toast('Starter schedule added. Edit it to fit your plan.');
  }

  function firstItem(a) { return a.itinerary.filter((x) => Number(x.day) === 0).sort((x, y) => (x.time || '').localeCompare(y.time || ''))[0]; }
  function reminderText(a) {
    const f = firstItem(a);
    return [
      `${a.title}`,
      `${dateRange(a)}${a.location ? ' at ' + a.location : ''}`,
      a.purpose ? `Why we're going: ${a.purpose}` : '',
      a.theme ? `Theme (chosen by the youth): ${a.theme}` : '',
      f && f.time ? `First: ${f.what} at ${fmtTime(f.time)}` : '',
      `Please return the permission and medical form before we go.`,
      a.gear.some((g) => g.scope === 'personal') ? `Bring: ${a.gear.filter((g) => g.scope === 'personal').map((g) => g.name).join(', ')}` : ''
    ].filter(Boolean).join('\n');
  }
  function fmtTime(t) { if (!t) return ''; const [h, m] = t.split(':').map(Number); const d = new Date(); d.setHours(h, m); return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }

  function emailParents(a) {
    const ys = eligibleYouth(a).filter((y) => ['yes', 'invited'].includes(att(a, y.id).rsvp) && y.parentEmail);
    if (!ys.length) { toast('Mark youth as Invited or Coming and add parent emails first'); return; }
    const href = `mailto:?bcc=${encodeURIComponent(ys.map((y) => y.parentEmail).join(','))}&subject=${encodeURIComponent(a.title)}&body=${encodeURIComponent(reminderText(a))}`;
    location.href = href;
  }
  function copy(text) {
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => toast('Copied. Paste into your group text.'), () => { prompt('Copy this text:', text); });
  }

  function downloadICS(a) {
    if (!a.start) { toast('Set a date first'); return; }
    const d = (s) => s.replace(/-/g, '');
    const endPlus = parseDate(a.end || a.start); endPlus.setDate(endPlus.getDate() + 1);
    const endStr = endPlus.getFullYear() + String(endPlus.getMonth() + 1).padStart(2, '0') + String(endPlus.getDate()).padStart(2, '0');
    const icsEsc = (s) => String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, (c) => '\\' + c);
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Trailhead//EN', 'BEGIN:VEVENT',
      `UID:${a.id}@trailhead`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${d(a.start)}`, `DTEND;VALUE=DATE:${endStr}`,
      `SUMMARY:${icsEsc(a.title)}`, `LOCATION:${icsEsc(a.location)}`, `DESCRIPTION:${icsEsc(reminderText(a))}`,
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Activity in 2 weeks: forms and drivers', 'TRIGGER:-P14D', 'END:VALARM',
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Activity in 3 days', 'TRIGGER:-P3D', 'END:VALARM',
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Activity tomorrow', 'TRIGGER:-P1D', 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    download(`${slug(a.title)}.ics`, ics, 'text/calendar');
  }
  const slug = (s) => (s || 'activity').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  function download(name, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const link = document.createElement('a'); link.href = url; link.download = name;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function activityMenu(a) {
    const sheet = document.createElement('div');
    sheet.className = 'sheet';
    sheet.innerHTML = `<div class="sheet-card" role="dialog" aria-label="Activity options">
      <a class="sheet-btn" href="#/a/${a.id}/sheet">Trip sheet (print or save PDF)</a>
      <button class="sheet-btn" data-choice="ics">Add to calendar</button>
      <button class="sheet-btn" data-choice="dup">Copy for another trip</button>
      <button class="sheet-btn danger" data-choice="del">Delete activity</button>
      <button class="sheet-btn cancel" data-choice="">Cancel</button></div>`;
    document.body.appendChild(sheet);
    sheet.addEventListener('click', (e) => {
      const b = e.target.closest('[data-choice], a');
      if (!b && e.target !== sheet) return;
      e.stopPropagation();
      sheet.remove();
      if (b && b.dataset.choice) menuChoice(a, b.dataset.choice);
    });
  }
  function menuChoice(a, choice) {
    if (choice === 'ics') downloadICS(a);
    else if (choice === 'dup') {
      const copyA = JSON.parse(JSON.stringify(a));
      Object.assign(copyA, { id: uid(), title: a.title + ' (copy)', start: '', end: '', purpose: '', theme: '', scriptures: '', themeBy: '', devotionals: [], attendance: {}, leadersAttending: [], reflections: [], permitsDone: false, bishopApproved: false, vehicleCheck: false, created: Date.now(), u: Date.now() });
      copyA.gear.forEach((g) => { g.done = false; g.id = uid(); });
      S.activities.push(copyA); save(); go(`#/a/${copyA.id}/why`); toast('Copied. The youth choose a new purpose and theme.');
    } else if (choice === 'del') {
      if (confirm(`Delete "${a.title}"? This can't be undone.`)) { S.activities = S.activities.filter((x) => x.id !== a.id); tombstone(a.id); save(); go('#/'); }
    }
  }

  function exportJSON() { download(`trailhead-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(S, null, 2), 'application/json'); }
  function importJSON(file) {
    if (!file) return;
    file.text().then((t) => {
      const data = JSON.parse(t);
      if (!data || !Array.isArray(data.activities)) throw new Error('bad');
      if (!confirm('Replace everything on this device with the backup?')) return;
      S = Object.assign(blank(), data);
      const now = Date.now(); // imported records count as the newest edits
      [...S.activities, ...S.youth, ...S.leaders].forEach((r) => { r.u = now; }); S.unit.u = now;
      save(); go('#/'); toast('Backup imported');
    }).catch(() => toast("That file isn't a Trailhead backup"));
  }

  function loadSample() {
    if (S.youth.length && !confirm('Add sample youth and leaders to your roster?')) return;
    const ys = [['Ethan', 'YM'], ['Caleb', 'YM'], ['Josh', 'YM'], ['Samuel', 'YM'], ['Isaac', 'YM'], ['Tyler', 'YM'], ['Ben', 'YM'], ['Mia', 'YW'], ['Grace', 'YW'], ['Ava', 'YW']];
    ys.forEach(([name, org]) => S.youth.push({ id: uid(), name, org, parentEmail: name.toLowerCase() + '.parent@example.com', parentPhone: '', u: Date.now() }));
    const ago = (y) => { const d = new Date(); d.setFullYear(d.getFullYear() - y); return d.toISOString().slice(0, 10); };
    [['Brother Allen', 'M', ago(1)], ['Brother Diaz', 'M', ago(2)], ['Sister Nguyen', 'F', ago(1)], ['Brother Park', 'M', ago(4)]]
      .forEach(([name, gender, pcyDate]) => S.leaders.push({ id: uid(), name, gender, pcyDate, u: Date.now() }));
    save(); render(); toast('Sample roster added (one leader has expired training on purpose)');
  }

  // ---------- shared Google Sheet sync ----------
  function mergeData(local, remote) {
    if (!remote) return local;
    const out = blank();
    const del = Object.assign({}, remote.deleted || {});
    Object.entries(local.deleted || {}).forEach(([id, t]) => { del[id] = Math.max(del[id] || 0, t); });
    out.deleted = del;
    ['activities', 'youth', 'leaders'].forEach((k) => {
      const map = new Map();
      (remote[k] || []).forEach((r) => map.set(r.id, r));
      (local[k] || []).forEach((l) => { const r = map.get(l.id); if (!r || (l.u || 0) >= (r.u || 0)) map.set(l.id, l); });
      out[k] = [...map.values()].filter((x) => !(del[x.id] >= (x.u || 0)));
    });
    const lu = (local.unit && local.unit.u) || 0, ru = (remote.unit && remote.unit.u) || 0;
    out.unit = lu > ru ? local.unit : remote.unit || local.unit;
    return out;
  }

  function sheetTables() {
    const yes = (b) => (b ? 'Yes' : '');
    const rsvp = { '': '', invited: 'Invited', yes: 'Coming', no: "Can't come" };
    const acts = S.activities.slice().sort((x, y) => (x.start || '').localeCompare(y.start || ''));
    return {
      Activities: [['Activity', 'Start', 'End', 'Place', 'Who', 'Purpose (youth)', 'Gospel theme (youth)', 'Scriptures', 'Ready', 'Youth coming', 'Leaders going', 'Bishop approved']]
        .concat(acts.map((a) => { const r = readiness(a); return [a.title, a.start, a.end, a.location, a.who, a.purpose, a.theme, a.scriptures, `${r.ok}/${r.total}`, String(coming(a).length), leadersGoing(a).map((l) => l.name).join(', '), yes(a.bishopApproved)]; })),
      Youth: [['Name', 'Group', 'Parent email', 'Parent phone']].concat(S.youth.map((y) => [y.name, y.org, y.parentEmail, y.parentPhone])),
      Leaders: [['Name', 'Man / Woman', 'Protecting Children and Youth training completed', 'Status']]
        .concat(S.leaders.map((l) => [l.name, l.gender === 'F' ? 'Woman' : 'Man', l.pcyDate, pcyStatus(l).label])),
      Attendance: [['Activity', 'Youth', 'RSVP', 'Invited by', 'Permission form', 'Medical form']]
        .concat(...acts.map((a) => eligibleYouth(a).filter((y) => (a.attendance[y.id] || {}).rsvp).map((y) => {
          const t = a.attendance[y.id]; return [a.title, y.name, rsvp[t.rsvp] || '', youthName(t.invitedBy), yes(t.permission), yes(t.medical)];
        })))
    };
  }

  const Sync = (function () {
    const SK = 'trailhead.sync';
    let cfg = {};
    try { cfg = JSON.parse(localStorage.getItem(SK) || '{}'); } catch (e) { cfg = {}; }
    cfg = Object.assign({ url: '', key: '', rev: 0, localVer: 0, pushedVer: 0, last: 0 }, cfg);
    let status = cfg.url ? 'idle' : 'off', message = '', busy = false, again = false, timer = null;
    const persist = () => { try { localStorage.setItem(SK, JSON.stringify(cfg)); } catch (e) { /* ignore */ } };
    const dirty = () => cfg.localVer !== cfg.pushedVer;
    const ERRORS = {
      'wrong-passcode': 'Wrong passcode.',
      'passcode-not-set': 'Set PASSCODE in the Apps Script, then deploy a new version.',
      'bad-request': 'The sheet did not understand the request.'
    };

    async function call(body) {
      const res = await fetch(cfg.url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ key: cfg.key }, body)) });
      let data;
      try { data = await res.json(); } catch (e) { throw { error: 'not-json' }; }
      return data;
    }
    function applyRemote(remote) {
      const before = JSON.stringify(S);
      S = mergeData(S, remote);
      saveLocal();
      return before !== JSON.stringify(S);
    }
    async function cycle() {
      const r = await call({ action: 'pull' });
      if (!r.ok) throw r;
      let changed = applyRemote(r.data);
      cfg.rev = r.rev;
      const localHasMore = r.data ? JSON.stringify(S) !== JSON.stringify(mergeData(blank(), r.data)) : (S.activities.length + S.youth.length + S.leaders.length > 0);
      if (dirty() || localHasMore) {
        for (let tries = 0; tries < 4; tries++) {
          const ver = cfg.localVer;
          const p = await call({ action: 'push', baseRev: cfg.rev, data: S, tables: sheetTables() });
          if (p.ok) { cfg.rev = p.rev; cfg.pushedVer = ver; break; }
          if (p.error !== 'conflict') throw p;
          changed = applyRemote(p.data) || changed; cfg.rev = p.rev;
        }
      }
      return changed;
    }
    async function now(manual) {
      if (!cfg.url) return;
      if (busy) { again = true; return; }
      busy = true; status = 'syncing'; paint();
      try {
        const changed = await cycle();
        status = 'ok'; message = ''; cfg.last = Date.now();
        if (changed) safeRender();
        if (manual) toast('Synced with Google Sheet');
      } catch (e) {
        status = navigator.onLine === false ? 'offline' : 'error';
        message = status === 'offline' ? 'No signal. Changes are saved on this phone and will sync later.'
          : (e && ERRORS[e.error]) || "Couldn't reach the sheet. Check the web app URL and that it is deployed for Anyone.";
        if (manual) toast(message);
      } finally {
        busy = false; persist(); paint();
        if (again) { again = false; now(); }
      }
    }
    function safeRender() {
      const el = document.activeElement;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) { pendingRender = true; return; }
      const y = window.scrollY; render(); window.scrollTo(0, y);
    }
    function paint() {
      document.querySelectorAll('[data-sync-status]').forEach((el) => { el.dataset.state = status; el.title = label(); });
      const box = document.getElementById('syncstatus');
      if (box) box.textContent = label();
    }
    function label() {
      if (status === 'off') return 'Not connected';
      if (status === 'syncing') return 'Syncing…';
      if (status === 'ok') return 'Synced ' + (cfg.last ? new Date(cfg.last).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '');
      if (status === 'idle') return dirty() ? 'Changes waiting to sync' : 'Connected';
      return message;
    }
    return {
      on: () => !!cfg.url,
      cfg: () => cfg,
      label, paint,
      changed() {
        cfg.localVer++; persist();
        if (!cfg.url) return;
        clearTimeout(timer); timer = setTimeout(now, 1500);
      },
      now,
      resetRev() { cfg.rev = 0; cfg.pushedVer = cfg.localVer; persist(); },
      async connect(url, key) {
        if (!/^https:\/\/script\.google(usercontent)?\.com\//.test(url)) { toast('Paste the Web app URL from Apps Script (starts with https://script.google.com/)'); return; }
        if (!key) { toast('Enter the passcode'); return; }
        Object.assign(cfg, { url, key, rev: 0 }); persist();
        await now(true);
        if (status !== 'ok') { const m = message; Object.assign(cfg, { url: '', key: '' }); status = 'off'; persist(); render(); toast(m); return; }
        render();
      },
      disconnect() { Object.assign(cfg, { url: '', key: '', rev: 0 }); status = 'off'; persist(); render(); }
    };
  })();
  let pendingRender = false;
  document.addEventListener('focusout', () => setTimeout(() => {
    if (pendingRender && !/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || '')) { pendingRender = false; const y = window.scrollY; render(); window.scrollTo(0, y); }
  }, 0));

  let toastTimer;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600); }

  // ---------- boot ----------
  document.addEventListener('click', onClick);
  document.addEventListener('input', onInput);
  document.addEventListener('change', onChange);
  document.addEventListener('submit', onSubmit);
  window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
  render();
  Sync.now();
  window.addEventListener('online', () => Sync.now());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') Sync.now(); });
  setInterval(() => { if (document.visibilityState === 'visible') Sync.now(); }, 60000);
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
  window.__trailhead = { get state() { return S; }, checks, readiness, mergeData, Sync };
})();
