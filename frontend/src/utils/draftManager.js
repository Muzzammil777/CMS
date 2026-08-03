/**
 * Centralized Draft Manager
 * Handles saving, retrieving, restoring, and deleting drafts across all entity pages.
 */

const STORAGE_PREFIX = 'cms_drafts_';

export function getLocalDrafts(category) {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${category}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error(`Error reading drafts for ${category}:`, e);
    return [];
  }
}

export function saveLocalDraft(category, draftItem) {
  try {
    const current = getLocalDrafts(category);
    const id = draftItem.id || `DRAFT-${category.toUpperCase()}-${Date.now()}`;
    const updatedAt = new Date().toISOString();

    const newDraft = {
      ...draftItem,
      id,
      updatedAt,
      isDraft: true,
    };

    const existingIdx = current.findIndex(d => d.id === id);
    let updatedList = [];

    if (existingIdx >= 0) {
      updatedList = [...current];
      updatedList[existingIdx] = newDraft;
    } else {
      updatedList = [newDraft, ...current];
    }

    localStorage.setItem(`${STORAGE_PREFIX}${category}`, JSON.stringify(updatedList));
    return newDraft;
  } catch (e) {
    console.error(`Error saving draft for ${category}:`, e);
    return null;
  }
}

export function deleteLocalDraft(category, draftId) {
  try {
    const current = getLocalDrafts(category);
    const updated = current.filter(d => d.id !== draftId);
    localStorage.setItem(`${STORAGE_PREFIX}${category}`, JSON.stringify(updated));
    return true;
  } catch (e) {
    console.error(`Error deleting draft ${draftId}:`, e);
    return false;
  }
}

export function clearCategoryDrafts(category) {
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${category}`);
  } catch (e) {
    console.error(`Error clearing drafts for ${category}:`, e);
  }
}
