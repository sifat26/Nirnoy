import { useState, useMemo, useRef } from 'react';

// Shared exam form editor + state, used by both the "New exam" panel (create)
// and the exam edit page. Keeps one structured UI + one set of shape transforms.

export const inputCls =
  'w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-emerald-500 outline-none text-slate-900 bg-white';

// ---- shape transforms -------------------------------------------------------

/** A blank exam to start the create form from (one empty question). */
export function emptyExamState() {
  return {
    meta: {
      title: '',
      slug: '',
      description: '',
      subject: '',
      grade: '',
      category: '',
      durationMinutes: 15,
      negativeMarking: 0,
      shuffleQuestions: false,
      shuffleOptions: false,
      published: false,
    },
    questions: [
      {
        qid: '1',
        question: '',
        options: [
          { key: 'A', text: '' },
          { key: 'B', text: '' },
        ],
        correctAnswer: 'A',
        explanation: '',
        marks: 1,
      },
    ],
  };
}

/** Admin GET (options[]/correctAnswer) OR upload JSON (options{}/correct_answer) → editor state. */
export function examToState(exam) {
  const e = exam || {};
  return {
    meta: {
      title: e.title ?? e.examTitle ?? '',
      slug: e.slug ?? '',
      description: e.description ?? '',
      subject: e.subject ?? '',
      grade: e.grade ?? e.class ?? '',
      category: e.category ?? '',
      durationMinutes: e.durationMinutes ?? e.duration_minutes ?? 15,
      negativeMarking: e.negativeMarking ?? 0,
      shuffleQuestions: Boolean(e.shuffleQuestions),
      shuffleOptions: Boolean(e.shuffleOptions),
      published: Boolean(e.published),
    },
    questions: (e.questions || []).map((q, i) => ({
      qid: String(q.qid ?? q.id ?? i + 1),
      question: q.question ?? '',
      options: Array.isArray(q.options)
        ? q.options.map((o) => ({ key: String(o.key), text: o.text ?? '' }))
        : Object.entries(q.options || {}).map(([key, text]) => ({ key: String(key), text: text ?? '' })),
      correctAnswer: q.correctAnswer ?? q.correct_answer ?? '',
      explanation: q.explanation ?? '',
      marks: q.marks ?? 1,
    })),
  };
}

/** Editor state → the upload/create JSON the create + PUT endpoints accept (server canonicalizes it). */
export function stateToUploadObject(meta, questions) {
  return {
    examTitle: meta.title,
    slug: meta.slug || undefined,
    description: meta.description,
    subject: meta.subject,
    grade: meta.grade,
    category: meta.category, // '' clears it
    duration_minutes: Number(meta.durationMinutes) || 0,
    negativeMarking: Number(meta.negativeMarking) || 0,
    shuffleQuestions: Boolean(meta.shuffleQuestions),
    shuffleOptions: Boolean(meta.shuffleOptions),
    published: Boolean(meta.published),
    questions: questions.map((q) => ({
      id: q.qid, // preserve stable qid
      question: q.question,
      options: Object.fromEntries(q.options.map((o) => [o.key, o.text])),
      correct_answer: q.correctAnswer,
      explanation: q.explanation,
      marks: Number(q.marks) || 1,
    })),
  };
}

function nextOptionKey(options) {
  const used = new Set(options.map((o) => o.key));
  for (let i = 0; i < 26; i += 1) {
    const k = String.fromCharCode(65 + i);
    if (!used.has(k)) return k;
  }
  return `O${options.length + 1}`;
}

function nextQid(qs) {
  const nums = qs.map((q) => parseInt(q.qid, 10)).filter((n) => !Number.isNaN(n));
  const max = nums.length ? Math.max(...nums) : qs.length;
  return String(max + 1);
}

// ---- state hook -------------------------------------------------------------

/**
 * Owns meta + questions and all the immutable mutators. `onChange` (optional) is
 * fired on any user edit — used by the edit page to clear its "Saved ✓" flag.
 * `reset()` replaces the whole state (load / after-save) and does NOT fire onChange.
 */
