'use client';

import { useState, FormEvent } from 'react';
import { supabase } from '@/lib/supabase';

interface ClaimFormProps {
  courseId: string;
  courseName: string;
}

export default function ClaimForm({ courseId, courseName }: ClaimFormProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('submitting');
    setErrorMsg('');

    const form = e.currentTarget;
    const data = new FormData(form);

    // Honeypot check
    if (data.get('website_url')) {
      setStatus('success');
      return;
    }

    const body = {
      course_id: courseId,
      claimant_name: data.get('name') as string,
      claimant_email: data.get('email') as string,
      claimant_role: data.get('role') as string,
      claimant_phone: (data.get('phone') as string) || null,
      message: (data.get('message') as string) || null,
    };

    try {
      const { error } = await supabase.from('golf_course_claims').insert(body);
      if (error) throw new Error(error.message);
      setStatus('success');
      form.reset();
    } catch (err) {
      setErrorMsg((err as Error).message);
      setStatus('error');
    }
  }

  if (!open) {
    return (
      <div className="border-t pt-8 mt-12">
        <button
          onClick={() => setOpen(true)}
          className="text-evergreen-800 hover:text-evergreen-950 font-medium text-sm underline underline-offset-2"
        >
          Own or manage {courseName}? Claim this course →
        </button>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="border-t pt-8 mt-12">
        <div className="bg-cream-darker border border-cream-darkest rounded-lg p-6 max-w-lg">
          <h3 className="font-semibold text-evergreen-950 mb-2">Claim submitted!</h3>
          <p className="text-evergreen-800 text-sm">
            We'll review your claim within 48 hours and reach out via email.
            Once verified, you'll be able to update your course information directly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t pt-8 mt-12">
      <h3 className="text-lg font-semibold mb-1">Claim {courseName}</h3>
      <p className="text-sm text-gray-500 mb-4">
        Verify your connection to this course to update its information.
      </p>

      <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
        {/* Honeypot */}
        <input type="text" name="website_url" tabIndex={-1} autoComplete="off" style={{ position: 'absolute', left: '-9999px' }} />

        <div>
          <label className="block text-sm font-medium mb-1">Your name *</label>
          <input
            name="name"
            required
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-evergreen-600 focus:border-evergreen-700"
            placeholder="Jane Smith"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email *</label>
          <input
            name="email"
            type="email"
            required
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-evergreen-600 focus:border-evergreen-700"
            placeholder="jane@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Your role *</label>
          <select
            name="role"
            required
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-evergreen-600 focus:border-evergreen-700"
          >
            <option value="owner">Owner</option>
            <option value="manager">General Manager</option>
            <option value="pro">Head Pro / Director of Golf</option>
            <option value="staff">Staff</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Phone (optional)</label>
          <input
            name="phone"
            type="tel"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-evergreen-600 focus:border-evergreen-700"
            placeholder="(555) 123-4567"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Message (optional)</label>
          <textarea
            name="message"
            rows={3}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-evergreen-600 focus:border-evergreen-700"
            placeholder="Tell us about your connection to this course..."
          />
        </div>

        {status === 'error' && (
          <p className="text-red-600 text-sm">Something went wrong. Please try again. {errorMsg && `(${errorMsg})`}</p>
        )}

        <button
          type="submit"
          disabled={status === 'submitting'}
          className="bg-evergreen-800 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-evergreen-900 disabled:opacity-50"
        >
          {status === 'submitting' ? 'Submitting...' : 'Submit Claim'}
        </button>
      </form>
    </div>
  );
}
