import { describe, it, expect } from 'vitest';
import {
  autoMapFields,
  applyFieldMapping,
  runPreflight,
  getCSVHeaders,
  HEADER_TO_FIELD_MAP,
  FIELD_TO_HEADER_MAP,
} from '../csv';
import type {
  CSVRow,
  FieldMapping,
  Material,
  Character,
  Staff,
} from '../../types';

describe('csv utils - autoMapFields', () => {
  it('能将中文表头自动映射到目标字段', () => {
    const headers = ['标题', '类型', '作品', '出版社', '扫描状态'];
    const result = autoMapFields(headers);
    expect(result).toHaveLength(5);
    expect(result[0]).toEqual({ csvHeader: '标题', targetField: 'title' });
    expect(result[1]).toEqual({ csvHeader: '类型', targetField: 'type' });
    expect(result[2]).toEqual({ csvHeader: '作品', targetField: 'work' });
    expect(result[3]).toEqual({ csvHeader: '出版社', targetField: 'publisher' });
    expect(result[4]).toEqual({ csvHeader: '扫描状态', targetField: 'scanStatus' });
  });

  it('无法识别的表头 targetField 为空字符串', () => {
    const headers = ['标题', '自定义字段', '备注'];
    const result = autoMapFields(headers);
    expect(result[0].targetField).toBe('title');
    expect(result[1].targetField).toBe('');
    expect(result[2].targetField).toBe('');
  });

  it('会过滤掉空表头（全空格也算空）', () => {
    const headers = ['标题', '', '  ', '类型'];
    const result = autoMapFields(headers);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.csvHeader)).toEqual(['标题', '类型']);
  });

  it('空数组输入返回空数组', () => {
    expect(autoMapFields([])).toEqual([]);
  });
});

describe('csv utils - applyFieldMapping', () => {
  it('能根据映射把 CSV 行的字段重排到目标字段名下', () => {
    const row: CSVRow = {
      '列A': '测试标题',
      '列B': '原画集',
      '列C': '某作品',
    };
    const mappings: FieldMapping[] = [
      { csvHeader: '列A', targetField: 'title' },
      { csvHeader: '列B', targetField: 'type' },
      { csvHeader: '列C', targetField: 'work' },
    ];
    const result = applyFieldMapping(row, mappings);
    expect(result['标题']).toBe('测试标题');
    expect(result['类型']).toBe('原画集');
    expect(result['作品']).toBe('某作品');
    expect(result['列A']).toBeUndefined();
    expect(result['列B']).toBeUndefined();
  });

  it('targetField 为空的映射会被忽略', () => {
    const row: CSVRow = { '标题': 'test', '未知列': 'xxx' };
    const mappings: FieldMapping[] = [
      { csvHeader: '标题', targetField: 'title' },
      { csvHeader: '未知列', targetField: '' },
    ];
    const result = applyFieldMapping(row, mappings);
    expect(result['标题']).toBe('test');
    expect(result['未知列']).toBeUndefined();
  });

  it('空映射返回空对象', () => {
    const row: CSVRow = { '标题': 'test' };
    expect(applyFieldMapping(row, [])).toEqual({});
  });
});

describe('csv utils - getCSVHeaders', () => {
  it('从首行数据提取表头，排除 __parsed_extra', () => {
    const data: CSVRow[] = [
      { '标题': 'a', '类型': 'b', '__parsed_extra': 'c' },
    ];
    const headers = getCSVHeaders(data);
    expect(headers).toEqual(['标题', '类型']);
    expect(headers).not.toContain('__parsed_extra');
  });

  it('空数据返回空数组', () => {
    expect(getCSVHeaders([])).toEqual([]);
  });
});

