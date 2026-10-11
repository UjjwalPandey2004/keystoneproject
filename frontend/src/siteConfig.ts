// Company details shown on the public website. Replace the placeholder contact details
// (the .example addresses and the 0000 phone number) with your real ones before going live.
export const SITE = {
  name: 'Keystone Maintenance Solutions',
  shortName: 'KEYSTONE',
  tagline: 'Commercial maintenance you can count on',
  phone: '+91 00000 00000',
  phoneHref: 'tel:+910000000000',
  email: 'support@keystone.example',
  careersEmail: 'careers@keystone.example',
  address: 'Your office address, Jaipur, Rajasthan',
  hours: 'Mon–Sat, 8:00 AM – 8:00 PM · 24/7 emergency line',
};

// Hand-off from the public request form to the customer portal after sign-in.
export const REQUEST_DRAFT_KEY = 'keystone_request_draft';

export interface RequestDraft {
  category: string;
  title: string;
  description: string;
  address: string;
  preferredDate: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  contactName: string;
  contactPhone: string;
  // Lets the sign-up form start with the email entered on the website.
  email?: string;
}

export const saveDraft = (draft: RequestDraft) => {
  try {
    sessionStorage.setItem(REQUEST_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* storage unavailable: the customer simply fills the form again after signing in */
  }
};

export const readDraft = (): RequestDraft | null => {
  try {
    const raw = sessionStorage.getItem(REQUEST_DRAFT_KEY);
    return raw ? (JSON.parse(raw) as RequestDraft) : null;
  } catch {
    return null;
  }
};

export const clearDraft = () => {
  try {
    sessionStorage.removeItem(REQUEST_DRAFT_KEY);
  } catch {
    /* ignore */
  }
};
