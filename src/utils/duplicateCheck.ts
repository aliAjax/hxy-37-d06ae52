import { Material } from '../types';

export interface DuplicatePair {
  id: string;
  materialA: Material;
  materialB: Material;
  matchReasons: string[];
  similarityScore: number;
}

export interface FieldDiff {
  field: string;
  label: string;
  valueA: string | number;
  valueB: string | number;
  isDifferent: boolean;
}

const calculateStringSimilarity = (str1: string, str2: string): number => {
  if (!str1 || !str2) return 0;
  
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 100;
  
  if (s1.includes(s2) || s2.includes(s1)) {
    const shorter = Math.min(s1.length, s2.length);
    const longer = Math.max(s1.length, s2.length);
    return Math.round((shorter / longer) * 80);
  }
  
  const words1 = new Set(s1.split(/\s+/));
  const words2 = new Set(s2.split(/\s+/));
  const commonWords = [...words1].filter(word => words2.has(word));
  
  if (commonWords.length > 0) {
    const totalWords = Math.max(words1.size, words2.size);
    return Math.round((commonWords.length / totalWords) * 60);
  }
  
  return 0;
};

const isPublishDateSimilar = (date1: string, date2: string): boolean => {
  if (!date1 || !date2) return false;
  return date1 === date2;
};

const isPageCountSimilar = (pages1: number, pages2: number, threshold: number = 5): boolean => {
  if (!pages1 || !pages2) return false;
  return Math.abs(pages1 - pages2) <= threshold;
};

const isWorkSame = (work1: string, work2: string): boolean => {
  if (!work1 || !work2) return false;
  return work1 === work2;
};

export const findDuplicatePairs = (materials: Material[]): DuplicatePair[] => {
  const pairs: DuplicatePair[] = [];
  const processedPairs = new Set<string>();

  for (let i = 0; i < materials.length; i++) {
    for (let j = i + 1; j < materials.length; j++) {
      const m1 = materials[i];
      const m2 = materials[j];
      
      const pairKey = `${m1.id}-${m2.id}`;
      if (processedPairs.has(pairKey)) continue;
      
      const matchReasons: string[] = [];
      let score = 0;
      
      const titleSimilarity = calculateStringSimilarity(m1.title, m2.title);
      if (titleSimilarity >= 50) {
        matchReasons.push(`标题相似 (${titleSimilarity}%)`);
        score += titleSimilarity * 0.4;
      }
      
      if (isWorkSame(m1.work, m2.work)) {
        matchReasons.push('作品相同');
        score += 25;
      }
      
      if (isPublishDateSimilar(m1.publishDate, m2.publishDate)) {
        matchReasons.push('出版日期相同');
        score += 20;
      }
      
      if (isPageCountSimilar(m1.pageCount, m2.pageCount)) {
        matchReasons.push('页数接近');
        score += 15;
      }
      
      if (score >= 30 && matchReasons.length >= 2) {
        processedPairs.add(pairKey);
        pairs.push({
          id: pairKey,
          materialA: m1,
          materialB: m2,
          matchReasons,
          similarityScore: Math.round(score),
        });
      }
    }
  }

  return pairs.sort((a, b) => b.similarityScore - a.similarityScore);
};

export const getFieldDifferences = (materialA: Material, materialB: Material): FieldDiff[] => {
  const fields: Array<{
    key: keyof Material;
    label: string;
    format?: (value: any) => string | number | string[];
  }> = [
    { key: 'title', label: '标题' },
    { key: 'type', label: '类型' },
    { key: 'work', label: '所属作品' },
    { key: 'publisher', label: '出版社' },
    { key: 'publishDate', label: '出版日期' },
    { key: 'pageCount', label: '总页数' },
    { key: 'pageStart', label: '起始页码' },
    { key: 'pageEnd', label: '结束页码' },
    { key: 'purchaseSource', label: '购买来源' },
    { key: 'scanStatus', label: '扫描状态' },
    { key: 'copyrightNote', label: '版权备注' },
    { key: 'description', label: '描述' },
    { key: 'characterIds', label: '关联角色数量', format: (v) => v?.length || 0 },
    { key: 'staffIds', label: '关联制作人员数量', format: (v) => v?.length || 0 },
    { key: 'pageReferences', label: '页码标注数量', format: (v) => v?.length || 0 },
  ];

  return fields.map(({ key, label, format }) => {
    let valueA: string | number;
    let valueB: string | number;
    
    if (format) {
      valueA = format(materialA[key]) as string | number;
      valueB = format(materialB[key]) as string | number;
    } else {
      valueA = String(materialA[key] || '-');
      valueB = String(materialB[key] || '-');
    }
    
    const isDifferent = String(valueA) !== String(valueB);
    
    return {
      field: key,
      label,
      valueA,
      valueB,
      isDifferent,
    };
  });
};
