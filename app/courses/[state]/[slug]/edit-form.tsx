'use client';

import { useEffect, useState, FormEvent } from 'react';
import { supabase } from '@/lib/supabase';

// Persist form state across magic-link round-trip.
// Editor types form, hits canonical field, gets magic link, clicks link, returns
// to course page → we restore the open form + their typed values.
const STATE_KEY = (courseId: string) => `ogapi:edit-form-state:${courseId}`;
type SavedState = {
  email: string;
  editorName: string;
  fields: Record<string, string>;
  ts: number;
};

export interface EditFormProps {
  courseId: string;
  courseName: string;
  verifiedOwnerEmails: string[];
  currentData: {
    // Community-editable
    phone: string | null;
    website: string | null;
    email: string | null;
    address: string | null;
    city: string | null;
    postal_code: string | null;
    state: string;
    course_type: string | null;
    par_total: number | null;
    year_built: number | null;
    architect: string | null;
    description: string | null;
    practice_facilities: string | null;
    grass_types: string | null;
    social_media_url: string | null;
    course_conditions: string | null;
    bunker_count: number | null;
    water_holes: string | null;
    driving_range_type: string | null;
    club_rental: string | null;
    // Owner-only
    green_fees: string | null;
    hours_text: string | null;
    walking_policy: string | null;
    dress_code: string | null;
    cart_fee: string | null;
    twilight_info: string | null;
    junior_rates: string | null;
    senior_rates: string | null;
    head_pro: string | null;
    superintendent: string | null;
    gps_carts: boolean | null;
    league_info: string | null;
  };
}

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
  'DC',
];

const COURSE_TYPES = ['Public','Semi-Private','Private','Resort','Municipal','Military','Par3','Executive'];

const CANONICAL_FIELDS = new Set([
  'par_total', 'total_yardage', 'year_built', 'architect',
  'course_name', 'state', 'latitude', 'longitude',
]);

function isCanonicalField(field: string): boolean {
  return CANONICAL_FIELDS.has(field) || /^hole_\d+_(par|hcp)$/.test(field);
}

type FieldVal = string | number | boolean | null;

