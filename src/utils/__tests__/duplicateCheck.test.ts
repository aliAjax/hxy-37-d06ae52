import { describe, it, expect } from 'vitest';
import {
  calculateSimilarity,
  findSimilarMaterials,
  findDuplicatePairs,
  getFieldDifferences,
  DEFAULT_DUPLICATE_RULES,
} from '../duplicateCheck';
import type { Material } from '../../types';

const makeMaterial = (overrides: Partial<Material> = {}): Material => ({
  id: 'test-id',
  title: '测试资料',
  type: 'artbook',
  work: '某作品',
  publisher: '',
  publishDate: '',
  pageCount: 100,
  pageStart: 1,
  pageEnd: 100,
  purchaseSource: '',
  scanStatus: 'unscanned',
  copyrightNote: '',
  description: '',
  characterIds: [],
  staffIds: [],
  pageReferences: [],
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
  ...overrides,
});

describe('duplicateCheck - calculateSimilarity', () => {
  it('完全相同的标题和作品应该有较高分数和多条匹配原因', () => {
    const a = makeMaterial({ title: '原画集A', work: '作品X' });
    const b = makeMaterial({ id: 'b', title: '原画集A', work: '作品X' });
    const { score, reasons } = calculateSimilarity(a, b);
    expect(score).toBeGreaterThan(0);
    expect(reasons.length).toBeGreaterThanOrEqual(2);
    expect(reasons).toContain('标题相似 (100%)');
    expect(reasons).toContain('作品相同');
  });

  it('标题完全不同时不加分标题相似度', () => {
    const a = makeMaterial({ title: '完全不同的标题A' });
    const b = makeMaterial({ id: 'b', title: '毫无关系的标题B' });
    const { reasons } = calculateSimilarity(a, b);
    const hasTitleReason = reasons.some((r) => r.includes('标题相似'));
    expect(hasTitleReason).toBe(false);
  });

  it('标题包含关系且相似度达阈值时给部分相似度分', () => {
    const a = makeMaterial({ title: '某作品官方原画集' });
    const b = makeMaterial({ id: 'b', title: '某作品官方原画集限定版' });
    const { score, reasons } = calculateSimilarity(a, b);
    const hasTitleReason = reasons.some((r) => r.includes('标题相似'));
    expect(hasTitleReason).toBe(true);
    expect(score).toBeGreaterThan(0);
  });

  it('标题包含关系但相似度低于阈值时不计入标题相似原因', () => {
    const a = makeMaterial({ title: '官方原画集' });
    const b = makeMaterial({ id: 'b', title: '某超长作品名官方原画集vol.1豪华限定版' });
    const { reasons } = calculateSimilarity(a, b);
    const hasTitleReason = reasons.some((r) => r.includes('标题相似'));
    expect(hasTitleReason).toBe(false);
  });

  it('出版日期相同时加分', () => {
    const a = makeMaterial({ title: 'A', publishDate: '2023-05-01' });
    const b = makeMaterial({ id: 'b', title: 'B', publishDate: '2023-05-01' });
    const { reasons } = calculateSimilarity(a, b);
    expect(reasons).toContain('出版日期相同');
  });

  it('页数接近时（差在阈值内）加分', () => {
    const a = makeMaterial({ title: 'A', pageCount: 100 });
    const b = makeMaterial({ id: 'b', title: 'B', pageCount: 103 });
    const { reasons } = calculateSimilarity(a, b);
    expect(reasons).toContain('页数接近 (±5页)');
  });

  it('页数差距超过阈值时不加分', () => {
    const a = makeMaterial({ title: 'A', pageCount: 100 });
    const b = makeMaterial({ id: 'b', title: 'B', pageCount: 200 });
    const { reasons } = calculateSimilarity(a, b);
    const hasPageReason = reasons.some((r) => r.includes('页数接近'));
    expect(hasPageReason).toBe(false);
  });

  it('关联角色重合时加分', () => {
    const a = makeMaterial({ title: 'A', characterIds: ['角色1', '角色2', '角色3'] });
    const b = makeMaterial({ id: 'b', title: 'B', characterIds: ['角色2', '角色3', '角色4'] });
    const { score, reasons } = calculateSimilarity(a, b);
    const hasCharReason = reasons.some((r) => r.includes('关联角色重合'));
    expect(hasCharReason).toBe(true);
    expect(score).toBeGreaterThan(0);
  });

  it('没有重合角色时不加分', () => {
    const a = makeMaterial({ title: 'A', characterIds: ['角色1'] });
    const b = makeMaterial({ id: 'b', title: 'B', characterIds: ['角色2'] });
    const { reasons } = calculateSimilarity(a, b);
    const hasCharReason = reasons.some((r) => r.includes('关联角色重合'));
    expect(hasCharReason).toBe(false);
  });

  it('空字段不会误触发相同匹配', () => {
    const a = makeMaterial({ title: 'A', work: '', publishDate: '' });
    const b = makeMaterial({ id: 'b', title: 'B', work: '', publishDate: '' });
    const { reasons } = calculateSimilarity(a, b);
    expect(reasons).not.toContain('作品相同');
    expect(reasons).not.toContain('出版日期相同');
  });

  it('只有标题相似一个匹配原因时（不满足 minMatchReasons），findSimilarMaterials 会过滤掉', () => {
    const a = makeMaterial({ title: '测试', work: '', pageCount: 10, characterIds: [] });
    const b = makeMaterial({ id: 'b', title: '测试', work: '', pageCount: 100, characterIds: [] });
    const { score, reasons } = calculateSimilarity(a, b);
    expect(reasons.length).toBe(1);
    expect(score).toBeGreaterThan(0);
    const similars = findSimilarMaterials(a, [b]);
    expect(similars).toHaveLength(0);
  });
});

