// A QR code, drawn by our own code so the arcade needs no library: byte mode, error correction level M,
// versions 1 to 6 (up to 106 bytes of text, 41×41 modules at most), which is plenty for a link like ours.
// tests/qr.test.js pins the modules of known codes, made by an independent encoder.

// How each version at level M splits its codewords: [data per block, blocks, error codewords per block].
const BLOCKS = [null, [16, 1, 10], [28, 1, 16], [44, 1, 26], [32, 2, 18], [43, 2, 24], [27, 4, 16]];
const ALIGNMENT = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34]]; // centres of the alignment pattern(s)
const MASKS = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r * c) % 3) + ((r + c) % 2)) % 2 === 0,
];

// Arithmetic on bytes as the QR standard defines it (a Galois field with 256 elements).
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
for (let i = 0, x = 1; i < 255; i++) {
  EXP[i] = EXP[i + 255] = x;
  LOG[x] = i;
  x <<= 1;
  if (x & 0x100) x ^= 0x11d;
}
const times = (a, b) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);

/** The `count` error correction codewords for `data`. */
function errorCodewords(data, count) {
  let generator = [1];
  for (let i = 0; i < count; i++) {
    const next = new Array(generator.length + 1).fill(0);
    generator.forEach((g, k) => {
      next[k] ^= g;
      next[k + 1] ^= times(g, EXP[i]);
    });
    generator = next;
  }
  const rest = new Array(count).fill(0);
  for (const byte of data) {
    const lead = byte ^ rest.shift();
    rest.push(0);
    if (lead) generator.slice(1).forEach((g, k) => { rest[k] ^= times(g, lead); });
  }
  return rest;
}

/** The smallest version that holds `bytes`, or 0 when none of 1 to 6 does. */
const versionFor = (bytes) => [1, 2, 3, 4, 5, 6].find((v) => bytes <= BLOCKS[v][0] * BLOCKS[v][1] - 2) ?? 0;

/** The codewords to draw: the text as data, split into blocks, each with its error codewords, interleaved. */
function codewords(bytes, version) {
  const [perBlock, blocks, ecCount] = BLOCKS[version];
  const bits = [];
  const push = (value, length) => { for (let i = length - 1; i >= 0; i--) bits.push((value >> i) & 1); };
  push(0b0100, 4);
  push(bytes.length, 8);
  bytes.forEach((b) => push(b, 8));
  const capacity = perBlock * blocks * 8;
  push(0, Math.min(4, capacity - bits.length));
  while (bits.length % 8) bits.push(0);
  const data = [];
  for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(''), 2));
  for (let pad = 0xec; data.length < perBlock * blocks; pad ^= 0xec ^ 0x11) data.push(pad);
  const split = Array.from({ length: blocks }, (_, k) => data.slice(k * perBlock, (k + 1) * perBlock));
  const ec = split.map((block) => errorCodewords(block, ecCount));
  const out = [];
  for (let i = 0; i < perBlock; i++) split.forEach((block) => out.push(block[i]));
  for (let i = 0; i < ecCount; i++) ec.forEach((block) => out.push(block[i]));
  return out;
}

/** The 15 format bits for a mask: level M, the mask, a BCH code and the standard's XOR. */
function formatBits(mask) {
  const data = mask; // level M is 00
  let rest = data << 10;
  for (let i = 14; i >= 10; i--) if ((rest >> i) & 1) rest ^= 0x537 << (i - 10);
  return ((data << 10) | rest) ^ 0x5412;
}

/** The empty grid with its fixed parts drawn; `fixed[r][c]` marks those modules. */
/** Where each of the 15 format bits goes: twice, once beside the top-left finder and once split between the other two. */
function formatCells(n) {
  return Array.from({ length: 15 }, (_, i) => [
    [i < 6 ? i : i < 8 ? i + 1 : n - 15 + i, 8],
    [8, i < 8 ? n - i - 1 : i < 9 ? 7 : 15 - i - 1],
  ]);
}

