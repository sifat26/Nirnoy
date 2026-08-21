import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { adminGetExam, adminReplaceExam, adminListCategories } from '../../api';
import { ApiError } from '../../api/client';
import { Spinner } from '../../components/Spinner';
import { ErrorBanner, Badge } from '../../components/ui';
import {
  FormEditor,
  TabButton,
  useExamFormState,
  emptyExamState,
  examToState,
  stateToUploadObject,
} from '../../components/ExamForm';

export default function ExamEdit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [saved, setSaved] = useState(false);
  const form = useExamFormState(emptyExamState(), () => setSaved(false));
  const { meta, questions } = form;

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [tab, setTab] = useState('form'); // form | json
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    adminGetExam(id)
      .then(({ exam }) => form.reset(examToState(exam)))
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'Failed to load exam'))
      .finally(() => setLoading(false));
    // Category options are optional metadata — never block the editor on them.
    adminListCategories()
      .then((data) => setCategories(data.categories || []))
      .catch(() => setCategories([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ---- tab switching (keeps Form and JSON in sync through state) ----
  function goJson() {
    setJsonText(JSON.stringify(stateToUploadObject(meta, questions), null, 2));
    setJsonError(null);
    setTab('json');
  }
  function goForm() {
    try {
      const parsed = JSON.parse(jsonText);
      form.reset(examToState(parsed));
      setJsonError(null);
      setTab('form');
    } catch (err) {
      setJsonError(`Invalid JSON: ${err.message}`);
    }
  }

  async function save() {
    setSaveError(null);
    setSaved(false);
    let payload;
    if (tab === 'json') {
      try {
        payload = JSON.parse(jsonText);
      } catch (err) {
        setJsonError(`Invalid JSON: ${err.message}`);
        return;
      }
      setJsonError(null);
    } else {
      payload = stateToUploadObject(meta, questions);
    }

    setSaving(true);
    try {
      const { exam } = await adminReplaceExam(id, payload);
      const s = examToState(exam);
      form.reset(s);
      if (tab === 'json') setJsonText(JSON.stringify(stateToUploadObject(s.meta, s.questions), null, 2));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err : new ApiError('Failed to save exam', 0));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (loadError) return <ErrorBanner message={loadError} />;

  const SaveButton = (
    <button
      onClick={save}
      disabled={saving}
      className="text-sm font-semibold px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors flex items-center gap-2"
    >
      {saving && <Spinner className="w-4 h-4" />}
      {saved ? 'Saved ✓' : 'Save changes'}
    </button>
  );

  return (
    <div>
      <button
        onClick={() => navigate('/admin/exams')}
        className="text-sm text-slate-500 hover:text-slate-700 mb-3 flex items-center gap-1"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to exams
      </button>

      <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900 truncate">Edit: {meta.title || 'Untitled'}</h1>
            {meta.published ? <Badge color="emerald">Published</Badge> : <Badge color="amber">Draft</Badge>}
          </div>
          <p className="text-slate-500 text-sm mt-0.5 font-mono">/{meta.slug}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/admin/exams/${id}`}
            className="text-sm font-medium px-3 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            Results
          </Link>
          {SaveButton}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <TabButton active={tab === 'form'} onClick={() => (tab === 'json' ? goForm() : setTab('form'))}>
          Form
        </TabButton>
        <TabButton active={tab === 'json'} onClick={() => (tab === 'form' ? goJson() : setTab('json'))}>
          JSON
        </TabButton>
      </div>

      {saveError && (
        <div className="mb-4">
          <ErrorBanner message={saveError.message} details={saveError.details} />
        </div>
      )}

      {tab === 'json' ? (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <label htmlFor="exam-json" className="block text-sm font-medium text-slate-700 mb-1">
            Exam JSON
          </label>
          <textarea
            id="exam-json"
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              setJsonError(null);
              setSaved(false);
            }}
            rows={22}
            spellCheck={false}
            className="w-full font-mono text-xs px-3 py-3 rounded-lg border border-slate-300 focus:border-emerald-500 outline-none text-slate-900 resize-y"
          />
          {jsonError && <p className="text-xs text-red-600 mt-1.5">{jsonError}</p>}
          <p className="text-xs text-slate-400 mt-1.5">
            Edit the whole exam here, then <b>Save changes</b>. Switching back to <b>Form</b> parses this JSON. Uses the
            same format as the create screen (<code>examTitle</code>, <code>duration_minutes</code>, <code>questions[]</code>{' '}
            with <code>options</code> + <code>correct_answer</code>).
          </p>
        </div>
      ) : (
        <FormEditor
          meta={meta}
          questions={questions}
          categories={categories}
          updateMeta={form.updateMeta}
          updateQuestion={form.updateQuestion}
          updateOption={form.updateOption}
          updateOptionKey={form.updateOptionKey}
          addOption={form.addOption}
          removeOption={form.removeOption}
          addQuestion={form.addQuestion}
          removeQuestion={form.removeQuestion}
          moveQuestion={form.moveQuestion}
        />
      )}

      <div className="flex items-center gap-3 mt-6">
        {SaveButton}
        <span className="text-xs text-slate-400">
          Editing questions won't change already-submitted results — only future attempts use the new content.
        </span>
      </div>
    </div>
  );
}
