import type { Category } from '../types';

export interface ClassificationResult {
  categoryId: string;
  categoryName: string;
  matchedKeyword?: string;
  isAutoClassified: boolean;
}

/**
 * Classifies a transaction based on user defined category keyword rules.
 * Prioritizes user categories top-to-bottom and matches exact or partial keywords inside description.
 */
export function autoClassifyTransaction(
  description: string,
  categories: Category[],
  flowType?: string
): ClassificationResult {
  if (!description || description.trim() === '') {
    return {
      categoryId: '',
      categoryName: '미분류',
      isAutoClassified: false,
    };
  }

  const cleanDesc = description.trim().toLowerCase();

  // Filter categories by flow_type if provided ('지출' | '수입' | '이체')
  const targetCategories = flowType
    ? categories.filter(c => c.type === flowType)
    : categories;

  for (const cat of targetCategories) {
    if (!cat.keywords || cat.keywords.length === 0) continue;

    for (const kw of cat.keywords) {
      const cleanKw = kw.trim().toLowerCase();
      if (!cleanKw) continue;

      if (cleanDesc.includes(cleanKw)) {
        return {
          categoryId: cat.id,
          categoryName: cat.name,
          matchedKeyword: kw,
          isAutoClassified: true,
        };
      }
    }
  }

  // Default fallback if no keyword matches
  const uncategorized = categories.find(c => c.name === '미분류');

  return {
    categoryId: uncategorized ? uncategorized.id : '',
    categoryName: uncategorized ? uncategorized.name : '미분류',
    isAutoClassified: false,
  };
}
