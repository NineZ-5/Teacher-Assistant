import test from 'node:test';
import assert from 'node:assert/strict';

import {
  genId,
  normalize,
  fmtDate,
  toDateISO,
  escapeHtml,
  escapeAttr,
  formatBytes,
  formatDuration,
  deepClone,
  safe
} from './utils.js';

import {
  getTimezoneOffsetMinutes,
  convertTimeBetweenTimezones,
  formatUtcOffset,
  isDSTActive
} from './timezone.js';

import {
  cleanGroupName,
  durationToWords
} from './reports.js';

import {
  isValidUUID
} from './storage.js';

test('genId generates valid UUID v4 format', () => {
  const id1 = genId();
  const id2 = genId();
  assert.equal(typeof id1, 'string');
  assert.equal(isValidUUID(id1), true, `id1 should be valid UUID: ${id1}`);
  assert.equal(isValidUUID(id2), true, `id2 should be valid UUID: ${id2}`);
  assert.notEqual(id1, id2);
});

test('normalize trims and collapses multiple spaces', () => {
  assert.equal(normalize('   مجموعة   النور   '), 'مجموعة النور');
  assert.equal(normalize(''), '');
  assert.equal(normalize(null as any), '');
});

test('fmtDate formats YYYY-MM-DD to DD/MM/YYYY', () => {
  assert.equal(fmtDate('2026-11-09'), '09/11/2026');
  assert.equal(fmtDate(''), '');
});

test('toDateISO returns ISO date string from Date', () => {
  const d = new Date(2026, 4, 15); // May 15, 2026
  assert.equal(toDateISO(d), '2026-05-15');
});

test('escapeHtml and escapeAttr properly escape special characters', () => {
  const raw = '<script>alert("x & y\'");</script>';
  const escaped = escapeHtml(raw);
  assert.equal(escaped.includes('<script>'), false);
  assert.equal(escaped.includes('&lt;script&gt;'), true);
  assert.equal(escapeAttr(raw), escaped);
});

test('formatBytes returns correct unit strings', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(500), '500 B');
  assert.equal(formatBytes(1024), '1.0 KB');
  assert.equal(formatBytes(1024 * 1024), '1.00 MB');
  assert.equal(formatBytes(1024 * 1024 * 1024), '1.00 GB');
});

test('formatDuration formats minutes to Arabic words', () => {
  assert.equal(formatDuration(0), '0 دقيقة');
  assert.equal(formatDuration(30), '30 دقيقة');
  assert.equal(formatDuration(60), 'ساعة');
  assert.equal(formatDuration(120), 'ساعتان');
  assert.equal(formatDuration(180), '3 ساعات');
  assert.equal(formatDuration(90), 'ساعة و 30 دقيقة');
});

test('durationToWords converts string or int minutes to words', () => {
  assert.equal(durationToWords('60'), 'ساعة');
  assert.equal(durationToWords('120'), 'ساعتان');
  assert.equal(durationToWords('45'), '45 دقيقة');
  assert.equal(durationToWords('0'), 'غير محددة');
});

test('cleanGroupName removes group number suffixes', () => {
  assert.equal(cleanGroupName('أسرة النذير - 4438'), 'أسرة النذير');
  assert.equal(cleanGroupName('مجموعة التوحيد (12)'), 'مجموعة التوحيد');
  assert.equal(cleanGroupName('مجموعة الفلاح'), 'مجموعة الفلاح');
});

test('deepClone deep clones objects and arrays without shared references', () => {
  const original = { a: 1, b: [2, 3], c: { d: 'test' } };
  const clone = deepClone(original);
  assert.deepEqual(clone, original);
  clone.b.push(4);
  assert.equal(original.b.length, 2);
});

test('safe handles null and undefined safely', () => {
  assert.equal(safe(null), '');
  assert.equal(safe(undefined), '');
  assert.equal(safe('hello'), 'hello');
  assert.equal(safe(0), 0);
});

test('timezone functions calculate offsets and conversions', () => {
  const date = new Date(2026, 0, 15);
  const cairoOffset = getTimezoneOffsetMinutes('Africa/Cairo', date);
  assert.equal(typeof cairoOffset, 'number');

  const converted = convertTimeBetweenTimezones('2026-01-15', '18:00', 'Africa/Cairo', 'Africa/Cairo');
  assert.equal(converted, '18:00');

  const utc = formatUtcOffset('Africa/Cairo', date);
  assert.match(utc, /^UTC[+-]\d+/);
});