function frame(version) {
  const n = 17 + 4 * version;
  const grid = Array.from({ length: n }, () => new Array(n).fill(false));
  const fixed = Array.from({ length: n }, () => new Array(n).fill(false));
  const set = (r, c, dark) => { grid[r][c] = dark; fixed[r][c] = true; };
  for (const [top, left] of [[0, 0], [n - 7, 0], [0, n - 7]]) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const [y, x] = [top + r, left + c];
        if (y < 0 || x < 0 || y >= n || x >= n) continue;
        const ring = Math.max(Math.abs(r - 3), Math.abs(c - 3));
        set(y, x, r >= 0 && r <= 6 && c >= 0 && c <= 6 && ring !== 2);
      }
    }
  }
  const centres = ALIGNMENT[version];
  for (const cy of centres) {
    for (const cx of centres) {
      if (fixed[cy][cx]) continue; // under a finder pattern
      for (let r = -2; r <= 2; r++) for (let c = -2; c <= 2; c++) set(cy + r, cx + c, Math.max(Math.abs(r), Math.abs(c)) !== 1);
    }
  }
  for (let i = 8; i < n - 8; i++) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }
  for (const cells of formatCells(n)) for (const [r, c] of cells) fixed[r][c] = true; // room for the format bits, filled in per mask
  set(n - 8, 8, true); // the one module that is always dark
  return { n, grid, fixed };
}

/** The data placed in the zigzag the standard describes, with `mask` applied. */
function place({ n, grid, fixed }, data, maskFn) {
  const out = grid.map((row) => row.slice());
  let up = true;
  let row = n - 1;
  let bit = 0;
  for (let col = n - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    for (;;) {
      for (const c of [col, col - 1]) {
        if (fixed[row][c]) continue;
        const dark = bit < data.length * 8 && ((data[bit >> 3] >> (7 - (bit & 7))) & 1) === 1;
        out[row][c] = maskFn(row, c) ? !dark : dark;
        bit++;
      }
      row += up ? -1 : 1;
      if (row < 0 || row >= n) {
        row += up ? 1 : -1;
        up = !up;
        break;
      }
    }
  }
  return out;
}

function putFormat(out, mask) {
  const bits = formatBits(mask);
  formatCells(out.length).forEach((cells, i) => {
    for (const [r, c] of cells) out[r][c] = ((bits >> i) & 1) === 1;
  });
}

/** The standard's four penalty rules: lower is easier to scan. */
function penalty(m) {
  const n = m.length;
  let total = 0;
  for (const line of [...m, ...m.map((_, c) => m.map((row) => row[c]))]) {
    let run = 1;
    for (let i = 1; i <= n; i++) {
      if (i < n && line[i] === line[i - 1]) run++;
      else {
        if (run >= 5) total += run - 2;
        run = 1;
      }
    }
    const text = line.map(Number).join('');
    for (const finder of ['10111010000', '00001011101']) {
      for (let at = text.indexOf(finder); at >= 0; at = text.indexOf(finder, at + 1)) total += 40;
    }
  }
  for (let r = 0; r < n - 1; r++) {
    for (let c = 0; c < n - 1; c++) if (m[r][c] === m[r][c + 1] && m[r][c] === m[r + 1][c] && m[r][c] === m[r + 1][c + 1]) total += 3;
  }
  const dark = m.flat().filter(Boolean).length;
  return total + 10 * Math.floor(Math.abs((dark * 100) / (n * n) - 50) / 5);
}

/**
 * The modules of a QR code for `text` as rows of booleans (true is dark), or null when the text needs
 * more than version 6. `mask` (0 to 7) forces a mask; left out, the one with the lowest penalty is used.
 */
export function qrModules(text, mask) {
  const bytes = [...new TextEncoder().encode(text)];
  const version = versionFor(bytes.length);
  if (!version) return null;
  const base = frame(version);
  const data = codewords(bytes, version);
  const make = (k) => {
    const out = place(base, data, MASKS[k]);
    putFormat(out, k);
    return out;
  };
  if (mask !== undefined) return make(mask);
  const options = MASKS.map((_, k) => make(k));
  const scores = options.map(penalty);
  return options[scores.indexOf(Math.min(...scores))];
}

/** An SVG `d` for the dark modules (one square each, 1 unit wide), for a path in a viewBox of the code plus a 4-module quiet zone. */
export function qrPath(modules) {
  let d = '';
  modules.forEach((row, r) => row.forEach((dark, c) => { if (dark) d += `M${c + 4} ${r + 4}h1v1h-1z`; }));
  return d;
}
