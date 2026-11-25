import { useCallback, useEffect, useState } from 'react';
import type { StudyNote } from '../types/learning';

const NOTES_STORAGE_KEY = 'hangyeol_notes_v1';
const MAX_TAGS = 6;

function normalizeTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const item of raw) {
    const tag = String(item || '').trim().slice(0, 16);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    tags.push(tag);
    if (tags.length >= MAX_TAGS) break;
  }
  return tags;
}

function loadInitialNotes(): StudyNote[] {
  try {
    const raw = window.localStorage.getItem(NOTES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<Partial<StudyNote>>;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item.id === 'string')
      .map((item) => ({
        id: String(item.id),
        title: typeof item.title === 'string' ? item.title : '',
        body: typeof item.body === 'string' ? item.body : '',
        tags: normalizeTags(item.tags),
        createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now(),
        updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : Date.now(),
      }))
      .slice(0, 500);
  } catch {
    return [];
  }
}

export function useNotesStore() {
  const [notes, setNotes] = useState<StudyNote[]>(loadInitialNotes);

  useEffect(() => {
    try {
      window.localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
    } catch {
      // Ignore quota errors
    }
  }, [notes]);

  const createNote = useCallback((title = '', body = '', tags: string[] = []): string => {
    const now = Date.now();
    const id = `note-${now}-${Math.random().toString(36).slice(2, 7)}`;
    setNotes((prev) => [
      { id, title, body, tags: normalizeTags(tags), createdAt: now, updatedAt: now },
      ...prev,
    ]);
    return id;
  }, []);

  const updateNote = useCallback(
    (id: string, patch: { title?: string; body?: string; tags?: string[] }) => {
      setNotes((prev) =>
        prev.map((note) =>
          note.id === id
            ? {
                ...note,
                title: patch.title ?? note.title,
                body: patch.body ?? note.body,
                tags: patch.tags ? normalizeTags(patch.tags) : note.tags,
                updatedAt: Date.now(),
              }
            : note
        )
      );
    },
    []
  );

  const deleteNote = useCallback((id: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== id));
  }, []);

  return { notes, createNote, updateNote, deleteNote };
}
