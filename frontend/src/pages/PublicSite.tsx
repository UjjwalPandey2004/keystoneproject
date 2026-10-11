import React, { useEffect, useState } from 'react';
import {
  ArrowRight, BadgeCheck, CheckCircle2, ChevronDown, ChevronRight, ClipboardList, Clock3, Droplet, HardHat, LayoutGrid, LogIn, Mail, MapPin,
  Menu, Moon, Phone, ShieldCheck, Snowflake, Sun, User, UserCheck, UserPlus, Users, Wrench, X, Zap,
} from 'lucide-react';
import { KeystoneLogo } from '../components/KeystoneLogo';
import { useTheme } from '../context/ThemeContext';
import { LoginPage } from './LoginPage';
import { CareersSection } from './HrPages';
import { RequestDraft, saveDraft, SITE } from '../siteConfig';

export type SitePage = 'home' | 'services' | 'how-it-works' | 'about' | 'careers' | 'contact' | 'track' | 'login' | 'signup';
const PAGES: SitePage[] = ['home', 'services', 'how-it-works', 'about', 'careers', 'contact', 'track', 'login', 'signup'];

// The password-reset email opens /reset-password?token=..., which belongs to the login screen.
const pageFromLocation = (): SitePage => {
  if (window.location.pathname.startsWith('/reset-password')) return 'login';
  const hash = window.location.hash.replace(/^#\/?/, '').split('?')[0];
  return (PAGES as string[]).includes(hash) ? (hash as SitePage) : 'home';
};

const NAV: { page: SitePage; label: string }[] = [
  { page: 'home', label: 'Home' },
  { page: 'services', label: 'Services' },
  { page: 'how-it-works', label: 'How It Works' },
  { page: 'about', label: 'About Us' },
  { page: 'contact', label: 'Contact' },
];

const SERVICES = [
  {
    key: 'HVAC', icon: <Snowflake size={26} />, title: 'HVAC', short: 'Heating, ventilation and air conditioning services.',
    text: 'Air-conditioning, chillers, ventilation and heating: preventive servicing, gas top-ups, breakdown repair and AMC contracts.',
    points: ['Split, VRF & central AC', 'Chiller & AHU servicing', 'Duct cleaning'],
  },
  {
    key: 'ELECTRICAL', icon: <Zap size={26} />, title: 'Electrical', short: 'Safe and reliable electrical maintenance and repair.',
    text: 'Licensed electricians for wiring, panels, lighting and power backup, with safety checks on every visit.',
    points: ['Panels & DB repair', 'Lighting & fixtures', 'DG & UPS maintenance'],
  },
  {
    key: 'PLUMBING', icon: <Droplet size={26} />, title: 'Plumbing', short: 'Fixing leaks, clogs and water system issues.',
    text: 'Leak detection, pipe and fitting repair, pumps and water tanks for offices, retail and residential complexes.',
    points: ['Leak detection & repair', 'Pumps & motors', 'Tank cleaning'],
  },
];

const STEPS = [
  { icon: <ClipboardList size={22} />, title: 'Raise a request', text: 'Tell us what needs fixing, where, and how urgent it is. You get a reference ID straight away.' },
  { icon: <UserCheck size={22} />, title: 'We assign a technician', text: 'Our dispatch team assigns the right certified technician based on skills, location and availability.' },
  { icon: <Wrench size={22} />, title: 'Work gets done', text: 'The technician updates progress and service notes from the site, so you always know the status.' },
  { icon: <BadgeCheck size={22} />, title: 'Review, pay and close', text: 'Check the completed work, pay by cash, UPI, QR or card, and download your receipt.' },
];

const WHY = [
  { icon: <ShieldCheck size={24} />, title: 'Trusted Technicians', text: 'Skilled, certified and background-checked.' },
  { icon: <Clock3 size={24} />, title: 'Fast Response', text: 'Get help when you need it most.' },
  { icon: <MapPin size={24} />, title: 'Real-Time Tracking', text: 'Stay updated on every step.' },
  { icon: <Users size={24} />, title: 'Dedicated Support', text: "We're here for you, 24/7." },
];

const PHONE = /^[+]?[0-9 ()-]{7,20}$/;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface QuickRequest { name: string; email: string; phone: string; service: string }
const EMPTY_REQUEST: QuickRequest = { name: '', email: '', phone: '', service: '' };

/**
 * Hero "Request a Service" card. The details are kept until the visitor signs in (or signs up);
 * the request then opens pre-filled in My Services, where it is submitted to the backend.
 */
const RequestForm: React.FC<{ go: (p: SitePage) => void }> = ({ go }) => {
  const [form, setForm] = useState<QuickRequest>(EMPTY_REQUEST);
  const [errors, setErrors] = useState<Partial<Record<keyof QuickRequest, string>>>({});
  const set = (key: keyof QuickRequest) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const found: Partial<Record<keyof QuickRequest, string>> = {};
    if (form.name.trim().length < 2) found.name = 'Enter your full name.';
    if (!EMAIL.test(form.email.trim())) found.email = 'Enter a valid email address.';
    if (!PHONE.test(form.phone.trim())) found.phone = 'Enter a valid phone number.';
    if (!form.service) found.service = 'Choose the service you need.';
    setErrors(found);
    if (Object.keys(found).length > 0) {
      document.getElementById(`rq-${Object.keys(found)[0]}`)?.focus();
      return;
    }
    const draft: RequestDraft = {
      category: form.service, title: '', description: '', address: '', preferredDate: '', urgency: 'MEDIUM',
      contactName: form.name.trim(), contactPhone: form.phone.trim(), email: form.email.trim(),
    };
    saveDraft(draft);
    go('login');
  };

  const field = (key: keyof QuickRequest, icon: React.ReactNode, input: React.ReactNode) => (
    <div className="site-field">
      <div className={`site-input-icon ${errors[key] ? 'invalid' : ''}`}>
        <span aria-hidden="true">{icon}</span>
        {input}
      </div>
      {errors[key] && <span className="site-error" role="alert">{errors[key]}</span>}
    </div>
  );

  return (
    <form id="request" className="site-request site-reveal site-reveal-3" onSubmit={submit} noValidate aria-labelledby="request-title">
      <div className="site-request-head">
        <span className="site-request-icon" aria-hidden="true"><HardHat size={26} /></span>
        <div>
          <h2 id="request-title">Request a Service</h2>
          <p>Tell us what's not working, and we'll connect you with the right technician.</p>
        </div>
      </div>
      {field('name', <User size={18} />, <input id="rq-name" aria-label="Full name" placeholder="Full Name" value={form.name} onChange={set('name')} autoComplete="name" maxLength={100} aria-invalid={!!errors.name} />)}
      {field('email', <Mail size={18} />, <input id="rq-email" type="email" aria-label="Email address" placeholder="Email Address" value={form.email} onChange={set('email')} autoComplete="email" maxLength={150} aria-invalid={!!errors.email} />)}
      {field('phone', <Phone size={18} />, <input id="rq-phone" type="tel" aria-label="Phone number" placeholder="Phone Number" value={form.phone} onChange={set('phone')} autoComplete="tel" maxLength={20} aria-invalid={!!errors.phone} />)}
      {field('service', <LayoutGrid size={18} />, (
        <>
          <select id="rq-service" aria-label="Select service" value={form.service} onChange={set('service')} aria-invalid={!!errors.service} className={form.service ? '' : 'placeholder'}>
            <option value="" disabled>Select Service</option>
            <option value="HVAC">HVAC</option>
            <option value="ELECTRICAL">Electrical</option>
            <option value="PLUMBING">Plumbing</option>
            <option value="GENERAL">General maintenance</option>
          </select>
          <ChevronDown size={18} className="site-select-chevron" aria-hidden="true" />
        </>
      ))}
      <button type="submit" className="site-btn site-btn-navy site-btn-block site-btn-lg">Submit Request <ArrowRight size={18} /></button>
    </form>
  );
};

