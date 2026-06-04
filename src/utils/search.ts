import { Material, SearchFilters } from '../types';

export const searchMaterials = (materials: Material[], filters: SearchFilters): Material[] => {
  return materials.filter((material) => {
    if (filters.work && !material.work.includes(filters.work)) {
      return false;
    }

    if (filters.characterId && !material.characterIds.includes(filters.characterId)) {
      return false;
    }

    if (filters.staffId && !material.staffIds.includes(filters.staffId)) {
      return false;
    }

    if (filters.type && material.type !== filters.type) {
      return false;
    }

    if (filters.yearFrom && material.publishDate) {
      const year = parseInt(material.publishDate.split('-')[0]);
      if (year < filters.yearFrom) {
        return false;
      }
    }

    if (filters.yearTo && material.publishDate) {
      const year = parseInt(material.publishDate.split('-')[0]);
      if (year > filters.yearTo) {
        return false;
      }
    }

    if (filters.keyword) {
      const keyword = filters.keyword.toLowerCase();
      const searchFields = [
        material.title,
        material.work,
        material.publisher,
        material.description,
        material.copyrightNote,
      ].join(' ').toLowerCase();
      
      if (!searchFields.includes(keyword)) {
        return false;
      }
    }

    return true;
  });
};

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};