export function useExamFormState(initialState, onChange) {
  const [meta, setMeta] = useState(initialState.meta);
  const [questions, setQuestions] = useState(initialState.questions);
  const changeRef = useRef(onChange);
  changeRef.current = onChange;

  const handlers = useMemo(() => {
    const fire = () => changeRef.current && changeRef.current();
    return {
      updateMeta: (patch) => {
        setMeta((m) => ({ ...m, ...patch }));
        fire();
      },
      updateQuestion: (idx, patch) => {
        setQuestions((qs) => qs.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
        fire();
      },
      updateOption: (qIdx, oIdx, patch) => {
        setQuestions((qs) =>
          qs.map((q, i) =>
            i === qIdx ? { ...q, options: q.options.map((o, j) => (j === oIdx ? { ...o, ...patch } : o)) } : q
          )
        );
        fire();
      },
      updateOptionKey: (qIdx, oIdx, newKey) => {
        setQuestions((qs) =>
          qs.map((q, i) => {
            if (i !== qIdx) return q;
            const oldKey = q.options[oIdx]?.key;
            const options = q.options.map((o, j) => (j === oIdx ? { ...o, key: newKey } : o));
            const correctAnswer = q.correctAnswer === oldKey ? newKey : q.correctAnswer;
            return { ...q, options, correctAnswer };
          })
        );
        fire();
      },
      addOption: (qIdx) => {
        setQuestions((qs) =>
          qs.map((q, i) =>
            i === qIdx ? { ...q, options: [...q.options, { key: nextOptionKey(q.options), text: '' }] } : q
          )
        );
        fire();
      },
      removeOption: (qIdx, oIdx) => {
        setQuestions((qs) =>
          qs.map((q, i) => {
            if (i !== qIdx) return q;
            const removed = q.options[oIdx];
            const options = q.options.filter((_, j) => j !== oIdx);
            const correctAnswer = removed?.key === q.correctAnswer ? options[0]?.key || '' : q.correctAnswer;
            return { ...q, options, correctAnswer };
          })
        );
        fire();
      },
      addQuestion: () => {
        setQuestions((qs) => [
          ...qs,
          {
            qid: nextQid(qs),
            question: '',
            options: [
              { key: 'A', text: '' },
              { key: 'B', text: '' },
            ],
            correctAnswer: 'A',
            explanation: '',
            marks: 1,
          },
        ]);
        fire();
      },
      removeQuestion: (idx) => {
        setQuestions((qs) => qs.filter((_, i) => i !== idx));
        fire();
      },
      moveQuestion: (idx, dir) => {
        setQuestions((qs) => {
          const j = idx + dir;
          if (j < 0 || j >= qs.length) return qs;
          const copy = qs.slice();
          [copy[idx], copy[j]] = [copy[j], copy[idx]];
          return copy;
        });
        fire();
      },
      reset: (state) => {
        setMeta(state.meta);
        setQuestions(state.questions);
      },
    };
  }, []);

  return { meta, questions, ...handlers };
}

// ---- editor UI --------------------------------------------------------------

export function FormEditor({
  meta,
  questions,
  categories,
  updateMeta,
  updateQuestion,
  updateOption,
  updateOptionKey,
  addOption,
  removeOption,
  addQuestion,
  removeQuestion,
  moveQuestion,
}) {
  return (
    <div className="space-y-6">
      {/* Meta */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div>
          <label htmlFor="m-title" className="block text-sm font-medium text-slate-700 mb-1">
            Title
          </label>
          <input
            id="m-title"
            type="text"
            value={meta.title}
            onChange={(e) => updateMeta({ title: e.target.value })}
            placeholder="e.g. Physics — Chapter 1"
            className={inputCls}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="m-category" className="block text-sm font-medium text-slate-700 mb-1">
              Category
            </label>
            <select
              id="m-category"
              value={meta.category}
              onChange={(e) => updateMeta({ category: e.target.value })}
              className={inputCls}
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
          </div>
          <div>
            <label htmlFor="m-slug" className="block text-sm font-medium text-slate-700 mb-1">
              Slug <span className="text-slate-400 font-normal">(URL, optional)</span>
            </label>
            <input
              id="m-slug"
              type="text"
              value={meta.slug}
              onChange={(e) => updateMeta({ slug: e.target.value })}
              placeholder="auto from title"
              className={`${inputCls} font-mono text-sm`}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="m-subject" className="block text-sm font-medium text-slate-700 mb-1">
              Subject <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              id="m-subject"
              type="text"
              value={meta.subject}
              onChange={(e) => updateMeta({ subject: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="m-grade" className="block text-sm font-medium text-slate-700 mb-1">
              Class / grade <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              id="m-grade"
              type="text"
              value={meta.grade}
              onChange={(e) => updateMeta({ grade: e.target.value })}
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label htmlFor="m-desc" className="block text-sm font-medium text-slate-700 mb-1">
            Description <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <textarea
            id="m-desc"
            value={meta.description}
            onChange={(e) => updateMeta({ description: e.target.value })}
            rows={2}
            className={`${inputCls} resize-y`}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="m-duration" className="block text-sm font-medium text-slate-700 mb-1">
              Duration (minutes)
            </label>
            <input
              id="m-duration"
              type="number"
              min={1}
              value={meta.durationMinutes}
              onChange={(e) => updateMeta({ durationMinutes: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="m-neg" className="block text-sm font-medium text-slate-700 mb-1">
              Negative marking <span className="text-slate-400 font-normal">(per wrong)</span>
            </label>
            <input
              id="m-neg"
              type="number"
              min={0}
              step={0.25}
              value={meta.negativeMarking}
              onChange={(e) => updateMeta({ negativeMarking: e.target.value })}
              className={inputCls}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1">
          <Check label="Published" checked={meta.published} onChange={(v) => updateMeta({ published: v })} />
          <Check
            label="Shuffle questions"
            checked={meta.shuffleQuestions}
            onChange={(v) => updateMeta({ shuffleQuestions: v })}
          />
          <Check
            label="Shuffle options"
            checked={meta.shuffleOptions}
            onChange={(v) => updateMeta({ shuffleOptions: v })}
          />
        </div>
      </div>

      {/* Questions */}
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-slate-900">Questions ({questions.length})</h2>
        <button
          onClick={addQuestion}
          className="text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
        >
          + Add question
        </button>
      </div>

      {questions.length === 0 && (
        <p className="text-sm text-slate-500 bg-white border border-slate-200 rounded-xl p-5">
          No questions yet. Add one above (an exam needs at least one).
        </p>
      )}

      {questions.map((q, qIdx) => (
        <div key={q.qid} className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-500">Question {qIdx + 1}</span>
            <div className="flex items-center gap-1">
              <IconBtn label="Move up" disabled={qIdx === 0} onClick={() => moveQuestion(qIdx, -1)}>↑</IconBtn>
              <IconBtn label="Move down" disabled={qIdx === questions.length - 1} onClick={() => moveQuestion(qIdx, 1)}>
                ↓
              </IconBtn>
              <button
                onClick={() => removeQuestion(qIdx)}
                className="text-xs font-medium px-2 py-1 rounded text-red-600 hover:bg-red-50 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>

          <textarea
            value={q.question}
            onChange={(e) => updateQuestion(qIdx, { question: e.target.value })}
            rows={2}
            aria-label={`Question ${qIdx + 1} text`}
            placeholder="Question text"
            className={`${inputCls} resize-y mb-3`}
          />

          <div className="space-y-2">
            {q.options.map((o, oIdx) => (
              <div key={oIdx} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`correct-${q.qid}`}
                  checked={q.correctAnswer === o.key}
                  onChange={() => updateQuestion(qIdx, { correctAnswer: o.key })}
                  aria-label={`Mark option ${o.key} correct`}
                  className="w-4 h-4 accent-emerald-600 shrink-0"
                />
                <input
                  type="text"
                  value={o.key}
                  onChange={(e) => updateOptionKey(qIdx, oIdx, e.target.value)}
                  aria-label={`Option ${oIdx + 1} key`}
                  className="w-14 px-2 py-2 rounded-lg border border-slate-300 focus:border-emerald-500 outline-none text-slate-900 text-center font-mono text-sm shrink-0"
                />
                <input
                  type="text"
                  value={o.text}
                  onChange={(e) => updateOption(qIdx, oIdx, { text: e.target.value })}
                  aria-label={`Option ${oIdx + 1} text`}
                  placeholder="Option text"
                  className={`${inputCls} flex-1`}
                />
                <button
                  onClick={() => removeOption(qIdx, oIdx)}
                  aria-label={`Remove option ${oIdx + 1}`}
                  className="text-slate-400 hover:text-red-600 shrink-0 px-2 py-1 text-lg leading-none"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 mt-2">
            <button onClick={() => addOption(qIdx)} className="text-xs font-medium text-emerald-700 hover:underline">
              + Add option
            </button>
            <span className="text-xs text-slate-400">Select the radio to mark the correct answer.</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 mt-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Explanation (optional)</label>
              <textarea
                value={q.explanation}
                onChange={(e) => updateQuestion(qIdx, { explanation: e.target.value })}
                rows={2}
                aria-label={`Explanation for question ${qIdx + 1}`}
                className={`${inputCls} resize-y`}
              />
            </div>
            <div className="sm:w-28">
              <label className="block text-xs font-medium text-slate-500 mb-1">Marks</label>
              <input
                type="number"
                min={0}
                step={0.5}
                value={q.marks}
                onChange={(e) => updateQuestion(qIdx, { marks: e.target.value })}
                aria-label={`Marks for question ${qIdx + 1}`}
                className={inputCls}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---- small shared bits ------------------------------------------------------

export function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
        active ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {children}
    </button>
  );
}

export function Check({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 accent-emerald-600"
      />
      {label}
    </label>
  );
}

export function IconBtn({ label, disabled, onClick, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="w-7 h-7 rounded flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
    >
      {children}
    </button>
  );
}
