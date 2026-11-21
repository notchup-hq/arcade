// The arcade's games are our own takes on classic genres: our own names, art, rules text and levels. Genres and mechanics
// are free to use; other games' names are not ours to use, not even to describe ours. This fails if
// a well-known game's name appears anywhere in the repo, so no page, doc or commit-ready file leans
// on someone else's brand. Add a name here before it can slip in.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filesIn, read } from './helpers.js';

const NAMES = [
  'minesweeper', 'mine sweeper', 'worms', 'scorched earth', 'gorillas', 'space invaders', 'invaders',
  'galaga', 'galaxian', 'pac-man', 'pacman', 'tetris', 'breakout', 'arkanoid', 'asteroids', 'pong',
  'frogger', 'donkey kong', 'mario', 'sonic', 'zelda', 'pokemon', 'pokémon', 'snake ii', 'bomberman',
  'lemmings', 'tank wars', 'bowmasters', 'pocket tanks', 'angry birds', 'flappy', 'candy crush', 'sokoban',
];

const checked = () => [
  ...filesIn('.', /\.(html|css|js|mjs|md|json|txt|xml|svg)$/).filter((f) => f !== 'tests/originality.test.js'),
];

test('no other game is named anywhere in the repo', () => {
  const hits = [];
  for (const f of checked()) {
    const text = read(f).toLowerCase();
    for (const name of NAMES) {
      const re = new RegExp(`(^|[^a-z0-9])${name.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&')}($|[^a-z0-9])`);
      if (re.test(text)) hits.push(`${f}: ${name}`);
    }
  }
  assert.deepEqual(hits, []);
});
