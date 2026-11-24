import { test } from 'node:test';
import assert from 'node:assert/strict';
import { packChallenge } from '../js/challenge.js';
import { challengeLine, explainSharing, greetChallenger, hallBehind, readChallenge, shareText, showChallengeQr, whereWords } from '../js/challenge-ui.js';

const code = packChallenge({ board: 'lob:solo', value: 1840, initials: 'PEK', date: Date.now() });
const args = (extra) => ({ hash: `#c=${code}`, game: 'lob', board: 'lob:solo', gameName: 'Lob', score: String, rand: () => 0, ...extra });

test('a good link for this game gives the card its line, with the score in the game\'s words', () => {
  const challenge = readChallenge(`#c=${code}`, 'lob');
  assert.equal(challenge.initials, 'PEK');
  assert.equal(challengeLine(challenge, args()), 'A challenger has arrived. PEK scored 1840 in Lob. Can you beat it?');
});

test('a link for another game, a bad code or no code is not read', () => {
  for (const [hash, game] of [[`#c=${code}`, 'fuse-box'], ['#c=AAAAAAAAAAAAA', 'lob'], ['', 'lob']]) assert.equal(readChallenge(hash, game), null);
});

test('reading a link never touches browser storage', () => {
  Object.defineProperty(globalThis, 'localStorage', { get: () => { throw new Error('storage touched'); }, configurable: true });
  try {
    assert.ok(readChallenge(`#c=${code}`, 'lob'));
  } finally {
    delete globalThis.localStorage;
  }
});

// The card is built with the DOM, so these tests give it a tiny stand-in for one.
function fakePage() {
  const fake = { back: null };
  const dialogs = [];
  globalThis.document = {
    body: { append: () => {} },
    referrer: '',
    querySelector: () => fake.back,
    createElement(tag) {
      const el = { tag, listeners: {}, append() {}, setAttribute() {}, remove() {}, addEventListener(name, fn) { this.listeners[name] = fn; }, showModal() { this.open = true; } };
      if (tag === 'dialog') dialogs.push(el);
      return el;
    },
  };
  globalThis.history = { replaceState() {} };
  globalThis.location = { origin: 'https://arcade.notchup.fi', href: 'https://arcade.notchup.fi/games/lob/', pathname: '/games/lob/', search: '' };
  dialogs.fake = fake;
  return dialogs;
}

test('the card saves the challenger only when the visitor taps Save', () => {
  for (const [returned, saved] of [['save', 1], ['', 0]]) {
    const dialogs = fakePage();
    const got = [];
    assert.equal(greetChallenger({ ...args(), onSave: (c) => got.push(c) }), true);
    assert.equal(dialogs[0].open, true);
    assert.deepEqual(got, [], 'opening saves nothing');
    dialogs[0].returnValue = returned;
    dialogs[0].listeners.close();
    assert.equal(got.length, saved);
    if (saved) assert.deepEqual([got[0].board, got[0].initials, got[0].value], ['lob:solo', 'PEK', 1840]);
  }
});

test('a link for another level of the game only says so, and cannot be saved', () => {
  const dialogs = fakePage();
  assert.equal(greetChallenger({ ...args({ board: 'lob:other' }), onSave: () => assert.fail('saved') }), true);
  dialogs[0].returnValue = 'save';
  dialogs[0].listeners.close();
});

test('no card is built for a link that is not for this game', () => {
  const dialogs = fakePage();
  assert.equal(greetChallenger({ ...args({ game: 'fuse-box' }), onSave: () => assert.fail('saved') }), false);
  assert.equal(dialogs.length, 0);
});

test('the level is named only when a game has more than one', () => {
  assert.equal(whereWords('Lob', 'lob:solo'), 'Lob');
  assert.equal(whereWords('Notch Up', 'notch-up:tower'), 'Notch Up');
  assert.equal(whereWords('Fuse Box', 'fuse-box:hard'), 'Fuse Box, hard');
});

test('the shared text names who, the score and where', () => {
  assert.equal(shareText({ initials: 'PEK' }, '1840', 'Lob', 'lob:solo'), 'PEK scored 1840 in Lob on the Notchup Arcade. Can you beat it?');
});

