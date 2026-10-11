import React, { useEffect, useState } from 'react';
import { Send, Upload } from 'lucide-react';
import { apiError } from '../services/api';
import { ApplicationForm, JobOpening } from '../types';

const EMPTY: ApplicationForm = { fullName: '', email: '', phone: '', experience: '', skills: '', education: '', coverLetter: '' };
const MAX_RESUME_BYTES = 5 * 1024 * 1024;
const RESUME_TYPES = ['.pdf', '.doc', '.docx'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^[+]?[0-9 ()-]{7,20}$/;

type Errors = Partial<Record<keyof ApplicationForm | 'resume' | 'job', string>>;

// Same checks as the server, so most mistakes are caught before upload.
const validate = (form: ApplicationForm, resume: File | null, jobId: number | ''): Errors => {
  const e: Errors = {};
  if (!jobId) e.job = 'Choose the position you are applying for.';
  if (form.fullName.trim().length < 2) e.fullName = 'Enter your full name.';
  if (!EMAIL.test(form.email.trim())) e.email = 'Enter a valid email address.';
  if (!PHONE.test(form.phone.trim())) e.phone = 'Enter a valid phone number, e.g. +91 98765 43210.';
  if (!form.experience.trim()) e.experience = 'Describe your relevant experience.';
  if (!form.skills.trim()) e.skills = 'List your main skills.';
  if (!form.education.trim()) e.education = 'Enter your education.';
  if (!resume) e.resume = 'Attach your resume.';
  else if (!RESUME_TYPES.some((ext) => resume.name.toLowerCase().endsWith(ext))) e.resume = 'The resume must be a PDF, DOC or DOCX file.';
  else if (resume.size > MAX_RESUME_BYTES) e.resume = 'The resume is too large. The limit is 5 MB.';
  return e;
};

/**
 * Candidate application form with resume upload. Used by HR (Hire Now) and on the public careers page;
 * the caller decides which endpoint receives it.
 */
export const JobApplicationForm: React.FC<{
  jobs: JobOpening[];
  initialJobId?: number;
  submitLabel?: string;
  onSubmit: (jobId: number, form: ApplicationForm, resume: File) => Promise<string>;
}> = ({ jobs, initialJobId, submitLabel = 'Submit Application', onSubmit }) => {
  const [jobId, setJobId] = useState<number | ''>(initialJobId ?? '');
  const [form, setForm] = useState<ApplicationForm>(EMPTY);
  const [resume, setResume] = useState<File | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [fileKey, setFileKey] = useState(0);

  useEffect(() => {
    if (initialJobId) setJobId(initialJobId);
  }, [initialJobId]);

  const set = (key: keyof ApplicationForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = validate(form, resume, jobId);
    setErrors(found);
    setResult(null);
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    try {
      const message = await onSubmit(Number(jobId), form, resume!);
      setResult({ ok: true, text: message });
      setForm(EMPTY);
      setResume(null);
      setFileKey((k) => k + 1);
    } catch (err) {
      setResult({ ok: false, text: apiError(err, 'The application could not be submitted. Please try again.') });
    } finally {
      setSaving(false);
    }
  };

  const field = (key: keyof ApplicationForm, label: string, input: React.ReactNode, hint?: string) => (
    <div>
      <label className="ks-label" htmlFor={`apply-${key}`}>{label}</label>
      {input}
      {errors[key] ? <div className="ks-field-error" role="alert">{errors[key]}</div> : hint && <div className="ks-hint">{hint}</div>}
    </div>
  );
  const invalid = (key: keyof Errors) => (errors[key] ? { 'aria-invalid': true as const } : {});

  return (
    <form className="ks-form" onSubmit={submit} noValidate>
      {result && <div className={`ks-alert ${result.ok ? 'ks-alert-success' : 'ks-alert-error'}`} role="status">{result.text}</div>}
      <div>
        <label className="ks-label" htmlFor="apply-job">Position applied for *</label>
        <select id="apply-job" value={jobId} onChange={(e) => setJobId(e.target.value ? Number(e.target.value) : '')} {...invalid('job')}>
          <option value="">Select a job opening…</option>
          {jobs.map((j) => <option key={j.id} value={j.id}>{j.title} — {j.department}, {j.location}</option>)}
        </select>
        {errors.job && <div className="ks-field-error" role="alert">{errors.job}</div>}
      </div>
      <div className="ks-form-grid">
        {field('fullName', 'Full name *', <input id="apply-fullName" value={form.fullName} onChange={set('fullName')} autoComplete="name" maxLength={120} {...invalid('fullName')} />)}
        {field('email', 'Email *', <input id="apply-email" type="email" value={form.email} onChange={set('email')} autoComplete="email" maxLength={150} {...invalid('email')} />)}
        {field('phone', 'Phone *', <input id="apply-phone" type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" maxLength={20} placeholder="+91 98765 43210" {...invalid('phone')} />)}
        {field('education', 'Education *', <input id="apply-education" value={form.education} onChange={set('education')} maxLength={1000} placeholder="e.g. Diploma in Electrical Engineering" {...invalid('education')} />)}
      </div>
      {field('experience', 'Relevant experience *', <textarea id="apply-experience" rows={3} value={form.experience} onChange={set('experience')} maxLength={2000} placeholder="Years of experience, previous roles and the work you did" {...invalid('experience')} />)}
      {field('skills', 'Skills *', <input id="apply-skills" value={form.skills} onChange={set('skills')} maxLength={1000} placeholder="e.g. HVAC servicing, chiller maintenance, wiring" {...invalid('skills')} />)}
      <div>
        <label className="ks-label" htmlFor="apply-resume">Resume * <span className="ks-dim">(PDF, DOC or DOCX, max 5 MB)</span></label>
        <label className={`ks-file-drop ${errors.resume ? 'invalid' : ''}`} htmlFor="apply-resume">
          <Upload size={18} />
          <span>{resume ? `${resume.name} (${Math.ceil(resume.size / 1024)} KB)` : 'Choose your resume file'}</span>
        </label>
        <input key={fileKey} id="apply-resume" className="ks-visually-hidden" type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(e) => setResume(e.target.files?.[0] || null)} />
        {errors.resume && <div className="ks-field-error" role="alert">{errors.resume}</div>}
      </div>
      {field('coverLetter', 'Cover letter (optional)', <textarea id="apply-coverLetter" rows={4} value={form.coverLetter} onChange={set('coverLetter')} maxLength={4000} />, `${form.coverLetter.length}/4000 characters`)}
      <div className="modal-actions" style={{ marginTop: 4 }}>
        <button type="submit" className="btn btn-primary" disabled={saving || jobs.length === 0}>
          <Send size={15} /> {saving ? 'Uploading…' : submitLabel}
        </button>
      </div>
    </form>
  );
};