describe('csv utils - runPreflight 基础验证', () => {
  const baseMappings: FieldMapping[] = [
    { csvHeader: '标题', targetField: 'title' },
    { csvHeader: '类型', targetField: 'type' },
    { csvHeader: '作品', targetField: 'work' },
    { csvHeader: '出版社', targetField: 'publisher' },
    { csvHeader: '总页数', targetField: 'pageCount' },
    { csvHeader: '起始页码', targetField: 'pageStart' },
    { csvHeader: '结束页码', targetField: 'pageEnd' },
    { csvHeader: '扫描状态', targetField: 'scanStatus' },
    { csvHeader: '关联角色', targetField: 'characters' },
    { csvHeader: '关联制作人员', targetField: 'staff' },
  ];

  const emptyMaterials: Material[] = [];
  const emptyCharacters: Character[] = [];
  const emptyStaff: Staff[] = [];

  it('空数据行返回全零统计', () => {
    const result = runPreflight([], baseMappings, emptyMaterials, emptyCharacters, emptyStaff);
    expect(result.summary.totalRows).toBe(0);
    expect(result.summary.validRows).toBe(0);
    expect(result.summary.errorRows).toBe(0);
    expect(result.summary.warningRows).toBe(0);
    expect(result.summary.duplicateRows).toBe(0);
  });

  it('标题为空的行会报 error 状态', () => {
    const data: CSVRow[] = [
      { '标题': '', '类型': '原画集' },
      { '标题': '  ', '类型': '原画集' },
      { '标题': '正常标题', '类型': '原画集' },
    ];
    const mappings: FieldMapping[] = [
      { csvHeader: '标题', targetField: 'title' },
      { csvHeader: '类型', targetField: 'type' },
    ];
    const result = runPreflight(data, mappings, emptyMaterials, emptyCharacters, emptyStaff);
    expect(result.summary.errorRows).toBe(2);
    expect(result.summary.validRows).toBe(1);
    expect(result.rowResults[0].errors).toContain('标题不能为空');
    expect(result.rowResults[1].errors).toContain('标题不能为空');
    expect(result.rowResults[0].status).toBe('error');
    expect(result.rowResults[2].status).toBe('success');
  });

  it('无法识别的类型值会变成 warning，默认用原画集', () => {
    const data: CSVRow[] = [
      { '标题': '测试本', '类型': '奇怪的类型' },
    ];
    const mappings: FieldMapping[] = [
      { csvHeader: '标题', targetField: 'title' },
      { csvHeader: '类型', targetField: 'type' },
    ];
    const result = runPreflight(data, mappings, emptyMaterials, emptyCharacters, emptyStaff);
    expect(result.rowResults[0].status).toBe('warning');
    expect(result.rowResults[0].warnings).toContain('类型 "奇怪的类型" 无法识别，默认使用 "原画集"');
    expect(result.rowResults[0].material?.type).toBe('artbook');
    expect(result.summary.fieldsWithIssues).toContain('类型');
  });

  it('类型为空时不报警告，用默认值', () => {
    const data: CSVRow[] = [
      { '标题': '测试本', '类型': '' },
    ];
    const mappings: FieldMapping[] = [
      { csvHeader: '标题', targetField: 'title' },
      { csvHeader: '类型', targetField: 'type' },
    ];
    const result = runPreflight(data, mappings, emptyMaterials, emptyCharacters, emptyStaff);
    expect(result.rowResults[0].status).toBe('success');
    expect(result.rowResults[0].material?.type).toBe('artbook');
  });

  it('无法识别的扫描状态会变成 warning，默认用未扫描', () => {
    const data: CSVRow[] = [
      { '标题': '测试本', '扫描状态': '不知道啥状态' },
    ];
    const mappings: FieldMapping[] = [
      { csvHeader: '标题', targetField: 'title' },
      { csvHeader: '扫描状态', targetField: 'scanStatus' },
    ];
    const result = runPreflight(data, mappings, emptyMaterials, emptyCharacters, emptyStaff);
    expect(result.rowResults[0].status).toBe('warning');
    expect(result.rowResults[0].warnings).toContain('扫描状态 "不知道啥状态" 无法识别，默认使用 "未扫描"');
    expect(result.rowResults[0].material?.scanStatus).toBe('unscanned');
    expect(result.summary.fieldsWithIssues).toContain('扫描状态');
  });
});