test('Show QR builds a dialog with a code of the link, and nothing is stored or sent', async () => {
  const dialogs = [];
  const made = (tag) => ({ tag, attrs: {}, kids: [], append(...k) { this.kids.push(...k); }, setAttribute(n, v) { this.attrs[n] = v; }, addEventListener() {}, remove() {}, showModal() { this.open = true; } });
  globalThis.document = { body: { append() {} }, createElement: (tag) => { const el = made(tag); if (tag === 'dialog') dialogs.push(el); return el; }, createElementNS: (ns, tag) => made(tag) };
  globalThis.location = { href: 'https://arcade.notchup.fi/games/lob/' };
  assert.equal(await showChallengeQr('lob:solo', { initials: 'PEK', value: 1840, date: Date.now() }), 'shown');
  assert.equal(dialogs[0].open, true);
  assert.equal(await showChallengeQr('nope:solo', { initials: 'PEK', value: 1840, date: Date.now() }), 'failed');
});

test('the sharing note says what a link is, that nothing is sent and that scores are not verified', () => {
  globalThis.document = {
    createElement: (tag) => ({ tag, children: [], append(...c) { this.children.push(...c); } }),
  };
  try {
    const note = explainSharing();
    const [summary, text] = note.children;
    assert.equal(summary.textContent, 'How does sharing work?');
    assert.match(text.textContent, /Nothing is sent to a server/);
    assert.match(text.textContent, /not verified/);
  } finally {
    delete globalThis.document;
  }
});

/** A page with a history that records what is done to it. */
function fakeHistory(referrer) {
  const log = [];
  const listeners = {};
  const dialogs = [];
  globalThis.document = {
    referrer,
    body: { append: (d) => { d.isConnected = true; dialogs.push(d); } },
    createElement: (tag) => ({ tag, listeners: {}, attrs: {}, append() {}, setAttribute(k, v) { this.attrs[k] = v; }, remove() { this.isConnected = false; }, addEventListener(name, fn) { this.listeners[name] = fn; }, showModal() { this.open = true; } }),
  };
  globalThis.location = { origin: 'https://arcade.notchup.fi', href: 'https://arcade.notchup.fi/games/lob/#c=x', pathname: '/games/lob/', search: '?level=hard', };
  const back = { href: 'https://arcade.notchup.fi/', click: () => log.push(['click']) };
  globalThis.history = {
    replaceState: (state, _t, url) => log.push(['replaceState', state, url]),
    pushState: (state, _t, url) => log.push(['pushState', state, url]),
  };
  globalThis.addEventListener = (name, fn) => { listeners[name] = fn; };
  return { log, listeners, back, dialogs };
}

test('a link opened from outside gets the hall put behind it, and Back goes to the hall', () => {
  const { log, listeners, back, dialogs } = fakeHistory('');
  hallBehind(back);
  assert.deepEqual(log, [['replaceState', { hallEntry: true }, '/'], ['pushState', null, '/games/lob/?level=hard']]);
  listeners.popstate({ state: null });
  assert.equal(log.length, 2, 'a step within the game does nothing');
  assert.deepEqual(dialogs, [], 'no card for a step within the game');
  listeners.popstate({ state: { hallEntry: true } });
  assert.equal(dialogs.filter((d) => d.tag === 'dialog' && d.open).length, 1, 'the waiting card shows');
  assert.equal(dialogs[0].attrs['aria-labelledby'], 'back-title');
  assert.deepEqual(log.at(-1), ['click']);
  listeners.popstate({ state: { hallEntry: true } });
  assert.equal(dialogs.length, 1, 'a second Back does not stack a second card');
  assert.equal(log.filter((l) => l[0] === 'click').length, 2, 'but still loads the hall');
  dialogs[0].listeners.close();
  assert.equal(dialogs[0].isConnected, false, 'closing the card removes it');
});

test('a page reached from the arcade already has the hall behind it', () => {
  const { log, back } = fakeHistory('https://arcade.notchup.fi/');
  hallBehind(back);
  assert.deepEqual(log, []);
});

test('greeting a link puts the hall behind the game, after clearing the hash', () => {
  const dialogs = fakePage();
  const log = [];
  globalThis.history = { replaceState: (s, _t, u) => log.push(['replaceState', s, u]), pushState: (s, _t, u) => log.push(['pushState', s, u]) };
  globalThis.addEventListener = () => {};
  dialogs.fake.back = { href: 'https://arcade.notchup.fi/', click() {} };
  greetChallenger({ ...args(), onSave: () => {} });
  assert.deepEqual(log.map((l) => l[0]), ['replaceState', 'replaceState', 'pushState']);
  assert.equal(log[0][2], '/games/lob/');
  assert.equal(log[1][2], '/');
});

test('an Arcade link on another origin is not made a hall entry', () => {
  const { log, back } = fakeHistory('');
  back.href = 'https://example.com/';
  hallBehind(back);
  assert.deepEqual(log, []);
});
