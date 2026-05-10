'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface HoleData {
  hole_number: number;
  par: number | null;
  handicap_index: number | null;
}

interface ScorecardEditorProps {
  courseId: string;
  courseName: string;
  holes: HoleData[];
}

// Build a full 18-hole seed array, merging in existing hole data
function buildInitialState(holes: HoleData[]): { par: string; hcp: string }[] {
  const result: { par: string; hcp: string }[] = Array.from({ length: 18 }, () => ({
    par: '',
    hcp: '',
  }));
  for (const h of holes) {
    const idx = h.hole_number - 1;
    if (idx >= 0 && idx < 18) {
      result[idx] = {
        par: h.par != null ? String(h.par) : '',
        hcp: h.handicap_index != null ? String(h.handicap_index) : '',
      };
    }
  }
  return result;
}

function sumPars(cells: { par: string; hcp: string }[], start: number, end: number): string {
  let total = 0;
  let anyFilled = false;
  for (let i = start; i < end; i++) {
    const v = parseInt(cells[i].par, 10);
    if (!isNaN(v)) {
      total += v;
      anyFilled = true;
    }
  }
  return anyFilled ? String(total) : '';
}

export default function ScorecardEditor({ courseId, courseName, holes }: ScorecardEditorProps) {
  const [open, setOpen] = useState(false);
  const initial = buildInitialState(holes);
  const [cells, setCells] = useState<{ par: string; hcp: string }[]>(initial);
  const [editorEmail, setEditorEmail] = useState('');
  const [editorName, setEditorName] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitCount, setSubmitCount] = useState(0);

  const updateCell = useCallback(
    (idx: number, field: 'par' | 'hcp', value: string) => {
      setCells((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], [field]: value };
        return next;
      });
    },
    []
  );

  // Determine which cells have changed vs. initial
  const changedFields: Array<{ field: string; oldVal: string | null; newVal: string }> = [];
  for (let i = 0; i < 18; i++) {
    const holeNum = i + 1;
    const cur = cells[i];
    const orig = initial[i];

    if (cur.par !== orig.par) {
      changedFields.push({
        field: `hole_${holeNum}_par`,
        oldVal: orig.par || null,
        newVal: cur.par,
      });
    }
    if (cur.hcp !== orig.hcp) {
      changedFields.push({
        field: `hole_${holeNum}_hcp`,
        oldVal: orig.hcp || null,
        newVal: cur.hcp,
      });
    }
  }

  async function handleSubmit() {
    if (!editorEmail.trim()) {
      setErrorMsg('Email is required.');
      setStatus('error');
      return;
    }
    if (changedFields.length === 0) {
      setErrorMsg('No changes detected.');
      setStatus('error');
      return;
    }

    setStatus('submitting');
    setErrorMsg('');

    for (const { field, oldVal, newVal } of changedFields) {
      const { data: rpcData, error } = await supabase.rpc('rpc_submit_edit', {
        p_course_id: courseId,
        p_field_name: field,
        p_old_value: oldVal,
        p_new_value: newVal,
        p_editor_email: editorEmail.trim(),
        p_editor_name: editorName.trim(),
      });

      if (error) {
        setErrorMsg(error.message || 'Submission failed. Please try again.');
        setStatus('error');
        return;
      }

      if (rpcData && typeof rpcData === 'object' && 'error' in rpcData) {
        setErrorMsg((rpcData as { error: string }).error);
        setStatus('error');
        return;
      }
    }

    setSubmitCount(changedFields.length);
    setStatus('success');
  }

  if (!open) {
    return (
      <div className="mt-2">
        <button
          onClick={() => setOpen(true)}
          className="text-sm text-gray-500 hover:text-evergreen-700 underline underline-offset-2"
        >
          Scorecard wrong? Fix it
        </button>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="border border-cream-darkest bg-cream-darker rounded-lg p-5 mt-3">
        <p className="text-evergreen-800 text-sm font-medium">
          {submitCount} hole edit{submitCount !== 1 ? 's' : ''} submitted for review. Thanks!
        </p>
        <button
          onClick={() => { setOpen(false); setStatus('idle'); }}
          className="text-xs text-evergreen-700 underline mt-2"
        >
          Close
        </button>
      </div>
    );
  }

  const outSum = sumPars(cells, 0, 9);
  const inSum = sumPars(cells, 9, 18);
  const totSum = (() => {
    const o = parseInt(outSum, 10);
    const i = parseInt(inSum, 10);
    if (!isNaN(o) && !isNaN(i)) return String(o + i);
    if (!isNaN(o)) return outSum;
    if (!isNaN(i)) return inSum;
    return '';
  })();

  const frontNine = cells.slice(0, 9);
  const backNine = cells.slice(9, 18);

  return (
    <div className="border border-gray-200 rounded-lg p-5 mt-3 bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800">Edit scorecard for {courseName}</h3>
        <button
          onClick={() => { setOpen(false); setStatus('idle'); }}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          aria-label="Close scorecard editor"
        >
          &times;
        </button>
      </div>

      <p className="text-xs text-gray-500 mb-4">
        Edit par and handicap index values. Changed cells are highlighted. Only changed values will be submitted.
      </p>

      <div className="overflow-x-auto">
        <table className="text-xs border-collapse w-full min-w-[640px]">
          <thead>
            <tr className="bg-gray-700 text-white">
              <th className="px-2 py-1.5 text-left font-medium w-12">Hole</th>
              {[1,2,3,4,5,6,7,8,9].map((n) => (
                <th key={n} className="px-1 py-1.5 text-center font-medium w-12">{n}</th>
              ))}
              <th className="px-2 py-1.5 text-center font-medium w-12 bg-gray-800">OUT</th>
              {[10,11,12,13,14,15,16,17,18].map((n) => (
                <th key={n} className="px-1 py-1.5 text-center font-medium w-12">{n}</th>
              ))}
              <th className="px-2 py-1.5 text-center font-medium w-12 bg-gray-800">IN</th>
              <th className="px-2 py-1.5 text-center font-medium w-12 bg-gray-900">TOT</th>
            </tr>
          </thead>
          <tbody>
            {/* Par row */}
            <tr className="bg-white border-b border-gray-200">
              <td className="px-2 py-1.5 font-medium text-gray-700">Par</td>
              {frontNine.map((cell, i) => {
                const changed = cell.par !== initial[i].par;
                return (
                  <td key={i} className="px-1 py-1">
                    <input
                      type="number"
                      min={3}
                      max={6}
                      value={cell.par}
                      onChange={(e) => updateCell(i, 'par', e.target.value)}
                      className={`w-10 text-center border rounded text-xs py-0.5 focus:ring-1 focus:ring-evergreen-600 focus:border-evergreen-700 ${
                        changed ? 'bg-yellow-100 border-yellow-400' : 'border-gray-300 bg-white'
                      }`}
                    />
                  </td>
                );
              })}
              <td className="px-2 py-1.5 text-center font-medium text-gray-700 bg-gray-100">
                {outSum || '—'}
              </td>
              {backNine.map((cell, i) => {
                const idx = i + 9;
                const changed = cell.par !== initial[idx].par;
                return (
                  <td key={idx} className="px-1 py-1">
                    <input
                      type="number"
                      min={3}
                      max={6}
                      value={cell.par}
                      onChange={(e) => updateCell(idx, 'par', e.target.value)}
                      className={`w-10 text-center border rounded text-xs py-0.5 focus:ring-1 focus:ring-evergreen-600 focus:border-evergreen-700 ${
                        changed ? 'bg-yellow-100 border-yellow-400' : 'border-gray-300 bg-white'
                      }`}
                    />
                  </td>
                );
              })}
              <td className="px-2 py-1.5 text-center font-medium text-gray-700 bg-gray-100">
                {inSum || '—'}
              </td>
              <td className="px-2 py-1.5 text-center font-bold text-gray-800 bg-gray-200">
                {totSum || '—'}
              </td>
            </tr>

            {/* HCP row */}
            <tr className="bg-white">
              <td className="px-2 py-1.5 font-medium text-gray-700">HCP</td>
              {frontNine.map((cell, i) => {
                const changed = cell.hcp !== initial[i].hcp;
                return (
                  <td key={i} className="px-1 py-1">
                    <input
                      type="number"
                      min={1}
                      max={18}
                      value={cell.hcp}
                      onChange={(e) => updateCell(i, 'hcp', e.target.value)}
                      className={`w-10 text-center border rounded text-xs py-0.5 focus:ring-1 focus:ring-evergreen-600 focus:border-evergreen-700 ${
                        changed ? 'bg-yellow-100 border-yellow-400' : 'border-gray-300 bg-white'
                      }`}
                    />
                  </td>
                );
              })}
              <td className="px-2 py-1.5 bg-gray-100" />
              {backNine.map((cell, i) => {
                const idx = i + 9;
                const changed = cell.hcp !== initial[idx].hcp;
                return (
                  <td key={idx} className="px-1 py-1">
                    <input
                      type="number"
                      min={1}
                      max={18}
                      value={cell.hcp}
                      onChange={(e) => updateCell(idx, 'hcp', e.target.value)}
                      className={`w-10 text-center border rounded text-xs py-0.5 focus:ring-1 focus:ring-evergreen-600 focus:border-evergreen-700 ${
                        changed ? 'bg-yellow-100 border-yellow-400' : 'border-gray-300 bg-white'
                      }`}
                    />
                  </td>
                );
              })}
              <td className="px-2 py-1.5 bg-gray-100" />
              <td className="px-2 py-1.5 bg-gray-200" />
            </tr>
          </tbody>
        </table>
      </div>

      {/* Changed count badge */}
      {changedFields.length > 0 && (
        <p className="mt-2 text-xs text-evergreen-700 font-medium">
          {changedFields.length} change{changedFields.length !== 1 ? 's' : ''} ready to submit
        </p>
      )}

      {/* Email / name */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Your name (optional)</label>
          <input
            type="text"
            value={editorName}
            onChange={(e) => setEditorName(e.target.value)}
            placeholder="Jane Smith"
            className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-evergreen-600 focus:border-evergreen-700 bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Your email *</label>
          <input
            type="email"
            value={editorEmail}
            onChange={(e) => setEditorEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-evergreen-600 focus:border-evergreen-700 bg-white"
          />
        </div>
      </div>

      {status === 'error' && errorMsg && (
        <p className="mt-2 text-red-600 text-xs bg-red-50 border border-red-200 rounded px-3 py-2">{errorMsg}</p>
      )}

      <div className="flex gap-3 mt-4">
        <button
          onClick={handleSubmit}
          disabled={changedFields.length === 0 || status === 'submitting'}
          className="bg-evergreen-800 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-evergreen-900 disabled:opacity-50 transition-colors"
        >
          {status === 'submitting' ? 'Submitting...' : 'Submit Scorecard Edits'}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setStatus('idle'); }}
          className="px-5 py-2 rounded-lg text-sm text-gray-600 border border-gray-300 hover:bg-gray-100 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
