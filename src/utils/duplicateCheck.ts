import { Material } from '../types';

export interface DuplicateRuleWeights {
  titleSimilarity: number;
  workSame: number;
  publishDateSame: number;
  pageCountClose: number;
  characterOverlap: number;
}

export interface DuplicateRuleThresholds {
  titleSimilarityMin: number;
  pageCountMaxDiff: number;
  characterOverlapMin: number;
  overallMinScore: number;
  minMatchReasons: number;
}

export interface DuplicateCheckRules {
  weights: DuplicateRuleWeights;
  thresholds: DuplicateRuleThresholds;
}

export const DEFAULT_DUPLICATE_RULES: DuplicateCheckRules = {
  weights: {
    titleSimilarity: 40,
    workSame: 25,
    publishDateSame: 20,
    pageCountClose: 15,
    characterOverlap: 20,
  },
  thresholds: {
    titleSimilarityMin: 50,
    pageCountMaxDiff: 5,
    characterOverlapMin: 1,
    overallMinScore: 30,
    minMatchReasons: 2,
  },
};

export interface DuplicatePair {
  id: string;
  materialA: Material;
  materialB: Material;
  matchReasons: string[];
  similarityScore: number;
}

export interface SimilarMaterial {
  material: Material;
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

const calculateCharacterOverlap = (
  chars1: string[],
  chars2: string[]
): { count: number; ratio: number } => {
  if (!chars1.length || !chars2.length) return { count: 0, ratio: 0 };

  const set1 = new Set(chars1);
  const set2 = new Set(chars2);
  let commonCount = 0;

  set1.forEach((c) => {
    if (set2.has(c)) commonCount++;
  });

  const totalCount = Math.max(set1.size, set2.size);
  return {
    count: commonCount,
    ratio: totalCount > 0 ? commonCount / totalCount : 0,
  };
};

export const calculateSimilarity = (
  materialA: Omit<Material, 'id' | 'createdAt' | 'updatedAt'> | Material,
  materialB: Material,
  rules: DuplicateCheckRules = DEFAULT_DUPLICATE_RULES
): { score: number; reasons: string[] } => {
  const { weights, thresholds } = rules;
  const reasons: string[] = [];
  let score = 0;

  const titleSimilarity = calculateStringSimilarity(materialA.title, materialB.title);
  if (titleSimilarity >= thresholds.titleSimilarityMin) {
    reasons.push(`标题相似 (${titleSimilarity}%)`);
    score += (titleSimilarity / 100) * weights.titleSimilarity;
  }

  if (materialA.work && materialB.work && materialA.work === materialB.work) {
    reasons.push('作品相同');
    score += weights.workSame;
  }

  if (materialA.publishDate && materialB.publishDate && materialA.publishDate === materialB.publishDate) {
    reasons.push('出版日期相同');
    score += weights.publishDateSame;
  }

  if (
    materialA.pageCount &&
    materialB.pageCount &&
    Math.abs(materialA.pageCount - materialB.pageCount) <= thresholds.pageCountMaxDiff
  ) {
    reasons.push(`页数接近 (±${thresholds.pageCountMaxDiff}页)`);
    score += weights.pageCountClose;
  }

  const charOverlap = calculateCharacterOverlap(
    materialA.characterIds || [],
    materialB.characterIds || []
  );
  if (charOverlap.count >= thresholds.characterOverlapMin && charOverlap.count > 0) {
    reasons.push(`关联角色重合 (${charOverlap.count}个)`);
    score += charOverlap.ratio * weights.characterOverlap;
  }

  return { score: Math.round(score), reasons };
};

export const findDuplicatePairs = (
  materials: Material[],
  rules: DuplicateCheckRules = DEFAULT_DUPLICATE_RULES
): DuplicatePair[] => {
  const pairs: DuplicatePair[] = [];
  const processedPairs = new Set<string>();

  for (let i = 0; i < materials.length; i++) {
    for (let j = i + 1; j < materials.length; j++) {
      const m1 = materials[i];
      const m2 = materials[j];

      const pairKey = `${m1.id}-${m2.id}`;
      if (processedPairs.has(pairKey)) continue;

      const { score, reasons } = calculateSimilarity(m1, m2, rules);

      if (score >= rules.thresholds.overallMinScore && reasons.length >= rules.thresholds.minMatchReasons) {
        processedPairs.add(pairKey);
        pairs.push({
          id: pairKey,
          materialA: m1,
          materialB: m2,
          matchReasons: reasons,
          similarityScore: score,
        });
      }
    }
  }

  return pairs.sort((a, b) => b.similarityScore - a.similarityScore);
};

export const findSimilarMaterials = (
  targetMaterial: Omit<Material, 'id' | 'createdAt' | 'updatedAt'> | Material,
  existingMaterials: Material[],
  rules: DuplicateCheckRules = DEFAULT_DUPLICATE_RULES,
  maxResults: number = 3
): SimilarMaterial[] => {
  const similarMaterials: SimilarMaterial[] = [];

  existingMaterials.forEach((existing) => {
    const { score, reasons } = calculateSimilarity(targetMaterial, existing, rules);

    if (score >= rules.thresholds.overallMinScore && reasons.length >= rules.thresholds.minMatchReasons) {
      similarMaterials.push({
        material: existing,
        matchReasons: reasons,
        similarityScore: score,
      });
    }
  });

  return similarMaterials
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, maxResults);
};

export const getFieldDifferences = (materialA: Material, materialB: Material): FieldDiff[] => {
  const getArrayLength = (arr: unknown): number => {
    return Array.isArray(arr) ? arr.length : 0;
  };

  const fields: Array<{
    key: keyof Material;
    label: string;
    format?: (value: Material[keyof Material]) => number;
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
    { key: 'characterIds', label: '关联角色数量', format: getArrayLength },
    { key: 'staffIds', label: '关联制作人员数量', format: getArrayLength },
    { key: 'pageReferences', label: '页码标注数量', format: getArrayLength },
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