describe('csv utils - runPreflight 杂志切页页码异常', () => {
  const mappings: FieldMapping[] = [
    { csvHeader: '标题', targetField: 'title' },
    { csvHeader: '类型', targetField: 'type' },
    { csvHeader: '总页数', targetField: 'pageCount' },
    { csvHeader: '起始页码', targetField: 'pageStart' },
    { csvHeader: '结束页码', targetField: 'pageEnd' },
  ];
  const emptyMaterials: Material[] = [];
  const emptyCharacters: Character[] = [];
  const emptyStaff: Staff[] = [];

  it('起始页码大于结束页码且 pageCount > 0 时报警告', () => {
    const data: CSVRow[] = [
      { '标题': '杂志切页A', '类型': '杂志切页', '总页数': '50', '起始页码': '30', '结束页码': '10' },
    ];
    const result = runPreflight(data, mappings, emptyMaterials, emptyCharacters, emptyStaff);
    expect(result.rowResults[0].status).toBe('warning');
    expect(result.rowResults[0].warnings).toContain('起始页码大于结束页码');
    expect(result.summary.fieldsWithIssues).toContain('页码');
  });

  it('起始页码小于结束页码时正常，不报警告', () => {
    const data: CSVRow[] = [
      { '标题': '杂志切页B', '类型': '杂志切页', '总页数': '50', '起始页码': '10', '结束页码': '30' },
    ];
    const result = runPreflight(data, mappings, emptyMaterials, emptyCharacters, emptyStaff);
    expect(result.rowResults[0].status).toBe('success');
    expect(result.rowResults[0].warnings).toEqual([]);
  });

  it('pageCount 为 0 时，即使起始大于结束也不触发页码警告（没有总页数参考）', () => {
    const data: CSVRow[] = [
      { '标题': '杂志切页C', '类型': '杂志切页', '总页数': '0', '起始页码': '30', '结束页码': '10' },
    ];
    const result = runPreflight(data, mappings, emptyMaterials, emptyCharacters, emptyStaff);
    const hasPageWarning = result.rowResults[0].warnings.some((w) => w.includes('起始页码大于结束页码'));
    expect(hasPageWarning).toBe(false);
  });

  it('总页数格式不正确时报警告，默认值 0', () => {
    const data: CSVRow[] = [
      { '标题': '测试本', '类型': '原画集', '总页数': 'abc' },
    ];
    const result = runPreflight(data, mappings, emptyMaterials, emptyCharacters, emptyStaff);
    expect(result.rowResults[0].warnings).toContain('总页数格式不正确，使用默认值 0');
    expect(result.rowResults[0].material?.pageCount).toBe(0);
  });
});

describe('csv utils - runPreflight 角色和制作人员预览去重', () => {
  const mappings: FieldMapping[] = [
    { csvHeader: '标题', targetField: 'title' },
    { csvHeader: '作品', targetField: 'work' },
    { csvHeader: '关联角色', targetField: 'characters' },
    { csvHeader: '关联制作人员', targetField: 'staff' },
  ];
  const emptyMaterials: Material[] = [];
  const emptyCharacters: Character[] = [];
  const emptyStaff: Staff[] = [];

  it('相同作品下同名角色只保留一个预览（去重）', () => {
    const data: CSVRow[] = [
      { '标题': '资料1', '作品': '作品A', '关联角色': '张三; 李四' },
      { '标题': '资料2', '作品': '作品A', '关联角色': '张三; 王五' },
      { '标题': '资料3', '作品': '作品B', '关联角色': '张三' },
    ];
    const result = runPreflight(data, mappings, emptyMaterials, emptyCharacters, emptyStaff);
    const allCharPreviews = [...result.summary.newCharacters, ...result.summary.existingCharacters];
    const workA张三 = allCharPreviews.filter((c) => c.name === '张三' && c.work === '作品A');
    const workB张三 = allCharPreviews.filter((c) => c.name === '张三' && c.work === '作品B');
    expect(workA张三).toHaveLength(1);
    expect(workB张三).toHaveLength(1);
    expect(allCharPreviews).toHaveLength(4);
  });

  it('角色去重是按「姓名|作品」组合键去重的', () => {
    const data: CSVRow[] = [
      { '标题': '资料1', '作品': '作品A', '关联角色': '张三' },
      { '标题': '资料2', '作品': '作品A', '关联角色': '张三' },
      { '标题': '资料3', '作品': '作品A', '关联角色': '张三' },
    ];
    const result = runPreflight(data, mappings, emptyMaterials, emptyCharacters, emptyStaff);
    const allCharPreviews = [...result.summary.newCharacters, ...result.summary.existingCharacters];
    expect(allCharPreviews).toHaveLength(1);
    expect(allCharPreviews[0].name).toBe('张三');
    expect(allCharPreviews[0].work).toBe('作品A');
  });

  it('制作人员按「姓名|角色」去重，角色默认是「其他」', () => {
    const data: CSVRow[] = [
      { '标题': '资料1', '关联制作人员': '监督A; 原画B' },
      { '标题': '资料2', '关联制作人员': '监督A; 美术C' },
      { '标题': '资料3', '关联制作人员': '原画B' },
    ];
    const result = runPreflight(data, mappings, emptyMaterials, emptyCharacters, emptyStaff);
    const allStaffPreviews = [...result.summary.newStaff, ...result.summary.existingStaff];
    expect(allStaffPreviews).toHaveLength(3);
    const supervisor = allStaffPreviews.filter((s) => s.name === '监督A');
    expect(supervisor).toHaveLength(1);
    expect(supervisor[0].role).toBe('其他');
  });

  it('能识别已存在的角色（isNew=false）和新角色（isNew=true）', () => {
    const existingChars: Character[] = [
      { id: 'c1', name: '已知角色', work: '某作品' },
    ];
    const data: CSVRow[] = [
      { '标题': '资料1', '作品': '某作品', '关联角色': '已知角色; 新角色' },
    ];
    const result = runPreflight(data, mappings, emptyMaterials, existingChars, emptyStaff);
    expect(result.summary.existingCharacters).toHaveLength(1);
    expect(result.summary.existingCharacters[0].name).toBe('已知角色');
    expect(result.summary.existingCharacters[0].isNew).toBe(false);
    expect(result.summary.newCharacters).toHaveLength(1);
    expect(result.summary.newCharacters[0].name).toBe('新角色');
    expect(result.summary.newCharacters[0].isNew).toBe(true);
  });

  it('能识别已存在的制作人员', () => {
    const existingStaffList: Staff[] = [
      { id: 's1', name: '老画师', role: '其他', works: [] },
    ];
    const data: CSVRow[] = [
      { '标题': '资料1', '关联制作人员': '老画师; 新画师' },
    ];
    const result = runPreflight(data, mappings, emptyMaterials, emptyCharacters, existingStaffList);
    expect(result.summary.existingStaff).toHaveLength(1);
    expect(result.summary.existingStaff[0].name).toBe('老画师');
    expect(result.summary.newStaff).toHaveLength(1);
    expect(result.summary.newStaff[0].name).toBe('新画师');
  });

  it('角色有指定但作品为空时报警告', () => {
    const data: CSVRow[] = [
      { '标题': '资料1', '作品': '', '关联角色': '张三' },
    ];
    const result = runPreflight(data, mappings, emptyMaterials, emptyCharacters, emptyStaff);
    expect(result.rowResults[0].warnings).toContain('角色已指定但未指定所属作品，角色可能无法正确关联');
    expect(result.summary.fieldsWithIssues).toContain('关联角色');
  });
});

