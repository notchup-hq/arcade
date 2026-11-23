import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { qrModules, qrPath } from '../js/qr.js';

// Made by an independent encoder (the Python `qrcode` package: byte mode, level M, one text per version, every mask),
// kept as the first 16 hex digits of the SHA-256 of each code's modules written row by row as 0 and 1.
const PINNED = [
  [1, "u", ["550b69f5da33ea58", "780449cca5025c46", "155a2a9f4334edba", "8969d6807b7ea4e2", "205bf601ee4bd3c6", "f45e1d9499b6796d", "6bd327773cb6053a", "66b3cfaaf2b213dd"]],
  [2, "91d:ho##/d:/zdo", ["25e146f71a6254d6", "a9b5d37da50041bd", "d37b7965774d8f50", "a1c891d08194e2a0", "ec79bbcb24dcff0a", "e909bdd501ccc75b", "4be9e819ce7b866b", "12163204b2b31302"]],
  [3, "81u3/3xtplpf:t75v2s.eh60kvj", ["1446c5d94d75d94d", "4c526f358ef937a7", "7480d308ccbda42d", "83a5ca2d1c7c3024", "efcb938eb6aba5c9", "eac2e54e862133e1", "beda028f0a645169", "4503a9b617c0d67f"]],
  [4, "z5fk2z9ri19r0wyojfljo-oa5/lqsaj08x?:ui6?=d3", ["eeaec65ec0883149", "5316471fd0452802", "cedb48303da6ad74", "5f929fe0cac886f2", "0ee2fa02e5409bfb", "ff229d4c77fefc2b", "419c1d12b5263ea6", "8f8fb54cfe024ae6"]],
  [5, "t=fq7xkwo886v#o?mpzom75wbbr4qm.w2wxfogo4mvn4??a4=w=f-hym4l1#vfz", ["6a1a4f714db63918", "92ae107e00a75496", "f9c4ca2c1c8277b1", "303d4c8ddc28b9d4", "036fe88e4a893417", "79bb36c3519626c3", "1c378d7b3f1e7a3c", "9bb0561dc0f0b5ae"]],
  [6, "be2u?6.6mr26846p7q9m2i0hz2ue-p1en-thj=-xjqi3ogz5k-ok16zv0mwufxbv932byv7?s6ehogfqrclri", ["1ef4269b68d9f83b", "c7e1ed3d0cec6152", "37c990a5af71d3fc", "367c63a918f7dcbc", "265eab4f6170483c", "5797d88337c5c527", "151aaf0d17d6b28b", "71392075b90a3d28"]],
];

const digest = (modules) => createHash('sha256').update(modules.map((row) => row.map(Number).join('')).join('')).digest('hex').slice(0, 16);

test('every mask of a code matches the independent encoder, for versions 1 to 6', () => {
  for (const [version, text, digests] of PINNED) {
    for (let mask = 0; mask < 8; mask++) {
      const modules = qrModules(text, mask);
      assert.equal(modules.length, 17 + 4 * version, `size of version ${version}`);
      assert.equal(digest(modules), digests[mask], `version ${version}, mask ${mask}`);
    }
  }
});

test('without a mask it picks one of the eight, and the same code every time', () => {
  for (const [, text, digests] of PINNED) {
    const modules = qrModules(text);
    assert.ok(digests.includes(digest(modules)));
    assert.deepEqual(qrModules(text), modules);
  }
});

test('text that does not fit version 6 gives null, and 106 bytes still fit', () => {
  assert.equal(qrModules('x'.repeat(107)), null);
  assert.ok(qrModules('x'.repeat(106)));
});

test('the limit counts bytes, not characters', () => {
  assert.ok(qrModules('ä'.repeat(53)));
  assert.equal(qrModules('ä'.repeat(54)), null);
});

test('a challenge link is a small code', () => {
  const modules = qrModules('https://arcade.notchup.fi/games/pair-up/#c=ABCDEFGHJKMNP');
  assert.ok(modules.length <= 37, 'version 5 at most');
});

test('the path has one square for every dark module, inside the quiet zone', () => {
  const modules = qrModules('hi');
  const dark = modules.flat().filter(Boolean).length;
  assert.equal(qrPath(modules).split('M').length - 1, dark);
  assert.ok(qrPath(modules).startsWith('M'));
});
