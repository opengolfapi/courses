'use client';

import { useState, FormEvent } from 'react';
import { supabase } from '@/lib/supabase';

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'IE', name: 'Ireland' },
  { code: 'AU', name: 'Australia' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'OTHER', name: 'Other' },
];

const COURSE_TYPES = [
  { value: 'public', label: 'Public' },
  { value: 'private', label: 'Private' },
  { value: 'semi-private', label: 'Semi-Private' },
  { value: 'resort', label: 'Resort' },
  { value: 'municipal', label: 'Municipal' },
  { value: 'military', label: 'Military' },
  { value: 'par-3', label: 'Par-3' },
];

const HOLES_OPTIONS = [9, 18, 27, 36];

function Field({
  label,
  name,
  type = 'text',
  placeholder,
  required,
  className,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-evergreen-600 focus:border-evergreen-700 bg-white"
      />
    </div>
  );
}

export default function SubmitCoursePage() {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('submitting');
    setErrorMsg('');

    const form = e.currentTarget;
    const data = new FormData(form);

    // Honeypot check — bots fill hidden fields
    if (data.get('website_url')) {
      setStatus('success');
      return;
    }

    const courseName = (data.get('course_name') as string).trim();
    const submitterEmail = (data.get('submitter_email') as string).trim();

    if (!courseName || !submitterEmail) {
      setErrorMsg('Course name and your email are required.');
      setStatus('error');
      return;
    }

    const parTotalRaw = (data.get('par_total') as string).trim();
    const holesRaw = (data.get('holes') as string).trim();
    const yearBuiltRaw = (data.get('year_built') as string).trim();

    const { data: rpcData, error } = await supabase.rpc('rpc_submit_course', {
      p_course_name: courseName,
      p_city: (data.get('city') as string).trim() || null,
      p_state: (data.get('state_province') as string).trim() || null,
      p_country: (data.get('country') as string) || 'US',
      p_address: (data.get('address') as string).trim() || null,
      p_postal_code: (data.get('postal_code') as string).trim() || null,
      p_latitude: null,
      p_longitude: null,
      p_phone: (data.get('phone') as string).trim() || null,
      p_website: (data.get('website') as string).trim() || null,
      p_email: (data.get('email') as string).trim() || null,
      p_course_type: (data.get('course_type') as string) || null,
      p_par_total: parTotalRaw ? parseInt(parTotalRaw, 10) : null,
      p_holes: holesRaw ? parseInt(holesRaw, 10) : null,
      p_year_built: yearBuiltRaw ? parseInt(yearBuiltRaw, 10) : null,
      p_architect: (data.get('architect') as string).trim() || null,
      p_description: (data.get('description') as string).trim() || null,
      p_submitter_email: submitterEmail,
      p_submitter_name: (data.get('submitter_name') as string).trim() || null,
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

    setStatus('success');
  }

  if (status === 'success') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="bg-cream-darker border border-cream-darkest rounded-xl p-10">
          <div className="text-4xl mb-4">Golf</div>
          <h2 className="text-2xl font-bold text-evergreen-950 mb-2">Course submitted!</h2>
          <p className="text-evergreen-800 text-sm">
            Thank you! We&apos;ll review it within 48 hours and add it to the database.
          </p>
          <button
            onClick={() => setStatus('idle')}
            className="mt-6 text-sm text-evergreen-700 underline underline-offset-2"
          >
            Submit another course
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <section className="max-w-[880px] mx-auto px-6 pt-12 pb-6">
        <p className="font-display italic text-[15px] mb-3" style={{ color: "var(--color-brass-700)", fontVariationSettings: '"opsz" 14' }}>
          Contribute to the almanac
        </p>
        <h1 className="font-display tracking-tight font-bold mb-3" style={{ fontSize: "clamp(36px, 5vw, 60px)", lineHeight: 1.05 }}>
          Add a missing <em style={{ color: "var(--color-brass-700)", fontStyle: "italic" }}>course.</em>
        </h1>
        <p className="text-lg" style={{ color: "var(--color-ink-muted)" }}>
          Search first to make sure it&apos;s not already here. New submissions go to manual review.
        </p>
      </section>

      <div className="max-w-2xl mx-auto px-4 pb-12">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Honeypot — hidden from real users */}
        <input
          type="text"
          name="website_url"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0 }}
        />

        {/* Course Details */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-800 border-b border-gray-100 pb-3">
            Course Information
          </h2>

          <Field
            label="Course Name"
            name="course_name"
            placeholder="Pebble Beach Golf Links"
            required
            className="sm:col-span-2"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <select
                name="country"
                defaultValue="US"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-evergreen-600 focus:border-evergreen-700 bg-white"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <Field
              label="State / Province"
              name="state_province"
              placeholder="CA, Ontario, Queensland…"
            />

            <Field label="City" name="city" placeholder="Pebble Beach" />
            <Field label="Postal Code" name="postal_code" placeholder="93953" />
          </div>

          <Field
            label="Address"
            name="address"
            placeholder="1700 17-Mile Drive"
          />
        </section>

        {/* Contact Info */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-800 border-b border-gray-100 pb-3">
            Contact &amp; Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Phone" name="phone" type="tel" placeholder="(831) 624-3811" />
            <Field label="Website" name="website" type="url" placeholder="https://..." />
            <Field label="Course Email" name="email" type="email" placeholder="info@course.com" />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Course Type</label>
              <select
                name="course_type"
                defaultValue=""
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-evergreen-600 focus:border-evergreen-700 bg-white"
              >
                <option value="">— select —</option>
                {COURSE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <Field label="Par Total" name="par_total" type="number" placeholder="72" />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Number of Holes</label>
              <select
                name="holes"
                defaultValue=""
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-evergreen-600 focus:border-evergreen-700 bg-white"
              >
                <option value="">— select —</option>
                {HOLES_OPTIONS.map((h) => (
                  <option key={h} value={h}>
                    {h} holes
                  </option>
                ))}
              </select>
            </div>

            <Field label="Year Built" name="year_built" type="number" placeholder="1919" />
            <Field
              label="Architect"
              name="architect"
              placeholder="Jack Neville"
              className="sm:col-span-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              rows={4}
              placeholder="Brief description of the course, notable features, history…"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-evergreen-600 focus:border-evergreen-700 bg-white resize-y"
            />
          </div>
        </section>

        {/* Submitter Info */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-800 border-b border-gray-100 pb-3">
            About You
          </h2>
          <p className="text-xs text-gray-500">
            We need your email to follow up if we have questions. It won&apos;t be displayed publicly.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Your Name" name="submitter_name" placeholder="Jane Smith" />
            <Field
              label="Your Email"
              name="submitter_email"
              type="email"
              placeholder="you@example.com"
              required
            />
          </div>
        </section>

        {status === 'error' && errorMsg && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {errorMsg}
          </p>
        )}

        <button
          type="submit"
          disabled={status === 'submitting'}
          className="w-full bg-evergreen-800 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-evergreen-900 disabled:opacity-50 transition-colors"
        >
          {status === 'submitting' ? 'Submitting…' : 'Submit Course'}
        </button>
      </form>
      </div>
    </div>
  );
}