describe('duplicateCheck - findSimilarMaterials', () => {
  const target = makeMaterial({
    title: '某原画集',
    work: '知名作品',
    pageCount: 100,
    characterIds: ['角色甲', '角色乙'],
  });

  const existing: Material[] = [
    makeMaterial({
      id: 'sim1',
      title: '某原画集',
      work: '知名作品',
      pageCount: 102,
      characterIds: ['角色甲', '角色乙'],
    }),
    makeMaterial({
      id: 'sim2',
      title: '某原画集 限定版',
      work: '知名作品',
      pageCount: 100,
      characterIds: ['角色甲', '角色乙'],
    }),
    makeMaterial({
      id: 'diff1',
      title: '完全不同的书',
      work: '另一个作品',
      pageCount: 50,
      characterIds: [],
    }),
  ];

  it('只返回相似度达标的资料', () => {
    const result = findSimilarMaterials(target, existing);
    const ids = result.map((r) => r.material.id);
    expect(ids).toContain('sim1');
    expect(ids).toContain('sim2');
    expect(ids).not.toContain('diff1');
  });

  it('返回结果按相似度从高到低排序', () => {
    const result = findSimilarMaterials(target, existing);
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].similarityScore).toBeGreaterThanOrEqual(result[i + 1].similarityScore);
    }
  });

  it('可以通过 maxResults 限制返回数量', () => {
    const moreExisting = Array.from({ length: 10 }, (_, i) =>
      makeMaterial({
        id: `m${i}`,
        title: '某原画集',
        work: '知名作品',
        pageCount: 100 + i,
      })
    );
    const result = findSimilarMaterials(target, moreExisting, DEFAULT_DUPLICATE_RULES, 3);
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it('空列表返回空结果', () => {
    const result = findSimilarMaterials(target, []);
    expect(result).toEqual([]);
  });
});

describe('duplicateCheck - findDuplicatePairs', () => {
  it('能从资料列表中找出所有重复对，且不重复', () => {
    const materials: Material[] = [
      makeMaterial({ id: 'a', title: '资料1', work: '作品X', pageCount: 100 }),
      makeMaterial({ id: 'b', title: '资料1', work: '作品X', pageCount: 102 }),
      makeMaterial({ id: 'c', title: '资料2', work: '作品Y', pageCount: 80 }),
      makeMaterial({ id: 'd', title: '资料1 限定版', work: '作品X', pageCount: 100 }),
    ];
    const pairs = findDuplicatePairs(materials);
    const pairKeys = pairs.map((p) => p.id);
    const uniqueKeys = new Set(pairKeys);
    expect(pairKeys.length).toBe(uniqueKeys.size);
    expect(pairs.length).toBeGreaterThan(0);
    pairs.forEach((pair) => {
      expect(pair.matchReasons.length).toBeGreaterThanOrEqual(
        DEFAULT_DUPLICATE_RULES.thresholds.minMatchReasons
      );
    });
  });

  it('少于两条资料返回空数组', () => {
    expect(findDuplicatePairs([])).toEqual([]);
    expect(findDuplicatePairs([makeMaterial()])).toEqual([]);
  });

  it('返回结果按相似度从高到低排序', () => {
    const materials: Material[] = [
      makeMaterial({ id: 'a', title: '资料1', work: '作品X', pageCount: 100 }),
      makeMaterial({ id: 'b', title: '资料1', work: '作品X', pageCount: 100 }),
      makeMaterial({ id: 'c', title: '资料1', work: '作品X', pageCount: 150 }),
    ];
    const pairs = findDuplicatePairs(materials);
    for (let i = 0; i < pairs.length - 1; i++) {
      expect(pairs[i].similarityScore).toBeGreaterThanOrEqual(pairs[i + 1].similarityScore);
    }
  });
});

describe('duplicateCheck - getFieldDifferences', () => {
  it('能对比两个资料的所有字段，标记是否不同', () => {
    const a = makeMaterial({
      id: 'a',
      title: '原画集A',
      type: 'artbook',
      work: '作品X',
      pageCount: 100,
      characterIds: ['c1', 'c2'],
    });
    const b = makeMaterial({
      id: 'b',
      title: '原画集B',
      type: 'artbook',
      work: '作品X',
      pageCount: 120,
      characterIds: ['c1'],
    });
    const diffs = getFieldDifferences(a, b);
    expect(diffs.length).toBeGreaterThan(0);
    const titleDiff = diffs.find((d) => d.field === 'title');
    expect(titleDiff?.isDifferent).toBe(true);
    const typeDiff = diffs.find((d) => d.field === 'type');
    expect(typeDiff?.isDifferent).toBe(false);
    const charDiff = diffs.find((d) => d.field === 'characterIds');
    expect(charDiff?.isDifferent).toBe(true);
  });

  it('完全相同的资料所有字段 isDifferent 都为 false', () => {
    const m = makeMaterial();
    const diffs = getFieldDifferences(m, { ...m });
    const allSame = diffs.every((d) => d.isDifferent === false);
    expect(allSame).toBe(true);
  });
});