export default function EditForm({ courseId, courseName, verifiedOwnerEmails, currentData }: EditFormProps) {
  const [open, setOpen] = useState(false);
  const [editorEmail, setEditorEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [resultSummary, setResultSummary] = useState<{ autoApplied: number; pending: number; errors: string[] }>({ autoApplied: 0, pending: 0, errors: [] });
  const [restored, setRestored] = useState<SavedState | null>(null);

  // On mount: if there's a saved state for this course AND the URL looks like an auth callback (Supabase puts a hash like #access_token=...), restore.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = sessionStorage.getItem(STATE_KEY(courseId));
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as SavedState;
      // Only restore if recent (< 30 min old)
      if (Date.now() - saved.ts > 30 * 60 * 1000) {
        sessionStorage.removeItem(STATE_KEY(courseId));
        return;
      }
      const isAuthReturn = window.location.hash.includes('access_token') || window.location.hash.includes('type=magiclink');
      if (isAuthReturn || saved.ts > Date.now() - 60 * 1000) {
        setOpen(true);
        setEditorEmail(saved.email);
        setRestored(saved);
      }
    } catch { /* ignore */ }
  }, [courseId]);

  const ownerEmails = new Set(verifiedOwnerEmails.map(e => e.toLowerCase()));
  const isVerifiedOwner = editorEmail.trim().length > 0 && ownerEmails.has(editorEmail.trim().toLowerCase());

  // Helper: prefer restored values from a magic-link round-trip, fall back to current course data
  const fld = (name: string, fallback: string): string => restored?.fields[name] ?? fallback;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('submitting');
    setErrorMsg('');

    const form = e.currentTarget;
    const data = new FormData(form);

    // Honeypot
    if (data.get('website_url')) { setStatus('success'); return; }

    const email = (data.get('editor_email') as string).trim();
    const editorName = (data.get('editor_name') as string | null)?.trim() || '';
    const emailIsOwner = ownerEmails.has(email.toLowerCase());

    // Build submitted map — always include community fields; include owner fields only if owner
    const text = (k: string) => ((data.get(k) as string | null)?.trim() || null);
    const submitted: Record<string, FieldVal> = {
      phone: text('phone'),
      website: text('website'),
      email: text('email'),
      address: text('address'),
      city: text('city'),
      postal_code: text('postal_code'),
      state: text('state'),
      course_type: text('course_type'),
      par_total: text('par_total'),
      year_built: text('year_built'),
      architect: text('architect'),
      description: text('description'),
      practice_facilities: text('practice_facilities'),
      grass_types: text('grass_types'),
      social_media_url: text('social_media_url'),
      course_conditions: text('course_conditions'),
      bunker_count: text('bunker_count'),
      water_holes: text('water_holes'),
      driving_range_type: text('driving_range_type'),
      club_rental: text('club_rental'),
    };
    if (emailIsOwner) {
      submitted.green_fees = text('green_fees');
      submitted.hours_text = text('hours_text');
      submitted.walking_policy = text('walking_policy');
      submitted.dress_code = text('dress_code');
      submitted.cart_fee = text('cart_fee');
      submitted.twilight_info = text('twilight_info');
      submitted.junior_rates = text('junior_rates');
      submitted.senior_rates = text('senior_rates');
      submitted.head_pro = text('head_pro');
      submitted.superintendent = text('superintendent');
      submitted.league_info = text('league_info');
      submitted.gps_carts = data.get('gps_carts') ? 'true' : 'false';
    }

    const toStr = (v: FieldVal) => (v == null ? null : typeof v === 'boolean' ? (v ? 'true' : 'false') : String(v));
    const original: Record<string, string | null> = {
      phone: toStr(currentData.phone),
      website: toStr(currentData.website),
      email: toStr(currentData.email),
      address: toStr(currentData.address),
      city: toStr(currentData.city),
      postal_code: toStr(currentData.postal_code),
      state: toStr(currentData.state),
      course_type: toStr(currentData.course_type),
      par_total: toStr(currentData.par_total),
      year_built: toStr(currentData.year_built),
      architect: toStr(currentData.architect),
      description: toStr(currentData.description),
      practice_facilities: toStr(currentData.practice_facilities),
      grass_types: toStr(currentData.grass_types),
      social_media_url: toStr(currentData.social_media_url),
      course_conditions: toStr(currentData.course_conditions),
      bunker_count: toStr(currentData.bunker_count),
      water_holes: toStr(currentData.water_holes),
      driving_range_type: toStr(currentData.driving_range_type),
      club_rental: toStr(currentData.club_rental),
      green_fees: toStr(currentData.green_fees),
      hours_text: toStr(currentData.hours_text),
      walking_policy: toStr(currentData.walking_policy),
      dress_code: toStr(currentData.dress_code),
      cart_fee: toStr(currentData.cart_fee),
      twilight_info: toStr(currentData.twilight_info),
      junior_rates: toStr(currentData.junior_rates),
      senior_rates: toStr(currentData.senior_rates),
      head_pro: toStr(currentData.head_pro),
      superintendent: toStr(currentData.superintendent),
      league_info: toStr(currentData.league_info),
      gps_carts: toStr(currentData.gps_carts),
    };

    const changedFields = Object.keys(submitted).filter((key) => {
      const newVal = toStr(submitted[key]);
      return newVal !== original[key];
    });

    if (changedFields.length === 0) {
      setErrorMsg('No changes detected.');
      setStatus('error');
      return;
    }

    const needsAuth = changedFields.some(isCanonicalField);
    let userId: string | null = null;

    if (needsAuth) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Persist what they typed so we can restore after the magic-link round-trip
        if (typeof window !== 'undefined') {
          const fieldsToSave: Record<string, string> = { editor_name: editorName };
          for (const [k, v] of Object.entries(submitted)) {
            if (v != null) fieldsToSave[k] = String(v);
          }
          const saved: SavedState = { email, editorName, fields: fieldsToSave, ts: Date.now() };
          sessionStorage.setItem(STATE_KEY(courseId), JSON.stringify(saved));
        }

        const { error: otpErr } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: typeof window !== 'undefined' ? window.location.href : undefined },
        });
        if (otpErr) {
          setErrorMsg(otpErr.message);
          setStatus('error');
          return;
        }
        setErrorMsg(`We sent a one-time sign-in link to ${email}. Click the link in your email — you'll come back here with your changes preserved, just hit Submit again.`);
        setStatus('error');
        return;
      }
      userId = session.user?.id ?? null;
    }

    let autoApplied = 0, pending = 0;
    const errors: string[] = [];

    for (const field of changedFields) {
      const { data: rpcData, error } = await supabase.rpc('rpc_submit_edit', {
        p_course_id: courseId,
        p_field_name: field,
        p_old_value: original[field],
        p_new_value: toStr(submitted[field]),
        p_editor_email: email,
        p_editor_name: editorName,
        p_user_id: userId,
      });
      if (error) {
        errors.push(`${field}: ${error.message || 'submission failed'}`);
        continue;
      }
      const r = rpcData as { error?: string; status?: string } | null;
      if (r?.error) errors.push(`${field}: ${r.error}`);
      else if (r?.status === 'auto_approved') autoApplied++;
      else pending++;
    }

    setResultSummary({ autoApplied, pending, errors });

    if (errors.length > 0 && autoApplied === 0 && pending === 0) {
      setErrorMsg(errors.join('; '));
      setStatus('error');
      return;
    }
    // Successful submit — clear any persisted form state from a prior magic-link round-trip
    if (typeof window !== 'undefined') sessionStorage.removeItem(STATE_KEY(courseId));
    setStatus('success');
  }

  if (!open) {
    return (
      <div className="mt-4 mb-1">
        <button
          onClick={() => setOpen(true)}
          className="text-sm text-gray-500 hover:text-evergreen-700 underline underline-offset-2"
        >
          See something wrong? Edit this page
        </button>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="border border-cream-darkest bg-cream-darker rounded-lg p-5 mt-4">
        <p className="text-evergreen-800 text-sm font-medium">
          {resultSummary.autoApplied > 0 && resultSummary.pending === 0
            ? `Thanks! ${resultSummary.autoApplied} edit${resultSummary.autoApplied !== 1 ? 's' : ''} applied immediately.`
            : resultSummary.pending > 0 && resultSummary.autoApplied === 0
            ? `Thanks! ${resultSummary.pending} edit${resultSummary.pending !== 1 ? 's are' : ' is'} under review.`
            : `Thanks! ${resultSummary.autoApplied} applied immediately, ${resultSummary.pending} under review.`}
        </p>
        {resultSummary.errors.length > 0 && (
          <p className="text-amber-700 text-xs mt-2">
            Some fields were rejected: {resultSummary.errors.join(', ')}
          </p>
        )}
        <button
          onClick={() => { setOpen(false); setStatus('idle'); setResultSummary({ autoApplied: 0, pending: 0, errors: [] }); }}
          className="text-xs text-evergreen-700 underline mt-2"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg p-5 mt-4 bg-gray-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-800">Edit {courseName}</h3>
        <button
          onClick={() => setOpen(false)}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          aria-label="Close edit form"
        >
          &times;
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Honeypot */}
        <input
          type="text"
          name="website_url"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0 }}
        />

        {/* Your email — at top so owner-detection can happen as you type */}
        <div className="bg-white border border-gray-200 rounded-md p-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Your name (optional)" name="editor_name" defaultValue="" placeholder="Jane Smith" />
            <Field
              label="Your email *"
              name="editor_email"
              type="email"
              required
              defaultValue=""
              placeholder="you@example.com"
              onChange={(v) => setEditorEmail(v)}
            />
          </div>
          {editorEmail.trim().length > 0 && (
            isVerifiedOwner ? (
              <div className="mt-2 text-xs text-evergreen-800 bg-cream-darker border border-cream-darkest rounded px-2.5 py-1.5 inline-flex items-center gap-1.5">
                <span>&#10003;</span>
                <span>Verified course owner — you can edit rates, hours, and policies below.</span>
              </div>
            ) : (
              <div className="mt-2 text-xs text-gray-600">
                You&apos;re editing as a community contributor. Rates, hours, and policies are owner-only —{' '}
                <a href="#claim" className="text-evergreen-700 underline">claim this course</a> to edit them.
              </div>
            )
          )}
        </div>

        {/* Community section */}
        <Section title="Contact & Links">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Phone" name="phone" type="tel" defaultValue={fld('phone', currentData.phone ?? '')} placeholder="(555) 123-4567" />
            <Field label="Website" name="website" type="url" defaultValue={fld('website', currentData.website ?? '')} placeholder="https://..." />
            <Field label="Email" name="email" type="email" defaultValue={fld('email', currentData.email ?? '')} placeholder="pro@course.com" />
            <Field label="Social media URL" name="social_media_url" type="url" defaultValue={fld('social_media_url', currentData.social_media_url ?? '')} placeholder="https://instagram.com/..." />
          </div>
        </Section>

        <Section title="Location">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Address" name="address" defaultValue={fld('address', currentData.address ?? '')} placeholder="123 Fairway Dr" />
            <Field label="City" name="city" defaultValue={fld('city', currentData.city ?? '')} placeholder="Springfield" />
            <Field label="Postal Code" name="postal_code" defaultValue={fld('postal_code', currentData.postal_code ?? '')} placeholder="62701" />
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">State</label>
              <select
                name="state"
                defaultValue={fld('state', currentData.state ?? '')}
                className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-evergreen-600 focus:border-evergreen-700 bg-white"
              >
                <option value="">— select —</option>
                {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </Section>

        <Section title="Course Info">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Course Type</label>
              <select
                name="course_type"
                defaultValue={fld('course_type', currentData.course_type ?? '')}
                className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-evergreen-600 focus:border-evergreen-700 bg-white"
              >
                <option value="">— select —</option>
                {COURSE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <Field label="Par Total" name="par_total" type="number" defaultValue={currentData.par_total != null ? String(currentData.par_total) : ''} placeholder="72" />
            <Field label="Year Built" name="year_built" type="number" defaultValue={currentData.year_built != null ? String(currentData.year_built) : ''} placeholder="1965" />
            <Field label="Architect" name="architect" defaultValue={fld('architect', currentData.architect ?? '')} placeholder="Robert Trent Jones" />
          </div>
          <TextArea label="Description" name="description" defaultValue={fld('description', currentData.description ?? '')} placeholder="A championship course featuring replica holes…" />
        </Section>

        <Section title="Facilities">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Practice facilities" name="practice_facilities" defaultValue={fld('practice_facilities', currentData.practice_facilities ?? '')} placeholder="Driving range, putting green, chipping area" />
            <Field label="Driving range type" name="driving_range_type" defaultValue={fld('driving_range_type', currentData.driving_range_type ?? '')} placeholder="Grass / mats / covered" />
            <Field label="Club rental" name="club_rental" defaultValue={fld('club_rental', currentData.club_rental ?? '')} placeholder="Full sets available, $40" />
            <Field label="Grass types" name="grass_types" defaultValue={fld('grass_types', currentData.grass_types ?? '')} placeholder="Bentgrass greens, bluegrass fairways" />
          </div>
        </Section>

        <Section title="Course Character">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Number of bunkers" name="bunker_count" type="number" defaultValue={currentData.bunker_count != null ? String(currentData.bunker_count) : ''} placeholder="42" />
            <Field label="Water on holes" name="water_holes" defaultValue={fld('water_holes', currentData.water_holes ?? '')} placeholder="3, 7, 11, 14, 16" />
          </div>
          <TextArea label="Recent course conditions (last visit)" name="course_conditions" defaultValue={fld('course_conditions', currentData.course_conditions ?? '')} placeholder="Greens rolling fast, fairways tight, bunkers well-maintained (visited April 2026)" />
        </Section>

        {/* Owner section */}
        {isVerifiedOwner && (
          <div className="border-2 border-cream-darkest bg-cream-darker/50 rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-evergreen-950">Owner-only fields</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-evergreen-600 text-white">Verified owner</span>
            </div>
            <p className="text-xs text-gray-600 -mt-2">
              These fields are controlled by you. Edits apply immediately and show an &ldquo;Owner verified&rdquo; badge on the course page.
            </p>

            <Section title="Rates">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Green fees" name="green_fees" defaultValue={fld('green_fees', currentData.green_fees ?? '')} placeholder="$45 weekday / $65 weekend" />
                <Field label="Cart fee" name="cart_fee" defaultValue={fld('cart_fee', currentData.cart_fee ?? '')} placeholder="$20/rider" />
                <Field label="Twilight rates" name="twilight_info" defaultValue={fld('twilight_info', currentData.twilight_info ?? '')} placeholder="After 3pm — $30" />
                <Field label="Junior rates" name="junior_rates" defaultValue={fld('junior_rates', currentData.junior_rates ?? '')} placeholder="Under 17 — $20" />
                <Field label="Senior rates" name="senior_rates" defaultValue={fld('senior_rates', currentData.senior_rates ?? '')} placeholder="65+ — $35" />
              </div>
            </Section>

            <Section title="Policies & Hours">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Hours of operation" name="hours_text" defaultValue={fld('hours_text', currentData.hours_text ?? '')} placeholder="6am–7pm daily (seasonal)" />
                <Field label="Walking policy" name="walking_policy" defaultValue={fld('walking_policy', currentData.walking_policy ?? '')} placeholder="Walking allowed with pull cart" />
                <Field label="Dress code" name="dress_code" defaultValue={fld('dress_code', currentData.dress_code ?? '')} placeholder="Collared shirt required" />
                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="gps_carts"
                    name="gps_carts"
                    defaultChecked={currentData.gps_carts === true}
                    className="h-4 w-4 text-evergreen-700"
                  />
                  <label htmlFor="gps_carts" className="text-sm text-gray-700">GPS on carts</label>
                </div>
              </div>
            </Section>

            <Section title="Staff & Programming">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Head pro" name="head_pro" defaultValue={fld('head_pro', currentData.head_pro ?? '')} placeholder="Mike Johnson" />
                <Field label="Superintendent" name="superintendent" defaultValue={fld('superintendent', currentData.superintendent ?? '')} placeholder="Tom Williams" />
              </div>
              <TextArea label="League info" name="league_info" defaultValue={fld('league_info', currentData.league_info ?? '')} placeholder="Men's league Tuesday PM, Women's league Thursday AM…" />
            </Section>
          </div>
        )}

        {status === 'error' && errorMsg && (
          <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded px-3 py-2">{errorMsg}</p>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={status === 'submitting'}
            className="bg-evergreen-800 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-evergreen-900 disabled:opacity-50 transition-colors"
          >
            {status === 'submitting' ? 'Submitting...' : 'Submit Edits'}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-5 py-2 rounded-lg text-sm text-gray-600 border border-gray-300 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">{title}</h4>
      {children}
    </div>
  );
}

function Field({
  label, name, type = 'text', defaultValue, placeholder, required, onChange,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue: string;
  placeholder?: string;
  required?: boolean;
  onChange?: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-evergreen-600 focus:border-evergreen-700 bg-white"
      />
    </div>
  );
}

function TextArea({
  label, name, defaultValue, placeholder,
}: {
  label: string;
  name: string;
  defaultValue: string;
  placeholder?: string;
}) {
  return (
    <div className="mt-3">
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <textarea
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        rows={3}
        className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-evergreen-600 focus:border-evergreen-700 bg-white"
      />
    </div>
  );
}
