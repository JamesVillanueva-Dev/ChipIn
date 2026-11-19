/* ---------- helpers ---------- */
const ICONS = {
  left: '<path d="m15 18-6-6 6-6"/>', right: '<path d="m9 18 6-6-6-6"/>', arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>', minus: '<path d="M5 12h14"/>', x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  check: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>', tick: '<path d="M20 6 9 17l-5-5"/>',
  warn: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  user: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/>',
  chip: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  pencil: '<path d="M21.2 6.8a2.8 2.8 0 0 0-4-4L3.8 16.2a2 2 0 0 0-.5.8l-1.3 4.4a.5.5 0 0 0 .6.6l4.4-1.3a2 2 0 0 0 .8-.5z"/>',
  ext: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>'
};
const icon = (name, size = 18, color = 'currentColor') =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

const money = cents => '$' + (cents / 100).toFixed(2);
const short = cents => cents % 100 ? money(cents) : '$' + cents / 100;
const clean = text => String(text).replace(/[<>&"]/g, '').trim();
const clone = obj => JSON.parse(JSON.stringify(obj));
const newId = () => Math.random().toString(36).slice(2, 8);
const isLight = hex => { const n = parseInt(hex.slice(1), 16); return ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 > 150; };
const chip = (c, cls = '') => `<span class="chip ${cls}" style="--c:${c.color};--ring:${isLight(c.color) ? '#3A3A3A' : '#FFFFFF'}"></span>`;
const avatar = p => `<span class="av" style="--c:${p.color}" aria-hidden="true">${p.init}</span>`;
const initials = name => { const w = name.split(/\s+/); return (w.length > 1 ? w[0][0] + w[1][0] : name.slice(0, 2)).toUpperCase(); };

/* ---------- game data ---------- */
const PLAYER_COLORS = ['#E8A33D', '#4C9BE8', '#B07CE8', '#E86FA3', '#5CC489', '#E8D24C', '#4CD3D3', '#F08A5D'];
const DEFAULT_CHIPS = [
  { id: 'w', name: 'White', color: '#FFFFFF', value: 10 },
  { id: 'r', name: 'Red', color: '#DC2F3C', value: 25 },
  { id: 'g', name: 'Green', color: '#3A9D5D', value: 100 },
  { id: 'b', name: 'Black', color: '#121212', value: 500 }
];
const MIXES = { 500: { w: 10, r: 4, g: 3 }, 1000: { w: 10, r: 4, g: 3, b: 1 }, 2000: { w: 10, r: 4, g: 3, b: 3 } };

const worth = (g, counts) => g.chips.reduce((sum, c) => sum + (counts[c.id] || 0) * c.value, 0);
const chipTotal = counts => Object.values(counts).reduce((a, b) => a + b, 0);
const chipCount = counts => { const n = chipTotal(counts); return n === 1 ? '1 chip' : `${n} chips`; };
const paidIn = (g, id) => g.ledger[id].reduce((sum, e) => sum + e.amount, 0);
const pot = g => g.players.reduce((sum, p) => sum + paidIn(g, p.id), 0);
const counted = g => g.players.reduce((sum, p) => sum + (g.counts[p.id] ? worth(g, g.counts[p.id]) : 0), 0);
const allCounted = g => g.players.every(p => g.counts[p.id]);
const player = (g, id) => g.players.find(p => p.id === id);
const banker = g => player(g, g.banker);
const flagged = g => (g.flag && !g.touched[g.flag] && allCounted(g) && counted(g) !== pot(g)) ? g.flag : null;

function makePlayer(name, index, init) {
  return { id: newId(), name, init: init || initials(name), venmo: '@' + name.toLowerCase().replace(/\s+/g, '-'), color: PLAYER_COLORS[index % PLAYER_COLORS.length] };
}
function makeGame({ name, buyIn, names, bankerName, started, date }) {
  const players = names.map((n, i) => makePlayer(n, i));
  const g = {
    id: newId(), name, date, started, buyIn, status: 'live',
    chips: clone(DEFAULT_CHIPS), mix: { ...MIXES[buyIn] },
    players, banker: players.find(p => p.name === bankerName).id,
    ledger: {}, counts: null, touched: {}, paid: {}, flag: null, preset: null
  };
  players.forEach(p => g.ledger[p.id] = [{ type: 'Buy-in', amount: buyIn, chips: { ...g.mix } }]);
  return g;
}
function studyGame() {
  const g = makeGame({ name: 'Friday game', buyIn: 1000, date: 'Nov 1', started: '10:27 pm',
    names: ['Diego', 'Kayla', 'Sam', 'Marcus', 'Alex', 'Jordan'], bankerName: 'Marcus' });
  ['DR', 'KL', 'SM', 'MA', 'AJ', 'JT'].forEach((init, i) => g.players[i].init = init);
  const ids = Object.fromEntries(g.players.map(p => [p.name, p.id]));
  // Final chip counts. Jordan is one green short on purpose ($69 counted vs $70 pot).
  g.preset = {
    [ids.Diego]: { w: 5, r: 4, g: 5, b: 1 }, [ids.Kayla]: { w: 5, r: 4, g: 2, b: 3 }, [ids.Sam]: { w: 10, r: 0, g: 0, b: 1 },
    [ids.Marcus]: { w: 10, r: 4, g: 2, b: 2 }, [ids.Alex]: { w: 10, r: 4, g: 3, b: 1 }, [ids.Jordan]: { w: 10, r: 4, g: 2, b: 1 }
  };
  g.flag = ids.Jordan;
  return g;
}

/* ---------- state ---------- */
const app = document.getElementById('app');
let S, startTime, logLines, toastTimer, lastSheet = null, lastScreen = null;
function reset() {
  S = { games: [studyGame()], gi: 0, screen: 'live', sheet: null, draft: null, q: '', err: '', toast: null, rebuy: null, count: null, payId: null, playerId: null, lastRebuy: null };
  startTime = Date.now(); logLines = []; clearTimeout(toastTimer); lastScreen = null;
}
const G = () => S.games[S.gi];

function log(text, miss = false) {
  const s = Math.floor((Date.now() - startTime) / 1000);
  logLines.push({ time: `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`, text, miss });
  const el = document.getElementById('log');
  el.innerHTML = logLines.map(l => `<li><time>${l.time}</time><span class="${l.miss ? 'miss' : ''}">${l.text}</span></li>`).join('');
  el.scrollTop = el.scrollHeight;
}
function toast(text, undo) {
  clearTimeout(toastTimer);
  S.toast = { text, undo };
  toastTimer = setTimeout(() => { S.toast = null; render(); }, 6000);
}

/* ---------- screens ---------- */
function homeScreen() {
  const label = { live: 'Playing now', cashout: 'Cashing out', results: 'Paying out', done: 'Finished' };
  const rows = S.games.map((g, i) => `
    <li><button class="row" data-do="open" data-i="${i}">
      <span class="grow"><strong>${g.name}</strong><small>${label[g.status]} · ${g.players.length} players · ${money(pot(g))} pot</small></span>
      ${icon('right', 16, 'rgba(255,255,255,.5)')}
    </button></li>`).join('');
  return `<div class="screen">
    <main>
      <header class="top"><span></span><button class="icon" data-do="help" aria-label="How ChipIn works">${icon('help', 18)}</button></header>
      <div><h1>ChipIn</h1><p class="meta">Keeps track of the money at poker night</p></div>
      <section aria-labelledby="games-h"><h2 class="label label-row" id="games-h">Your games</h2><ul class="list">${rows}</ul></section>
    </main>
    <footer><button class="primary" data-do="newgame">New game</button></footer>
  </div>`;
}

function setupScreen() {
  const d = S.draft;
  const names = d.names.map((n, i) => `<li class="row"><span class="grow"><strong>${n}</strong></span><button type="button" class="x" data-do="dropname" data-i="${i}" aria-label="Remove ${n}">${icon('x', 14)}</button></li>`).join('');
  return `<div class="screen">
    <main>
      <header class="top"><button class="back" data-do="home">${icon('left')}Games</button></header>
      <h1>New game</h1>
      <form id="setup" class="form" data-submit="startgame">
        <label class="field">Game name <input id="g-name" data-bind="draft.name" value="${d.name}" required></label>
        <label class="field">Buy-in
          <select id="g-buyin" data-bind="draft.buyIn">${[500, 1000, 2000].map(v => `<option value="${v}" ${+d.buyIn === v ? 'selected' : ''}>${short(v)}</option>`).join('')}</select>
        </label>
        <fieldset class="field"><legend>Players</legend>
          <ul class="list" style="margin:6px 0 8px">${names}</ul>
          <div class="addrow"><input id="g-player" placeholder="Name" aria-label="New player name"><button type="button" class="secondary sm" data-do="addname">Add</button></div>
        </fieldset>
        <label class="field">Banker (holds the money)
          <select id="g-banker" data-bind="draft.banker">${d.names.map(n => `<option ${d.banker === n ? 'selected' : ''}>${n}</option>`).join('') || '<option value="">Add players first</option>'}</select>
        </label>
        <p class="err" role="alert">${S.err}</p>
      </form>
    </main>
    <footer><button class="primary" type="submit" form="setup">Start game</button></footer>
  </div>`;
}

function liveScreen() {
  const g = G();
  const rows = g.players.map(p => {
    const tags = g.ledger[p.id].map(e => `<span class="tag">${e.type} ${short(e.amount)} ${g.chips.filter(c => e.chips[c.id]).map(c => chip(c, 'dot')).join('')}</span>`).join('');
    return `<li><button class="row ${S.lastRebuy === p.id ? 'hl' : ''}" data-do="player" data-id="${p.id}">
      ${avatar(p)}
      <span class="grow"><strong>${p.name}${p.id === g.banker ? ' <small>· Banker</small>' : ''}</strong><span class="tags">${tags}</span></span>
      <span class="amt">${short(paidIn(g, p.id))}</span>${icon('right', 16, 'rgba(255,255,255,.5)')}
    </button></li>`;
  }).join('');
  return `<div class="screen">
    <main>
      <header class="top">
        <button class="back" data-do="home">${icon('left')}Games</button>
        <nav aria-label="Game tools">
          <button class="icon" data-do="help" aria-label="How ChipIn works">${icon('help', 18)}</button>
          <button class="icon" data-do="addplayer" aria-label="Add a player">${icon('user', 17)}</button>
        </nav>
      </header>
      <div><h1>${g.name}</h1><p class="meta">${banker(g).name} is the banker · ${short(g.buyIn)} buy-in · started ${g.started}</p></div>
      <section class="card" aria-label="Pot">
        <p class="muted" style="font-size:14px">In the pot</p>
        <p class="potnum">${money(pot(g))}</p>
        <div class="two">
          <button class="outline sm" data-do="rebuy">Add a rebuy</button>
          <button class="secondary sm" data-do="values">Chip values</button>
        </div>
      </section>
      <section aria-labelledby="players-h">
        <div class="label-row"><h2 class="label" id="players-h">Players</h2><span>${g.players.length}</span></div>
        <ul class="list">${rows}</ul>
      </section>
    </main>
    <footer><button class="primary" data-do="cashout">Cash out ${icon('arrow')}</button></footer>
  </div>`;
}

function cashScreen() {
  const g = G(), c = counted(g), p = pot(g), diff = c - p, f = flagged(g), n = g.players.filter(pl => g.counts[pl.id]).length;
  let banner;
  if (!allCounted(g)) banner = `<div class="banner info">${icon('chip', 22)}<span><strong>Still counting</strong><small>Totals get checked once everyone's in.</small></span></div>`;
  else if (diff === 0) banner = `<div class="banner good" role="status">${icon('check', 22, 'var(--teal)')}<span><strong>Totals match</strong><small>Everyone's chips add up to the pot.</small></span></div>`;
  else banner = `<button class="banner bad" data-do="banner">${icon('warn', 22, 'var(--red)')}<span><strong>Total is ${money(Math.abs(diff))} ${diff < 0 ? 'short' : 'over'}</strong><small>${f ? `${player(g, f).name}'s count looks low.` : 'Someone needs a recount.'}</small></span>${icon('right', 16)}</button>`;
  const rows = g.players.map(pl => `<li class="row">
      ${avatar(pl)}<span class="grow"><strong>${pl.name} ${f === pl.id ? icon('warn', 14, 'var(--red)') : ''}</strong></span>
      <button class="box ${f === pl.id ? 'flag' : ''} ${g.counts[pl.id] ? '' : 'empty'}" data-do="count" data-id="${pl.id}" aria-label="Count ${pl.name}'s chips">${g.counts[pl.id] ? money(worth(g, g.counts[pl.id])) : 'Count'}</button>
    </li>`).join('');
  const ready = allCounted(g) && diff === 0;
  return `<div class="screen">
    <main>
      <header class="top"><button class="back" data-do="tolive">${icon('left')}Live game</button></header>
      <div><h1>Cash out</h1><p class="meta">Count everyone's chips by color</p></div>
      <section class="card" aria-label="Totals">
        <div class="split">
          <div><p class="muted" style="font-size:13px">Counted so far</p><p class="amt" style="font-size:24px">${money(c)}</p></div>
          <div style="text-align:right"><p class="muted" style="font-size:13px">In the pot</p><p class="amt" style="font-size:24px">${money(p)}</p></div>
        </div>
        <progress max="${p}" value="${Math.min(c, p)}" aria-label="Counted so far"></progress>
      </section>
      ${banner}
      <section aria-labelledby="counts-h">
        <div class="label-row"><h2 class="label" id="counts-h">Final counts</h2><span>${n} of ${g.players.length} counted</span></div>
        <ul class="list">${rows}</ul>
      </section>
    </main>
    <footer><button class="primary" data-do="results" ${ready ? '' : 'aria-disabled="true"'}>See results</button></footer>
  </div>`;
}

function resultsScreen() {
  const g = G(), others = g.players.filter(p => p.id !== g.banker), n = others.filter(p => g.paid[p.id]).length;
  const rows = others.map(p => {
    const value = worth(g, g.counts[p.id]), net = value - paidIn(g, p.id);
    const how = net === 0 ? 'Even' : (net > 0 ? 'Up ' : 'Down ') + money(Math.abs(net));
    const action = g.paid[p.id] ? `<span class="paid">Paid</span>` : `<button class="pay" data-do="pay" data-id="${p.id}">Pay</button>`;
    return `<li class="row">${avatar(p)}<span class="grow"><strong>${p.name}</strong><small>${how}</small></span><span class="amt">${money(value)}</span>${action}</li>`;
  }).join('');
  const b = banker(g);
  return `<div class="screen">
    <main>
      <header class="top"><button class="back" data-do="tocash">${icon('left')}Cash out</button><button class="icon" data-do="help" aria-label="How payouts work">${icon('help', 18)}</button></header>
      <div><h1>Results</h1><p class="meta">${g.name} · ${g.date} · ${b.name} is the banker</p></div>
      <div class="banner good">${icon('check', 22, 'var(--teal)')}<span><strong>Everything adds up</strong><small>${money(pot(g))} in · ${money(counted(g))} out</small></span></div>
      <section aria-labelledby="pay-h">
        <div class="label-row"><h2 class="label" id="pay-h">${b.name} pays out</h2><span>${n} of ${others.length} paid</span></div>
        <ul class="list">${rows}
          <li class="row">${avatar(b)}<span class="grow"><strong class="muted">${b.name} (you) keeps</strong></span><span class="amt muted">${money(worth(g, g.counts[b.id]))}</span></li>
        </ul>
      </section>
      <button class="link" data-do="help">How do payouts work?</button>
    </main>
    <footer><button class="primary" data-do="done">Done</button></footer>
  </div>`;
}

function venmoScreen() {
  const g = G(), p = player(g, S.payId), value = worth(g, g.counts[p.id]);
  return `<div class="venmo">
    <header>Venmo<p>Pretend Venmo for this test. No real money moves.</p></header>
    <main>
      <section><p style="font-size:13px;color:#666">Pay ${p.venmo}</p><p class="big">${money(value)}</p><p style="font-size:14px;color:#444">ChipIn · ${g.name}</p></section>
      <button class="vbtn" data-do="vpay">Pay ${money(value)}</button>
      <button class="vbtn ghost" data-do="vcancel">Cancel</button>
    </main>
  </div>`;
}

/* ---------- sheets ---------- */
const sheetHead = (title, sub = '') => `<header class="sheet-head"><div><h2 id="sheet-title">${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div><button class="x" data-do="close" aria-label="Close">${icon('x', 16)}</button></header>`;
const tokens = (g, mix) => `<span class="tokens">${g.chips.filter(c => mix[c.id]).map(c => `<span class="token">${chip(c, 'dot')} ×${mix[c.id]}</span>`).join('')}</span>`;
const stepRow = (c, n, action, highlight) => `<li class="crow ${highlight && n ? 'on' : ''}">
    ${chip(c)}<span class="grow"><strong>${c.name} chips</strong><small>${money(c.value)} each</small></span>
    <span class="step">
      <button data-do="${action}-" data-k="${c.id}" aria-label="One less ${c.name}">${icon('minus', 14)}</button>
      <output aria-label="${c.name} chips">${n}</output>
      <button data-do="${action}+" data-k="${c.id}" aria-label="One more ${c.name}">${icon('plus', 14)}</button>
    </span></li>`;

const SHEETS = {
  values() {
    const g = G();
    return sheetHead('Chip values', `${banker(g).name} set these for this game`) +
      `<ul class="list">${g.chips.map(c => `<li class="crow" style="padding:13px 14px">${chip(c)}<span class="grow"><strong>${c.name} chip</strong></span><span class="amt">${money(c.value)}</span></li>`).join('')}</ul>
      <div class="panel"><p class="muted" style="font-size:13px">A ${short(g.buyIn)} buy-in gets you</p>${tokens(g, g.mix)}</div>
      <button class="secondary" data-do="editvalues">Edit values</button>`;
  },
  edit() {
    const d = S.draft;
    const rows = d.chips.map((c, i) => `<li class="editrow">
        <input type="color" id="c-color-${i}" value="${c.color}" data-bind="draft.chips.${i}.color" aria-label="Chip ${i + 1} color">
        <input id="c-name-${i}" value="${c.name}" data-bind="draft.chips.${i}.name" aria-label="Chip ${i + 1} name">
        <input id="c-value-${i}" value="${c.dollars}" inputmode="decimal" data-bind="draft.chips.${i}.dollars" aria-label="Chip ${i + 1} value in dollars">
        <input id="c-mix-${i}" type="number" min="0" value="${d.mix[c.id] || 0}" data-bind="draft.mix.${c.id}" aria-label="Chip ${i + 1} count per buy-in">
        <button type="button" class="x" data-do="dropchip" data-i="${i}" aria-label="Remove chip ${i + 1}">${icon('x', 14)}</button>
      </li>`).join('');
    return sheetHead('Edit chip values', 'Only changes this game') +
      `<form class="form" id="chipform" data-submit="savechips">
        <div class="cols" aria-hidden="true"><span>Color</span><span>Name</span><span>Value ($)</span><span>Per buy-in</span></div>
        <ul class="list">${rows}</ul>
        <button type="button" class="link" data-do="addchip">+ Add a chip</button>
        <p class="err" role="alert">${S.err}</p>
        <button class="primary" type="submit">Save</button>
      </form>`;
  },
  rebuy() {
    const g = G(), r = S.rebuy, p = r.pid && player(g, r.pid);
    const amount = r.mode === 'standard' ? g.buyIn : worth(g, r.sel);
    let picker;
    if (g.players.length <= 6) {
      picker = `<div class="tiles" role="group" aria-label="Player">${g.players.map(pl => `<button class="tile" data-do="pick" data-id="${pl.id}" aria-pressed="${r.pid === pl.id}">${avatar(pl)}${pl.name}</button>`).join('')}</div>`;
    } else {
      const q = S.q.toLowerCase(), list = g.players.filter(pl => pl.name.toLowerCase().includes(q));
      picker = `<input type="search" id="rb-search" placeholder="Find a player" aria-label="Find a player" value="${S.q}" data-bind="q" data-live>
        <ul class="list picklist" role="group" aria-label="Player">${list.map(pl => `<li><button class="row" data-do="pick" data-id="${pl.id}" aria-pressed="${r.pid === pl.id}">${avatar(pl)}<span class="grow"><strong>${pl.name}</strong></span></button></li>`).join('') || '<li class="muted">No one by that name.</li>'}</ul>`;
    }
    const seg = `<div class="seg" role="group" aria-label="Chip mix">
      <button data-do="mode" data-m="standard" aria-pressed="${r.mode === 'standard'}">Standard mix</button>
      <button data-do="mode" data-m="choose" aria-pressed="${r.mode === 'choose'}">Choose chips</button></div>`;
    const body = r.mode === 'standard'
      ? `<div class="panel"><p class="muted" style="font-size:13px">One ${short(g.buyIn)} buy-in</p>${tokens(g, g.mix)}</div>`
      : `<ul class="list">${g.chips.map(c => stepRow(c, r.sel[c.id] || 0, 'rb', true)).join('')}</ul>
         <p class="split" style="font-size:14px"><span class="muted">${chipCount(r.sel)}</span><strong>Total ${money(worth(g, r.sel))}</strong></p>`;
    const ok = p && amount > 0;
    const button = ok
      ? `<button class="primary" data-do="addrebuy">Add ${short(amount)} rebuy for ${p.name}</button>`
      : `<button class="primary" data-do="addrebuy" aria-disabled="true">${p ? 'Add some chips first' : 'Pick a player first'}</button>`;
    return sheetHead('Add a rebuy', "Who's buying back in?") + picker + seg + body + button;
  },
  player() {
    const g = G(), p = player(g, S.playerId);
    const lines = g.ledger[p.id].map(e => `<div><dt>${e.type}</dt><dd><span class="tokens" style="margin:0;gap:6px;display:inline-flex">${g.chips.filter(c => e.chips[c.id]).map(c => chip(c, 'dot')).join('')}</span> ${short(e.amount)}</dd></div>`).join('');
    return sheetHead(p.name, (p.id === g.banker ? 'Banker · ' : '') + p.venmo) +
      `<dl class="details">${lines}<div style="border-top:1px solid var(--line)"><dt><strong style="color:var(--fg)">Total in</strong></dt><dd class="amt">${short(paidIn(g, p.id))}</dd></div></dl>
      <button class="primary" data-do="rebuyfor" data-id="${p.id}">Add a rebuy for ${p.name}</button>`;
  },
  addplayer() {
    const g = G();
    return sheetHead('Add a player', `They'll start with a ${short(g.buyIn)} buy-in`) +
      `<form class="form" id="addform" data-submit="saveplayer">
        <label class="field">Name <input id="p-name" data-bind="draft.name" value="${S.draft.name}" required autocomplete="off"></label>
        <label class="field">Venmo (optional)<input id="p-venmo" data-bind="draft.venmo" value="${S.draft.venmo}" placeholder="@username" autocomplete="off"></label>
        <p class="err" role="alert">${S.err}</p>
        <button class="primary" type="submit">Add player</button>
      </form>`;
  },
  count() {
    const g = G(), p = player(g, S.count.pid), sel = S.count.sel;
    return sheetHead(`Count ${p.name}'s chips`) +
      `<ul class="list">${g.chips.map(c => stepRow(c, sel[c.id] || 0, 'ct', false)).join('')}</ul>
      <div class="split"><div><p>${p.name}'s total</p><p class="muted" style="font-size:13px">${chipCount(sel)}</p></div><p class="big">${money(worth(g, sel))}</p></div>
      <button class="primary" data-do="savecount">Save ${money(worth(g, sel))} for ${p.name}</button>`;
  },
  pay() {
    const g = G(), p = player(g, S.payId);
    return sheetHead(`Pay ${p.name}`, 'What their chips are worth') +
      `<p class="big">${money(worth(g, g.counts[p.id]))}</p>
      <dl class="details">
        <div><dt>To</dt><dd>${p.venmo} on Venmo</dd></div>
        <div><dt>From</dt><dd>${banker(g).name} (you)</dd></div>
        <div><dt>Note</dt><dd>ChipIn · ${g.name}</dd></div>
      </dl>
      <button class="primary" data-do="venmo">Open Venmo</button>`;
  },
  help() {
    return sheetHead('How ChipIn works') +
      `<ol class="steps">
        <li><strong>Buy in.</strong> Everyone pays the banker the same amount and gets the same chips.</li>
        <li><strong>Rebuy if you run out.</strong> Log it here so the pot stays right.</li>
        <li><strong>Count by color.</strong> At the end, put in how many of each chip you've got. ChipIn does the math.</li>
        <li><strong>Banker pays out.</strong> Everyone gets what their chips are worth. "Up" or "Down" is how you did vs. what you put in.</li>
      </ol>
      <h3>New to poker?</h3>
      <dl class="gloss">
        <dt>Buy-in</dt><dd>The money you pay to get chips.</dd>
        <dt>Rebuy</dt><dd>Buying more chips after you run out.</dd>
        <dt>Stack</dt><dd>The chips in front of you.</dd>
        <dt>Banker</dt><dd>Holds the money and pays everyone at the end.</dd>
      </dl>`;
  }
};

/* ---------- render ---------- */
function render() {
  const focused = document.activeElement && document.activeElement.id;
  // On a phone the screen scrolls, so keep the scroll spot when only part of it changes.
  const mainTop = S.screen === lastScreen ? app.querySelector('.screen > main')?.scrollTop : 0;
  const sheetTop = S.sheet && S.sheet === lastSheet ? app.querySelector('.sheet')?.scrollTop : 0;
  const screens = { home: homeScreen, setup: setupScreen, live: liveScreen, cashout: cashScreen, results: resultsScreen, venmo: venmoScreen };
  let html = screens[S.screen]();
  if (S.toast && S.screen !== 'venmo') {
    html += `<div class="toast" role="status">${icon('check', 18)}<span>${S.toast.text}</span>${S.toast.undo ? '<button data-do="undo">Undo</button>' : ''}</div>`;
  }
  if (S.sheet) {
    html += `<div class="scrim" data-do="close"></div>
      <dialog open class="sheet ${S.sheet !== lastSheet ? 'anim' : ''}" aria-labelledby="sheet-title">${SHEETS[S.sheet]()}</dialog>`;
  }
  lastSheet = S.sheet; lastScreen = S.screen;
  app.innerHTML = html;
  if (mainTop) app.querySelector('.screen > main').scrollTop = mainTop;
  if (sheetTop) app.querySelector('.sheet').scrollTop = sheetTop;
  // Match the phone's status bar to the screen (blue for the pretend Venmo).
  document.querySelector('meta[name="theme-color"]').content = S.screen === 'venmo' ? '#3D95CE' : '#121212';
  const el = focused && document.getElementById(focused);
  if (el) { el.focus(); try { el.setSelectionRange(el.value.length, el.value.length); } catch (e) {} }
}

/* ---------- actions ---------- */
function act(name, data) {
  const g = G();
  const who = id => player(g, id).name;
  S.err = '';
  switch (name) {
    // games
    case 'home': S.screen = 'home'; S.sheet = null; log('Went to Games'); break;
    case 'open': S.gi = +data.i; S.screen = { live: 'live', cashout: 'cashout', results: 'results', done: 'results' }[G().status]; log(`Opened ${G().name}`); break;
    case 'newgame': S.draft = { name: `Game ${S.games.length + 1}`, buyIn: 1000, names: [], banker: '' }; S.screen = 'setup'; log('Started a new game setup'); break;
    case 'addname': {
      const input = document.getElementById('g-player'), n = clean(input.value);
      if (!n) break;
      if (S.draft.names.includes(n)) { S.err = `${n}'s already in.`; break; }
      S.draft.names.push(n); if (!S.draft.banker) S.draft.banker = n; log(`Setup: added ${n}`); break;
    }
    case 'dropname': {
      const [n] = S.draft.names.splice(+data.i, 1);
      if (S.draft.banker === n) S.draft.banker = S.draft.names[0] || '';
      break;
    }
    case 'startgame': {
      const d = S.draft;
      if (d.names.length < 2) { S.err = 'You need at least 2 players.'; break; }
      const now = new Date();
      S.games.push(makeGame({ name: clean(d.name) || 'New game', buyIn: +d.buyIn, names: d.names, bankerName: d.banker,
        started: now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase(),
        date: now.toLocaleDateString([], { month: 'short', day: 'numeric' }) }));
      S.gi = S.games.length - 1; S.screen = 'live'; log(`Started ${G().name} with ${d.names.length} players`); break;
    }

    // live game
    case 'values': S.sheet = 'values'; log('Opened Chip values'); break;
    case 'editvalues':
      S.draft = { chips: g.chips.map(c => ({ ...c, dollars: (c.value / 100).toFixed(2) })), mix: { ...g.mix } };
      S.sheet = 'edit'; log('Opened Edit chip values'); break;
    case 'addchip': S.draft.chips.push({ id: newId(), name: 'Blue', color: '#4C9BE8', dollars: '0.50' }); break;
    case 'dropchip': if (S.draft.chips.length > 1) S.draft.chips.splice(+data.i, 1); break;
    case 'savechips': {
      const chips = S.draft.chips.map(c => ({ id: c.id, name: clean(c.name) || 'Chip', color: c.color, value: Math.round(parseFloat(c.dollars) * 100) }));
      if (chips.some(c => !(c.value > 0))) { S.err = 'Every chip needs a value over $0.'; break; }
      const mix = {};
      chips.forEach(c => { const n = parseInt(S.draft.mix[c.id]) || 0; if (n > 0) mix[c.id] = n; });
      const mixValue = chips.reduce((sum, c) => sum + (mix[c.id] || 0) * c.value, 0);
      if (mixValue !== g.buyIn) { S.err = `Buy-in chips add up to ${money(mixValue)}. They need to make ${money(g.buyIn)}.`; break; }
      g.chips = chips; g.mix = mix; S.sheet = 'values'; log('Saved new chip values'); break;
    }
    case 'rebuy': S.rebuy = { pid: null, mode: 'standard', sel: {} }; S.q = ''; S.sheet = 'rebuy'; log('Opened Add a rebuy'); break;
    case 'rebuyfor': S.rebuy = { pid: data.id, mode: 'standard', sel: {} }; S.q = ''; S.sheet = 'rebuy'; log(`Opened rebuy from ${who(data.id)}'s details`); break;
    case 'pick': S.rebuy.pid = data.id; log(`Rebuy: picked ${who(data.id)}`); break;
    case 'mode': S.rebuy.mode = data.m; log(`Rebuy: ${data.m === 'choose' ? 'Choose chips' : 'Standard mix'}`); break;
    case 'rb+': case 'rb-': {
      const sel = S.rebuy.sel, n = Math.max(0, (sel[data.k] || 0) + (name === 'rb+' ? 1 : -1));
      sel[data.k] = n; log(`Rebuy: ${g.chips.find(c => c.id === data.k).name.toLowerCase()} → ${n}`); break;
    }
    case 'addrebuy': {
      const r = S.rebuy, chips = r.mode === 'standard' ? { ...g.mix } : { ...r.sel };
      const entry = { type: 'Rebuy', amount: worth(g, chips), chips };
      g.ledger[r.pid].push(entry); S.lastRebuy = r.pid; S.sheet = null;
      log(`Logged ${short(entry.amount)} rebuy for ${who(r.pid)} (${r.mode === 'choose' ? 'chose chips' : 'standard mix'})`);
      toast(`${who(r.pid)} rebought ${short(entry.amount)}`, () => {
        g.ledger[r.pid] = g.ledger[r.pid].filter(e => e !== entry); S.lastRebuy = null; log(`Undid rebuy for ${who(r.pid)}`);
      });
      break;
    }
    case 'player': S.playerId = data.id; S.sheet = 'player'; log(`Opened ${who(data.id)}'s details`); break;
    case 'addplayer': S.draft = { name: '', venmo: '' }; S.sheet = 'addplayer'; log('Opened Add a player'); break;
    case 'saveplayer': {
      const n = clean(S.draft.name);
      if (!n) { S.err = 'Add a name first.'; break; }
      const p = makePlayer(n, g.players.length);
      if (clean(S.draft.venmo)) p.venmo = '@' + clean(S.draft.venmo).replace(/^@/, '');
      g.players.push(p); g.ledger[p.id] = [{ type: 'Buy-in', amount: g.buyIn, chips: { ...g.mix } }];
      if (g.counts) g.counts[p.id] = null;
      S.sheet = null; log(`Added player ${n}`);
      toast(`${n} is in for ${short(g.buyIn)}`, () => {
        g.players = g.players.filter(x => x !== p); delete g.ledger[p.id]; log(`Undid adding ${n}`);
      });
      break;
    }

    // cash out
    case 'cashout':
      if (!g.counts) { g.counts = {}; g.players.forEach(p => g.counts[p.id] = g.preset && g.preset[p.id] ? { ...g.preset[p.id] } : null); }
      g.status = 'cashout'; S.screen = 'cashout'; S.toast = null; log('Went to Cash out'); break;
    case 'tolive': g.status = 'live'; S.screen = 'live'; log('Back to Live game'); break;
    case 'tocash': S.screen = 'cashout'; log('Back to Cash out'); break;
    case 'banner': {
      log('Tapped the red banner');
      const f = flagged(g);
      if (f) { S.count = { pid: f, sel: { ...g.counts[f] } }; S.sheet = 'count'; }
      break;
    }
    case 'count': S.count = { pid: data.id, sel: { ...(g.counts[data.id] || {}) } }; S.sheet = 'count'; log(`Opened count for ${who(data.id)}`); break;
    case 'ct+': case 'ct-': {
      const sel = S.count.sel, n = Math.max(0, (sel[data.k] || 0) + (name === 'ct+' ? 1 : -1));
      sel[data.k] = n; log(`Count ${who(S.count.pid)}: ${g.chips.find(c => c.id === data.k).name.toLowerCase()} → ${n}`); break;
    }
    case 'savecount': {
      const id = S.count.pid;
      g.counts[id] = S.count.sel; g.touched[id] = true; S.sheet = null;
      log(`Saved ${money(worth(g, g.counts[id]))} for ${who(id)} (counted ${money(counted(g))} of ${money(pot(g))})`); break;
    }
    case 'results': g.status = 'results'; S.screen = 'results'; log('Went to Results'); break;

    // results
    case 'pay': S.payId = data.id; S.sheet = 'pay'; log(`Tapped Pay for ${who(data.id)}`); break;
    case 'venmo': S.sheet = null; S.screen = 'venmo'; log(`Opened Venmo for ${who(S.payId)}`); break;
    case 'vpay': case 'vcancel': {
      const id = S.payId, value = worth(g, g.counts[id]);
      g.paid[id] = true; S.screen = 'results';
      log(`${name === 'vpay' ? 'Paid' : 'CANCELED'} in Venmo, came back. ${who(id)} marked Paid`, name === 'vcancel');
      toast(`You paid ${who(id)} ${money(value)}`, () => { delete g.paid[id]; log(`Undid payment for ${who(id)}`); });
      break;
    }
    case 'done': g.status = 'done'; S.screen = 'home'; log('Tapped Done'); toast(`${g.name} is done`); break;

    // shared
    case 'help': S.sheet = 'help'; log('Opened How ChipIn works'); break;
    case 'close': log(`Closed ${S.sheet}`); S.sheet = null; break;
    case 'undo': { const undo = S.toast && S.toast.undo; S.toast = null; clearTimeout(toastTimer); if (undo) undo(); break; }
  }
  render();
}

/* ---------- events ---------- */
app.addEventListener('click', e => {
  const el = e.target.closest('[data-do]');
  if (!el) return;
  e.preventDefault();
  if (el.getAttribute('aria-disabled') === 'true') { log(`Tapped gray button: "${el.textContent.trim()}"`, true); return; }
  act(el.dataset.do, el.dataset);
});
app.addEventListener('submit', e => { e.preventDefault(); act(e.target.dataset.submit, {}); });
app.addEventListener('input', e => {
  const path = e.target.dataset.bind;
  if (!path) return;
  const keys = path.split('.'), last = keys.pop();
  keys.reduce((obj, k) => obj[k], S)[last] = e.target.value;
  if ('live' in e.target.dataset) render();
});
app.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.id === 'g-player') { e.preventDefault(); act('addname', {}); }
  if (e.key === 'Escape' && S.sheet) act('close', {});
});
document.getElementById('reset').onclick = () => { reset(); render(); log('Reset for a new participant'); showStudy(false); };
document.getElementById('copy').onclick = async () => {
  const btn = document.getElementById('copy');
  try { await navigator.clipboard.writeText(logLines.map(l => `${l.time}  ${l.text}`).join('\n')); btn.textContent = 'Copied'; }
  catch (err) { const range = document.createRange(); range.selectNodeContents(document.getElementById('log')); getSelection().removeAllRanges(); getSelection().addRange(range); btn.textContent = 'Selected, press Ctrl+C'; }
  setTimeout(() => btn.textContent = 'Copy log', 2000);
};