const Footer: React.FC<{ go: (p: SitePage) => void }> = ({ go }) => (
  <footer className="site-footer">
    <div className="site-container site-footer-grid">
      <div>
        <div className="site-brand site-brand-footer"><KeystoneLogo size={36} /><span>{SITE.shortName}</span></div>
        <p>{SITE.name}. HVAC, electrical and plumbing maintenance for commercial and residential properties.</p>
      </div>
      <div>
        <h4>Company</h4>
        <ul>
          {[...NAV.slice(1), { page: 'careers' as SitePage, label: 'Careers' }].map((n) => <li key={n.page}><a href={`#/${n.page}`} onClick={(e) => { e.preventDefault(); go(n.page); }}>{n.label}</a></li>)}
        </ul>
      </div>
      <div>
        <h4>Customers</h4>
        <ul>
          <li><a href="#/home" onClick={(e) => { e.preventDefault(); go('home'); }}>Request a service</a></li>
          <li><a href="#/track" onClick={(e) => { e.preventDefault(); go('track'); }}>Track my request</a></li>
          <li><a href="#/login" onClick={(e) => { e.preventDefault(); go('login'); }}>Customer login</a></li>
          <li><a href="#/signup" onClick={(e) => { e.preventDefault(); go('signup'); }}>Create an account</a></li>
        </ul>
      </div>
      <div>
        <h4>Contact</h4>
        <ul className="site-contact-list">
          <li><Phone size={15} /> <a href={SITE.phoneHref}>{SITE.phone}</a></li>
          <li><Mail size={15} /> <a href={`mailto:${SITE.email}`}>{SITE.email}</a></li>
          <li><MapPin size={15} /> {SITE.address}</li>
          <li><Clock3 size={15} /> {SITE.hours}</li>
        </ul>
      </div>
    </div>
    <div className="site-container site-footer-bottom">© {new Date().getFullYear()} {SITE.name}. All rights reserved.</div>
  </footer>
);