describe('csv utils - runPreflight 重复资料识别', () => {
  const mappings: FieldMapping[] = [
    { csvHeader: '标题', targetField: 'title' },
    { csvHeader: '类型', targetField: 'type' },
    { csvHeader: '作品', targetField: 'work' },
    { csvHeader: '总页数', targetField: 'pageCount' },
    { csvHeader: '出版社', targetField: 'publisher' },
    { csvHeader: '出版日期', targetField: 'publishDate' },
    { csvHeader: '关联角色', targetField: 'characters' },
  ];

  const existingMaterials: Material[] = [
    {
      id: 'm1',
      title: '某原画集',
      type: 'artbook',
      work: '知名作品',
      publisher: 'A出版社',
      publishDate: '2023-01-01',
      pageCount: 100,
      pageStart: 1,
      pageEnd: 100,
      purchaseSource: '',
      scanStatus: 'unscanned',
      copyrightNote: '',
      description: '',
      characterIds: ['c1', 'c2'],
      staffIds: [],
      pageReferences: [],
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
  ];

  const existingCharacters: Character[] = [
    { id: 'c1', name: '角色甲', work: '知名作品' },
    { id: 'c2', name: '角色乙', work: '知名作品' },
  ];
  const emptyStaff: Staff[] = [];

  it('高度相似的资料会进入 duplicate 状态', () => {
    const data: CSVRow[] = [
      {
        '标题': '某原画集',
        '类型': '原画集',
        '作品': '知名作品',
        '总页数': '102',
        '出版社': 'A出版社',
        '出版日期': '2023-01-01',
        '关联角色': '角色甲; 角色乙',
      },
    ];
    const result = runPreflight(data, mappings, existingMaterials, existingCharacters, emptyStaff);
    expect(result.summary.duplicateRows).toBe(1);
    expect(result.rowResults[0].status).toBe('duplicate');
    expect(result.rowResults[0].duplicateInfo).toBeDefined();
    expect(result.rowResults[0].duplicateInfo?.similarMaterials.length).toBeGreaterThan(0);
    expect(result.rowResults[0].duplicateInfo?.similarMaterials[0].material.id).toBe('m1');
  });

  it('完全不相似的资料保持 success 状态', () => {
    const data: CSVRow[] = [
      {
        '标题': '完全不一样的设定集',
        '类型': '设定集',
        '作品': '另一个作品',
        '总页数': '200',
      },
    ];
    const result = runPreflight(data, mappings, existingMaterials, existingCharacters, emptyStaff);
    expect(result.summary.duplicateRows).toBe(0);
    expect(result.rowResults[0].status).toBe('success');
    expect(result.rowResults[0].duplicateInfo).toBeUndefined();
  });

  it('本身有 warning 的资料如果同时重复，状态保持 warning 而不是 duplicate', () => {
    const data: CSVRow[] = [
      {
        '标题': '某原画集',
        '类型': '奇怪的类型',
        '作品': '知名作品',
        '总页数': '102',
        '出版日期': '2023-01-01',
        '关联角色': '角色甲; 角色乙',
      },
    ];
    const result = runPreflight(data, mappings, existingMaterials, existingCharacters, emptyStaff);
    expect(result.rowResults[0].status).toBe('warning');
    expect(result.rowResults[0].duplicateInfo).toBeDefined();
    expect(result.summary.duplicateRows).toBe(0);
    expect(result.summary.warningRows).toBe(1);
  });

  it('本身是 error 的资料不进行重复检查，也没有 duplicateInfo', () => {
    const data: CSVRow[] = [
      { '标题': '', '类型': '原画集', '作品': '知名作品' },
    ];
    const result = runPreflight(data, mappings, existingMaterials, existingCharacters, emptyStaff);
    expect(result.rowResults[0].status).toBe('error');
    expect(result.rowResults[0].duplicateInfo).toBeUndefined();
  });

  it('重复资料最多返回 3 条相似结果', () => {
    const manyExisting: Material[] = Array.from({ length: 5 }, (_, i) => ({
      id: `m${i}`,
      title: '某原画集',
      type: 'artbook' as const,
      work: '知名作品',
      publisher: 'A出版社',
      publishDate: '2023-01-01',
      pageCount: 100 + i,
      pageStart: 1,
      pageEnd: 100,
      purchaseSource: '',
      scanStatus: 'unscanned' as const,
      copyrightNote: '',
      description: '',
      characterIds: ['c1', 'c2'],
      staffIds: [],
      pageReferences: [],
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    }));
    const data: CSVRow[] = [
      {
        '标题': '某原画集',
        '类型': '原画集',
        '作品': '知名作品',
        '总页数': '100',
        '关联角色': '角色甲; 角色乙',
      },
    ];
    const result = runPreflight(data, mappings, manyExisting, existingCharacters, emptyStaff);
    expect(result.rowResults[0].duplicateInfo?.similarMaterials.length).toBeLessThanOrEqual(3);
  });

  it('summary 中的 duplicateRows 只统计状态为 duplicate 的行', () => {
    const data: CSVRow[] = [
      { '标题': '某原画集', '类型': '原画集', '作品': '知名作品', '总页数': '100' },
      { '标题': '', '类型': '原画集' },
      { '标题': '正常新资料', '类型': '原画集', '作品': '全新作品', '总页数': '50' },
      { '标题': '某原画集', '类型': '奇怪类型', '作品': '知名作品', '总页数': '100' },
    ];
    const result = runPreflight(data, mappings, existingMaterials, existingCharacters, emptyStaff);
    expect(result.summary.totalRows).toBe(4);
    expect(result.summary.duplicateRows).toBe(1);
    expect(result.summary.errorRows).toBe(1);
    expect(result.summary.warningRows).toBe(1);
    expect(result.summary.validRows).toBe(1);
  });
});

describe('csv utils - HEADER_TO_FIELD_MAP 与 FIELD_TO_HEADER_MAP 一致性', () => {
  it('两个映射应该互为逆映射', () => {
    Object.entries(HEADER_TO_FIELD_MAP).forEach(([header, field]) => {
      expect(FIELD_TO_HEADER_MAP[field]).toBe(header);
    });
    Object.entries(FIELD_TO_HEADER_MAP).forEach(([field, header]) => {
      expect(HEADER_TO_FIELD_MAP[header]).toBe(field);
    });
  });
});