/* ---------- study panel on phones ----------
   On a phone the panel is hidden so the participant only sees the app.
   The moderator opens it by holding two fingers on the screen (or Alt+M with a keyboard). */
const study = document.getElementById('study');
function showStudy(open) {
  study.classList.toggle('open', open);
  if (open) document.getElementById('study-close').focus();
}
document.getElementById('study-close').onclick = () => showStudy(false);

let hold = null;
const cancelHold = () => { if (hold) clearTimeout(hold.timer); hold = null; };
// This listener also turns on :active press styles in iOS Safari.
document.addEventListener('touchstart', e => {
  cancelHold();
  if (e.touches.length !== 2) return;
  const start = new Map([...e.touches].map(t => [t.identifier, [t.clientX, t.clientY]]));
  hold = { start, timer: setTimeout(() => { hold = null; showStudy(true); }, 800) };
}, { passive: true });
document.addEventListener('touchmove', e => {
  if (!hold) return;
  const moved = [...e.touches].some(t => {
    const p = hold.start.get(t.identifier);
    return p && Math.hypot(t.clientX - p[0], t.clientY - p[1]) > 15;
  });
  if (moved) cancelHold();
}, { passive: true });
document.addEventListener('touchend', cancelHold);
document.addEventListener('touchcancel', cancelHold);
document.addEventListener('keydown', e => {
  if (e.altKey && e.code === 'KeyM') { e.preventDefault(); showStudy(!study.classList.contains('open')); }
  else if (e.key === 'Escape' && study.classList.contains('open')) showStudy(false);
});

reset(); render(); log('Session started');