const PageHeader: React.FC<{ eyebrow: string; title: string; text: string }> = ({ eyebrow, title, text }) => (
  <section className="site-page-head">
    <div className="site-container">
      <span className="site-eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{text}</p>
    </div>
  </section>
);

const ServiceCards: React.FC<{ onRequest: () => void; detailed?: boolean }> = ({ onRequest, detailed }) => (
  <div className="site-cards">
    {SERVICES.map((s) => (
      <article key={s.key} className="site-card">
        <span className="site-card-icon">{s.icon}</span>
        <h3>{s.title}</h3>
        <p>{s.text}</p>
        {detailed && <ul className="site-checks">{s.points.map((p) => <li key={p}><CheckCircle2 size={16} /> {p}</li>)}</ul>}
        <button className="site-link" onClick={onRequest}>Request {s.title} service <ArrowRight size={15} /></button>
      </article>
    ))}
  </div>
);

export const PublicSite: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();
  const [page, setPage] = useState<SitePage>(pageFromLocation);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onHash = () => setPage(pageFromLocation());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = (next: SitePage) => {
    setMenuOpen(false);
    if (window.location.pathname !== '/' && !window.location.pathname.startsWith('/reset-password')) {
      window.history.replaceState(null, '', '/');
    }
    window.location.hash = `/${next}`;
    setPage(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // "Report a Problem" and service cards jump to the hero request card and focus its first field.
  const scrollToRequest = () => {
    if (page !== 'home') go('home');
    window.setTimeout(() => {
      document.getElementById('request')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      document.getElementById('rq-name')?.focus({ preventScroll: true });
    }, page === 'home' ? 0 : 120);
  };

  if (page === 'login' || page === 'signup') {
    return <LoginPage key={page} initialMode={page === 'signup' ? 'register' : 'login'} onBack={() => go('home')} />;
  }

  const link = (p: SitePage, label: string) => (
    <a key={p} href={`#/${p}`} className={page === p ? 'active' : ''} aria-current={page === p ? 'page' : undefined}
      onClick={(e) => { e.preventDefault(); go(p); }}>{label}</a>
  );

  return (
    <div className="site">
      <a href="#main" className="site-skip">Skip to content</a>
      <header className="site-header">
        <div className="site-container site-header-row">
          <a href="#/home" className="site-brand" onClick={(e) => { e.preventDefault(); go('home'); }} aria-label={`${SITE.name} home`}>
            <KeystoneLogo size={46} />
            <span className="site-brand-text">{SITE.shortName}<small>Maintenance Solutions</small></span>
          </a>
          <nav className={`site-nav ${menuOpen ? 'open' : ''}`} aria-label="Main">
            {NAV.map((n) => link(n.page, n.label))}
            <div className="site-nav-auth">
              <button className="site-btn site-btn-outline" onClick={() => go('login')}>Login</button>
              <button className="site-btn site-btn-navy" onClick={() => go('signup')}>Sign Up</button>
            </div>
          </nav>
          <div className="site-header-tools">
            <button className="site-theme-switch" role="switch" aria-checked={isDark} onClick={toggleTheme} aria-label="Dark mode">
              <Sun size={18} aria-hidden="true" />
              <span className="site-switch-track"><span className="site-switch-thumb"><Moon size={11} /></span></span>
            </button>
            <div className="site-auth">
              <button className="site-btn site-btn-outline" onClick={() => go('login')}>Login</button>
              <button className="site-btn site-btn-navy" onClick={() => go('signup')}>Sign Up</button>
            </div>
            <button className="site-icon-btn site-menu-btn" onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen} aria-label={menuOpen ? 'Close menu' : 'Open menu'}>
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      <main id="main">
        {page === 'home' && (
          <>
            <section className="site-hero">
              <div className="site-container site-hero-grid">
                <div className="site-hero-copy">
                  <span className="site-eyebrow site-reveal">Commercial &amp; Residential Maintenance</span>
                  <h1 className="site-hero-title">
                    <span className="site-reveal site-reveal-1">Your Problem.</span>
                    <span className="site-reveal site-reveal-2">Our <em>Expertise.</em></span>
                  </h1>
                  <p className="site-reveal site-reveal-2">When your HVAC, electrical, or plumbing system isn't working properly, Keystone is here to help. Quick service, trusted technicians, and complete visibility — from request to resolution.</p>
                  <div className="site-hero-actions site-reveal site-reveal-3">
                    <button className="site-btn site-btn-navy site-btn-xl" onClick={scrollToRequest}><Wrench size={20} /> Report a Problem <ArrowRight size={18} /></button>
                    <button className="site-btn site-btn-outline site-btn-xl" onClick={() => go('track')}><MapPin size={20} /> Track My Request <ArrowRight size={18} /></button>
                  </div>
                </div>
                <div className="site-hero-visual site-reveal site-reveal-2">
                  <img className="site-hero-photo" src="/images/hero-technician.jpg" width={496} height={484}
                    alt="A smiling Keystone technician in a navy uniform and cap, arms crossed, holding a pipe wrench, in front of rooftop air-conditioning units" />
                  <p className="site-hero-note" aria-hidden="true">
                    Skilled Technicians<br />Ready to Help!
                    <svg viewBox="0 0 60 50" className="site-hero-arrow"><path d="M6 4c4 18 16 32 44 38" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /><path d="M40 34l11 8-12 5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </p>
                </div>
                <RequestForm go={go} />
              </div>
            </section>

            <section className="site-services-band" aria-labelledby="services-title">
              <div className="site-container site-services-grid">
                <div className="site-services-intro">
                  <span className="site-eyebrow site-eyebrow-line">Our Services</span>
                  <h2 id="services-title">We Cover It All</h2>
                  <p>From cooling systems to electrical fixes, our expert technicians handle it all.</p>
                  <a href="#/services" className="site-link" onClick={(e) => { e.preventDefault(); go('services'); }}>View All Services <ArrowRight size={17} /></a>
                </div>
                {SERVICES.map((sv) => (
                  <button key={sv.key} className="site-service-tile" onClick={scrollToRequest} aria-label={`Request ${sv.title} service`}>
                    <span className="site-service-icon" aria-hidden="true">{sv.icon}</span>
                    <ChevronRight size={20} className="site-service-chevron" aria-hidden="true" />
                    <h3>{sv.title}</h3>
                    <p>{sv.short}</p>
                  </button>
                ))}
              </div>
            </section>

            <section className="site-benefits" aria-labelledby="benefits-title">
              <div className="site-container site-benefits-row">
                <div className="site-benefits-intro">
                  <h2 id="benefits-title">Why Choose Keystone?</h2>
                  <p>We make maintenance simple, reliable, and stress-free.</p>
                </div>
                {WHY.map((w) => (
                  <div key={w.title} className="site-benefit">
                    <span className="site-benefit-icon" aria-hidden="true">{w.icon}</span>
                    <div>
                      <h3>{w.title}</h3>
                      <p>{w.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

          </>
        )}

        {page === 'services' && (
          <>
            <PageHeader eyebrow="Services" title="Maintenance services" text="Preventive maintenance, repairs and annual contracts for HVAC, electrical and plumbing systems." />
            <section className="site-section">
              <div className="site-container">
                <ServiceCards onRequest={scrollToRequest} detailed />
                <div className="site-note">
                  <Wrench size={18} /> Need something else, such as carpentry, painting or general repairs? Choose <strong>General maintenance</strong> when you raise a request.
                </div>
              </div>
            </section>
          </>
        )}

        {page === 'how-it-works' && (
          <>
            <PageHeader eyebrow="How it works" title="From request to resolution" text="A clear, tracked process for every job, whether it is a dripping tap or a chiller breakdown." />
            <section className="site-section">
              <div className="site-container">
                <ol className="site-steps">
                  {STEPS.map((s, i) => (
                    <li key={s.title} className="site-step">
                      <span className="site-step-num">{i + 1}</span>
                      <span className="site-step-icon">{s.icon}</span>
                      <h3>{s.title}</h3>
                      <p>{s.text}</p>
                    </li>
                  ))}
                </ol>
                <div className="site-center"><button className="site-btn site-btn-primary site-btn-lg" onClick={scrollToRequest}>Raise a request <ArrowRight size={18} /></button></div>
              </div>
            </section>
          </>
        )}

        {page === 'about' && (
          <>
            <PageHeader eyebrow="About us" title={`About ${SITE.name}`} text="We look after the systems that keep commercial and residential buildings comfortable, powered and safe." />
            <section className="site-section">
              <div className="site-container site-about">
                <div>
                  <h2>Who we are</h2>
                  <p>{SITE.name} is a facilities maintenance company covering HVAC, electrical and plumbing work. Our dispatch team matches each job to a qualified technician near the site, and every request is tracked from the moment it is raised until it is signed off.</p>
                  <p>Customers see the status of their requests, the assigned technician and the service notes in their own portal, and can pay and download receipts online.</p>
                </div>
                <div className="site-values">
                  {WHY.map((w) => <div key={w.title} className="site-value"><span className="site-why-icon">{w.icon}</span><strong>{w.title}</strong><span>{w.text}</span></div>)}
                </div>
              </div>
            </section>
            <section className="site-cta">
              <div className="site-container site-cta-row">
                <div><h2>Join our team</h2><p>We are always looking for skilled technicians and dispatchers.</p></div>
                <button className="site-btn site-btn-primary site-btn-lg" onClick={() => go('careers')}>View open positions <ArrowRight size={18} /></button>
              </div>
            </section>
          </>
        )}

        {page === 'careers' && (
          <>
            <PageHeader eyebrow="Careers" title="Work with Keystone" text="Build your career in facilities maintenance with steady work, training and a supportive team." />
            <section className="site-section"><div className="site-container"><CareersSection /></div></section>
          </>
        )}

        {page === 'contact' && (
          <>
            <PageHeader eyebrow="Contact" title="Get in touch" text="Questions about a service, a quote or an annual maintenance contract? We are happy to help." />
            <section className="site-section">
              <div className="site-container site-contact">
                <div className="site-contact-cards">
                  <a className="site-contact-card" href={SITE.phoneHref}><Phone size={22} /><strong>Call us</strong><span>{SITE.phone}</span></a>
                  <a className="site-contact-card" href={`mailto:${SITE.email}`}><Mail size={22} /><strong>Email</strong><span>{SITE.email}</span></a>
                  <div className="site-contact-card"><MapPin size={22} /><strong>Office</strong><span>{SITE.address}</span></div>
                  <div className="site-contact-card"><Clock3 size={22} /><strong>Hours</strong><span>{SITE.hours}</span></div>
                </div>
                <ContactForm />
              </div>
            </section>
          </>
        )}

        {page === 'track' && (
          <>
            <PageHeader eyebrow="Track my request" title="Track your service request" text="Request status, assigned technician, service notes and history are kept in your secure customer portal." />
            <section className="site-section">
              <div className="site-container site-track">
                <div className="site-form-card">
                  <h3>Sign in to track</h3>
                  <p className="site-muted">For your privacy, request details are only shown after you sign in. Open <strong>My Services</strong> to see every request and its live status.</p>
                  <div className="site-track-actions">
                    <button className="site-btn site-btn-primary site-btn-block" onClick={() => go('login')}><LogIn size={18} /> Sign in</button>
                    <button className="site-btn site-btn-outline site-btn-block" onClick={() => go('signup')}><UserPlus size={18} /> Create an account</button>
                  </div>
                </div>
                <ol className="site-track-steps" aria-label="Request stages">
                  {['New request', 'Technician assigned', 'Work in progress', 'Completed', 'Closed'].map((s, i) => (
                    <li key={s}><span>{i + 1}</span>{s}</li>
                  ))}
                </ol>
              </div>
            </section>
          </>
        )}
      </main>
      <Footer go={go} />
    </div>
  );
};

/** Opens the visitor's email app with the message filled in (no message is stored by this site). */
const ContactForm: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()) || message.trim().length < 10) {
      setError('Enter your name, a valid email and a message of at least 10 characters.');
      return;
    }
    setError('');
    const body = `${message.trim()}\n\n${name.trim()}\n${email.trim()}`;
    window.location.href = `mailto:${SITE.email}?subject=${encodeURIComponent(`Enquiry from ${name.trim()}`)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <form className="site-form-card site-request" onSubmit={submit} noValidate>
      <h3>Send us a message</h3>
      {error && <span className="site-error" role="alert">{error}</span>}
      <label>Your name<input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={100} /></label>
      <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" maxLength={150} /></label>
      <label>Message<textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} /></label>
      <button type="submit" className="site-btn site-btn-primary site-btn-block"><Mail size={18} /> Open in my email app</button>
      <span className="site-muted" style={{ fontSize: '0.82rem' }}>This opens your email app with the message ready to send.</span>
    </form>
  );
};
