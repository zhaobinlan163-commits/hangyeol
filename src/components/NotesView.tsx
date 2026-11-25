import { useEffect, useMemo, useState } from 'react';
import { NotebookPen, Plus, Search, Tag, Trash2 } from 'lucide-react';
import type { StudyNote } from '../types/learning';

interface NotesViewProps {
  notes: StudyNote[];
  onCreate: (title?: string, body?: string, tags?: string[]) => string;
  onUpdate: (id: string, patch: { title?: string; body?: string; tags?: string[] }) => void;
  onDelete: (id: string) => void;
  focusNoteId?: string | null;
}

function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function parseTags(raw: string): string[] {
  return raw
    .split(/[\s,，、]+/)
    .map((tag) => tag.replace(/^#/, '').trim())
    .filter(Boolean)
    .slice(0, 6);
}

export function NotesView({ notes, onCreate, onUpdate, onDelete, focusNoteId }: NotesViewProps) {
  const sorted = useMemo(() => [...notes].sort((a, b) => b.updatedAt - a.updatedAt), [notes]);
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<string | null>(sorted[0]?.id ?? null);

  useEffect(() => {
    if (focusNoteId) setSelectedId(focusNoteId);
  }, [focusNoteId]);

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const note of sorted) {
      for (const tag of note.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([tag]) => tag);
  }, [sorted]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sorted.filter((note) => {
      if (activeTag !== 'all' && !note.tags.includes(activeTag)) return false;
      if (!q) return true;
      return (
        note.title.toLowerCase().includes(q) ||
        note.body.toLowerCase().includes(q) ||
        note.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }, [sorted, query, activeTag]);

  const activeNote = sorted.find((note) => note.id === selectedId) ?? filtered[0] ?? null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <NotebookPen className="w-5 h-5 text-blue-700" aria-hidden="true" />
          笔记本
        </h1>
        <button
          type="button"
          onClick={() => {
            const id = onCreate('新笔记', '', activeTag === 'all' ? [] : [activeTag]);
            setSelectedId(id);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          新建
        </button>
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
          <button
            type="button"
            onClick={() => setActiveTag('all')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md border cursor-pointer ${
              activeTag === 'all'
                ? 'bg-slate-800 border-slate-800 text-white'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            全部
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setActiveTag(tag)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md border cursor-pointer ${
                activeTag === tag
                  ? 'bg-blue-700 border-blue-700 text-white'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* List */}
        <section className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
          <div className="relative">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索笔记"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
            />
          </div>

          {filtered.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">
              {sorted.length === 0 ? '还没有笔记，点「新建」写第一条。' : '没有匹配的笔记。'}
            </p>
          ) : (
            <ul className="space-y-1 max-h-[26rem] overflow-y-auto pr-1">
              {filtered.map((note) => (
                <li key={note.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(note.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors cursor-pointer ${
                      activeNote?.id === note.id
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {note.title.trim() || '（无标题）'}
                    </p>
                    {note.tags.length > 0 && (
                      <p className="mt-1 flex flex-wrap gap-1">
                        {note.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-1.5 py-0.5 text-[10px] rounded bg-slate-100 text-slate-600"
                          >
                            {tag}
                          </span>
                        ))}
                      </p>
                    )}
                    <p className="text-[11px] text-slate-500 mt-1 tabular-nums">
                      {formatDate(note.updatedAt)}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Editor */}
        <section className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
          {activeNote ? (
            <>
              <input
                type="text"
                value={activeNote.title}
                onChange={(e) => onUpdate(activeNote.id, { title: e.target.value })}
                placeholder="标题"
                className="w-full px-1 py-1 text-lg font-bold text-slate-900 border-0 border-b border-slate-200 focus:outline-none focus:border-blue-500"
              />

              <div className="flex items-center gap-2">
                <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                <input
                  type="text"
                  value={activeNote.tags.join(' ')}
                  onChange={(e) => onUpdate(activeNote.id, { tags: parseTags(e.target.value) })}
                  placeholder="标签，用空格分隔，如 语法 易错"
                  className="flex-1 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                />
              </div>

              <textarea
                value={activeNote.body}
                onChange={(e) => onUpdate(activeNote.id, { body: e.target.value })}
                placeholder="记点什么：今天学到的一个表达、老师纠正的错、想记住的用法…"
                rows={14}
                className="w-full px-3 py-2.5 text-sm leading-relaxed text-slate-800 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 resize-y"
              />

              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-slate-400 tabular-nums">
                  更新于 {formatDate(activeNote.updatedAt)}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onDelete(activeNote.id);
                    setSelectedId(null);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  删除
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500 py-16 text-center">选一条笔记，或新建一条。</p>
          )}
        </section>
      </div>
    </div>
  );
}
