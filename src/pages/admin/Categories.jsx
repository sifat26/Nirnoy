import { useState, useEffect } from 'react';
import {
  adminListCategories,
  adminCreateCategory,
  adminUpdateCategory,
  adminDeleteCategory,
} from '../../api';
import { ApiError } from '../../api/client';
import { Spinner } from '../../components/Spinner';
import { EmptyState, ErrorBanner, Badge } from '../../components/ui';

const EMPTY_NEW = { name: '', nameBn: '', slug: '', order: '' };

export default function Categories() {
  const [items, setItems] = useState([]);
  const [uncategorized, setUncategorized] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);

  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState(EMPTY_NEW);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', nameBn: '', order: '' });
  const [savingId, setSavingId] = useState(null);
  const [editError, setEditError] = useState(null);

  const [busyId, setBusyId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const data = await adminListCategories();
      setItems(data.categories || []);
      setUncategorized(data.uncategorizedCount || 0);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openNew() {
    const nextOrder = items.length ? Math.max(...items.map((c) => c.order || 0)) + 1 : 1;
    setNewForm({ ...EMPTY_NEW, order: String(nextOrder) });
    setCreateError(null);
    setShowNew(true);
  }

  function cancelNew() {
    setShowNew(false);
    setNewForm(EMPTY_NEW);
    setCreateError(null);
  }

  const updateNew = (key) => (e) => setNewForm((f) => ({ ...f, [key]: e.target.value }));

  async function create() {
    setCreateError(null);
    if (!newForm.name.trim()) {
      setCreateError(new ApiError('Please enter a category name.', 0));
      return;
    }
    setCreating(true);
    try {
      const payload = {
        name: newForm.name.trim(),
        nameBn: newForm.nameBn.trim(),
        active: true,
      };
      if (newForm.slug.trim()) payload.slug = newForm.slug.trim();
      if (newForm.order !== '' && !Number.isNaN(Number(newForm.order))) payload.order = Number(newForm.order);
      await adminCreateCategory(payload);
      cancelNew();
      await load();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err : new ApiError('Failed to create category', 0));
    } finally {
      setCreating(false);
    }
  }

  function startEdit(cat) {
    setActionError(null);
    setEditError(null);
    setEditingId(cat.id);
    setEditForm({ name: cat.name, nameBn: cat.nameBn || '', order: String(cat.order ?? 0) });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError(null);
  }

  const updateEdit = (key) => (e) => setEditForm((f) => ({ ...f, [key]: e.target.value }));

  async function saveEdit(cat) {
    setEditError(null);
    if (!editForm.name.trim()) {
      setEditError('Name cannot be empty.');
      return;
    }
    setSavingId(cat.id);
    try {
      const patch = { name: editForm.name.trim(), nameBn: editForm.nameBn.trim() };
      if (editForm.order !== '' && !Number.isNaN(Number(editForm.order))) patch.order = Number(editForm.order);
      const { category } = await adminUpdateCategory(cat.id, patch);
      setItems((list) =>
        list
          .map((c) => (c.id === cat.id ? { ...c, ...category } : c))
          .sort((a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name))
      );
      setEditingId(null);
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : 'Failed to save changes');
    } finally {
      setSavingId(null);
    }
  }

  async function toggleActive(cat) {
    setActionError(null);
    setBusyId(cat.id);
    try {
      const { category } = await adminUpdateCategory(cat.id, { active: !cat.active });
      setItems((list) => list.map((c) => (c.id === cat.id ? { ...c, active: category.active } : c)));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to update category');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(cat) {
    setActionError(null);
    if (!window.confirm(`Delete the "${cat.name}" category? This cannot be undone.`)) return;
    setBusyId(cat.id);
    try {
      await adminDeleteCategory(cat.id);
      setItems((list) => list.filter((c) => c.id !== cat.id));
    } catch (err) {
      // 409 = still used by exams; surface the server's guidance.
      setActionError(err instanceof ApiError ? err.message : 'Failed to delete category');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Categories</h1>
          <p className="text-slate-500 text-sm">Group exams by SSC, HSC, Job Preparation, and more.</p>
        </div>
        <button
          onClick={() => (showNew ? cancelNew() : openNew())}
          className="text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg transition-colors"
        >
          {showNew ? 'Close' : '+ New Category'}
        </button>
      </div>

      {/* New category panel */}
      {showNew && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="cat-name" className="block text-sm font-medium text-slate-700 mb-1">
                Name <span className="text-slate-400 font-normal">(English)</span>
              </label>
              <input
                id="cat-name"
                type="text"
                value={newForm.name}
                onChange={updateNew('name')}
                placeholder="e.g. Job Preparation"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-emerald-500 outline-none text-slate-900"
              />
            </div>
            <div>
              <label htmlFor="cat-nameBn" className="block text-sm font-medium text-slate-700 mb-1">
                Bengali name <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                id="cat-nameBn"
                type="text"
                value={newForm.nameBn}
                onChange={updateNew('nameBn')}
                placeholder="যেমন চাকরির প্রস্তুতি"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-emerald-500 outline-none text-slate-900"
              />
            </div>
            <div>
              <label htmlFor="cat-slug" className="block text-sm font-medium text-slate-700 mb-1">
                Slug <span className="text-slate-400 font-normal">(optional, permanent)</span>
              </label>
              <input
                id="cat-slug"
                type="text"
                value={newForm.slug}
                onChange={updateNew('slug')}
                placeholder="auto from name — e.g. job-preparation"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-emerald-500 outline-none text-slate-900 font-mono text-sm"
              />
              <p className="text-xs text-slate-400 mt-1">Required if the name is Bengali-only. Cannot be changed later.</p>
            </div>
            <div>
              <label htmlFor="cat-order" className="block text-sm font-medium text-slate-700 mb-1">
                Order
              </label>
              <input
                id="cat-order"
                type="number"
                value={newForm.order}
                onChange={updateNew('order')}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-emerald-500 outline-none text-slate-900"
              />
            </div>
          </div>

          {createError && <div className="mt-3"><ErrorBanner message={createError.message} details={createError.details} /></div>}

          <div className="flex gap-3 mt-4">
            <button
              onClick={create}
              disabled={creating}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              {creating && <Spinner className="w-4 h-4" />}
              Create category
            </button>
            <button onClick={cancelNew} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <div className="mb-4"><ErrorBanner message={error} /></div>}
      {actionError && <div className="mb-4"><ErrorBanner message={actionError} /></div>}

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : items.length === 0 ? (
        <EmptyState title="No categories yet" subtitle="Create your first category with the button above." />
      ) : (
        <div className="space-y-3">
          {items.map((cat) => (
            <div key={cat.id} className={`bg-white rounded-xl border p-4 ${cat.active ? 'border-slate-200' : 'border-slate-200 opacity-70'}`}>
              {editingId === cat.id ? (
                <div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-1">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Name</label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={updateEdit('name')}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-emerald-500 outline-none text-slate-900"
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Bengali name</label>
                      <input
                        type="text"
                        value={editForm.nameBn}
                        onChange={updateEdit('nameBn')}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-emerald-500 outline-none text-slate-900"
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Order</label>
                      <input
                        type="number"
                        value={editForm.order}
                        onChange={updateEdit('order')}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-emerald-500 outline-none text-slate-900"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Slug <span className="font-mono">/{cat.slug}</span> is permanent and can't be edited.
                  </p>
                  {editError && <p className="text-xs text-red-600 mt-2">{editError}</p>}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => saveEdit(cat)}
                      disabled={savingId === cat.id}
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2"
                    >
                      {savingId === cat.id && <Spinner className="w-4 h-4" />}
                      Save
                    </button>
                    <button onClick={cancelEdit} className="text-sm font-medium px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900 truncate">{cat.name}</span>
                      {cat.nameBn && <span className="text-slate-500 text-sm truncate">{cat.nameBn}</span>}
                      {cat.active ? <Badge color="emerald">Active</Badge> : <Badge color="slate">Hidden</Badge>}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-500">
                      <span className="font-mono text-slate-400">/{cat.slug}</span>
                      <span>order {cat.order ?? 0}</span>
                      <span>{cat.examCount} exam{cat.examCount === 1 ? '' : 's'}</span>
                    </div>
                  </div>
                </div>
              )}

              {editingId !== cat.id && (
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => startEdit(cat)}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => toggleActive(cat)}
                    disabled={busyId === cat.id}
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                      cat.active ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    {cat.active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => remove(cat)}
                    disabled={busyId === cat.id}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 ml-auto"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && uncategorized > 0 && (
        <p className="text-xs text-slate-400 mt-4">
          {uncategorized} exam{uncategorized === 1 ? '' : 's'} have no category — they appear only under the “All” tab.
        </p>
      )}
    </div>
  );
}
