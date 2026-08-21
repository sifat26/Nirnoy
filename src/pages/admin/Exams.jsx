import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { adminListExams, adminCreateExam, adminUploadExam, adminUpdateExam, adminDeleteExam, adminListCategories } from '../../api';
import { ApiError } from '../../api/client';
import { Spinner } from '../../components/Spinner';
import { EmptyState, ErrorBanner, Badge } from '../../components/ui';
import { categoryLabel } from '../../lib/categories';
import { useExamFormState, emptyExamState, stateToUploadObject, FormEditor, TabButton } from '../../components/ExamForm';

const SAMPLE = `{
  "examTitle": "Sample Quiz",
  "duration_minutes": 15,
  "subject": "Physics",
  "grade": "SSC",
  "questions": [
    {
      "id": 1,
      "question": "What is 2 + 2?",
      "options": { "A": "3", "B": "4", "C": "5" },
      "correct_answer": "B",
      "explanation": "Basic arithmetic."
    }
  ]
}`;

export default function Exams() {
  const [exams, setExams] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showNew, setShowNew] = useState(false);
  const [mode, setMode] = useState('form'); // form | paste | upload
  const [jsonText, setJsonText] = useState('');
  const [file, setFile] = useState(null);
  const [category, setCategory] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const fileInputRef = useRef(null);
  const createForm = useExamFormState(emptyExamState());

  async function load() {
    setLoading(true);
    try {
      const data = await adminListExams();
      setExams(data.exams || []);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load exams');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // Category options are optional metadata — never block the exam list on them.
    adminListCategories()
      .then((data) => setCategories(data.categories || []))
      .catch(() => setCategories([]));
  }, []);

  function resetNew() {
    setShowNew(false);
    setJsonText('');
    setFile(null);
    setCategory('');
    setCreateError(null);
    createForm.reset(emptyExamState());
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function create() {
    setCreateError(null);
    setCreating(true);
    try {
      if (mode === 'form') {
        await adminCreateExam(stateToUploadObject(createForm.meta, createForm.questions));
      } else if (mode === 'upload') {
        if (!file) throw new ApiError('Please choose a .json file', 0);
        await adminUploadExam(file, category);
      } else {
        let payload;
        try {
          payload = JSON.parse(jsonText);
        } catch {
          throw new ApiError('That is not valid JSON. Check for trailing commas or quotes.', 0);
        }
        await adminCreateExam({ ...payload, category });
      }
      resetNew();
      await load();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err : new ApiError('Failed to create exam', 0));
    } finally {
      setCreating(false);
    }
  }

  async function togglePublish(exam) {
    setBusyId(exam.id);
    try {
      const { exam: updated } = await adminUpdateExam(exam.id, { published: !exam.published });
      setExams((list) => list.map((e) => (e.id === exam.id ? { ...e, published: updated.published } : e)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(exam) {
    if (!window.confirm(`Delete "${exam.title}"? This also removes its attempts view. This cannot be undone.`)) return;
    setBusyId(exam.id);
    try {
      await adminDeleteExam(exam.id);
      setExams((list) => list.filter((e) => e.id !== exam.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete');
    } finally {
      setBusyId(null);
    }
  }

  function copyLink(exam) {
    const url = `${window.location.origin}/exam/${exam.slug}/start`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopiedId(exam.id);
      setTimeout(() => setCopiedId((c) => (c === exam.id ? null : c)), 1500);
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Exams</h1>
          <p className="text-slate-500 text-sm">Create, publish, and share exams.</p>
        </div>
        <button
          onClick={() => setShowNew((s) => !s)}
          className="text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg transition-colors"
        >
          {showNew ? 'Close' : '+ New Exam'}
        </button>
      </div>

      {/* New exam panel */}
      {showNew && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <div className="flex gap-2 mb-4">
            <TabButton active={mode === 'form'} onClick={() => setMode('form')}>Build with form</TabButton>
            <TabButton active={mode === 'paste'} onClick={() => setMode('paste')}>Paste JSON</TabButton>
            <TabButton active={mode === 'upload'} onClick={() => setMode('upload')}>Upload file</TabButton>
          </div>

          {mode !== 'form' && (
            <div className="mb-4">
              <label htmlFor="exam-category" className="block text-sm font-medium text-slate-700 mb-1">
                Category
              </label>
              <select
                id="exam-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full sm:w-64 px-3 py-2.5 rounded-lg border border-slate-300 focus:border-emerald-500 outline-none text-slate-900 bg-white"
              >
                <option value="">Uncategorized</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                    {c.nameBn ? ` — ${c.nameBn}` : ''}
                    {c.active ? '' : ' (hidden)'}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-400 mt-1">
                Applies to both paste and upload. Overrides any <code>category</code> field in the JSON.
              </p>
            </div>
          )}

          {mode === 'form' ? (
            <FormEditor
              meta={createForm.meta}
              questions={createForm.questions}
              categories={categories}
              updateMeta={createForm.updateMeta}
              updateQuestion={createForm.updateQuestion}
              updateOption={createForm.updateOption}
              updateOptionKey={createForm.updateOptionKey}
              addOption={createForm.addOption}
              removeOption={createForm.removeOption}
              addQuestion={createForm.addQuestion}
              removeQuestion={createForm.removeQuestion}
              moveQuestion={createForm.moveQuestion}
            />
          ) : mode === 'paste' ? (
            <div>
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                rows={12}
                spellCheck={false}
                placeholder={SAMPLE}
                className="w-full font-mono text-xs px-3 py-3 rounded-lg border border-slate-300 focus:border-emerald-500 outline-none text-slate-900 resize-y"
              />
              <p className="text-xs text-slate-400 mt-1">
                Accepts <code>examTitle</code> + <code>duration_minutes</code> + <code>questions[]</code> (with{' '}
                <code>options</code> and <code>correct_answer</code>).
              </p>
            </div>
          ) : (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
              />
              {file && <p className="text-xs text-slate-500 mt-2">Selected: {file.name}</p>}
            </div>
          )}

          {createError && <div className="mt-3"><ErrorBanner message={createError.message} details={createError.details} /></div>}

          <div className="flex gap-3 mt-4">
            <button
              onClick={create}
              disabled={creating}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              {creating && <Spinner className="w-4 h-4" />}
              Create exam
            </button>
            <button onClick={resetNew} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors">
              Cancel
            </button>
          </div>
          {mode !== 'form' && (
            <p className="text-xs text-slate-400 mt-3">New exams start unpublished. Publish when you're ready to share.</p>
          )}
        </div>
      )}

      {error && <div className="mb-4"><ErrorBanner message={error} /></div>}

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : exams.length === 0 ? (
        <EmptyState title="No exams yet" subtitle="Create your first exam with the button above." />
      ) : (
        <div className="space-y-3">
          {exams.map((exam) => (
            <div key={exam.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link to={`/admin/exams/${exam.id}`} className="font-semibold text-slate-900 hover:text-emerald-700 truncate">
                      {exam.title}
                    </Link>
                    {exam.published ? <Badge color="emerald">Published</Badge> : <Badge color="amber">Draft</Badge>}
                    {exam.category && <Badge color="blue">{categoryLabel(exam.category, categories)}</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-500">
                    <span>{exam.questionCount} questions</span>
                    <span>{exam.durationMinutes} min</span>
                    <span>{exam.attempts} attempts</span>
                    <span>avg {exam.avgPercentage}%</span>
                    <span className="font-mono text-slate-400">/{exam.slug}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => togglePublish(exam)}
                  disabled={busyId === exam.id}
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                    exam.published ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  {exam.published ? 'Unpublish' : 'Publish'}
                </button>
                <button
                  onClick={() => copyLink(exam)}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  {copiedId === exam.id ? 'Copied!' : 'Copy link'}
                </button>
                <Link
                  to={`/admin/exams/${exam.id}/edit`}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                >
                  Edit
                </Link>
                <Link
                  to={`/admin/exams/${exam.id}`}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  Results
                </Link>
                <button
                  onClick={() => remove(exam)}
                  disabled={busyId === exam.id}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 ml-auto"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
