import { createContext, useContext, useEffect, useId, useRef, useState } from 'react';
import { kindLabels, socialHref, socialPlatformById } from './data.js';
import { buildVCard, imagePositionValue, safeUrl, slugify } from './model.js';
import { isProductionRelease } from './buildInfo.js';

export const UMBOContext = createContext(null);
export const useUMBO = () => useContext(UMBOContext);
export const cx = (...values) => values.filter(Boolean).join(' ');
let pdfjsPromise;
const loadPdfJs = () => {
  if (!pdfjsPromise) pdfjsPromise = Promise.all([import('pdfjs-dist/legacy/build/pdf.mjs'), import('pdfjs-dist/legacy/build/pdf.worker.mjs?url')]).then(([pdfjs, worker]) => { pdfjs.GlobalWorkerOptions.workerSrc = worker.default; return pdfjs; });
  return pdfjsPromise;
};
const isMobileDevice = () => typeof navigator !== 'undefined' && Boolean(navigator.userAgentData?.mobile || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent));
const downloadVCard = (profile) => {
  const filename = `${slugify(profile.name || 'umbo-contact')}.vcf`;
  const objectUrl = URL.createObjectURL(new Blob([buildVCard(profile)], { type: 'text/vcard;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
  return filename;
};

export function Icon({ name, size = 18 }) {
  const paths = {
    arrow: <><path d="M5 12h14m-6-6 6 6-6 6" /></>, back: <path d="M19 12H5m6 6-6-6 6-6" />,
    chevron: <path d="m7 10 5 5 5-5" />, menu: <path d="M4 6h16M4 12h16M4 18h16" />, close: <path d="m6 6 12 12M18 6 6 18" />,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></>,
    check: <path d="m5 12 4 4L19 6" />, shield: <path d="m12 3 8 3v5c0 5-3 8-8 10-5-2-8-5-8-10V6l8-3Z" />,
    link: <><path d="M10 13.5a4 4 0 0 0 5.7.2l2-2a4 4 0 0 0-5.7-5.7l-1.1 1.1M14 10.5a4 4 0 0 0-5.7-.2l-2 2a4 4 0 0 0 5.7 5.7l1.1-1.1" /></>,
    qr: <><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2h-2zM18 18h2v2h-2zM14 18h2v2h-2z" /></>,
    nfc: <path d="M8 16a5 5 0 0 1 0-8m4 11a9 9 0 0 1 0-14m4 17a13 13 0 0 1 0-20" />,
    spark: <path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3Zm7 13 .6 2.4L22 19l-2.4.6L19 22l-.6-2.4L16 19l2.4-.6L19 16Z" />,
    people: <><circle cx="9" cy="8" r="3" /><path d="M3.5 20c.5-3.4 2.2-5 5.5-5s5 1.6 5.5 5M15 5.5a3 3 0 0 1 0 5.8M16 15c2.8.3 4.3 1.8 4.7 5" /></>,
    building: <path d="M4 21V5l8-3 8 3v16M8 8h1m6 0h1m-8 4h1m6 0h1m-6 9v-4h4v4" />,
    globe: <><circle cx="12" cy="12" r="8.5" /><path d="M4 9h16M4 15h16M12 3.5c4.3 4.6 4.3 12.4 0 17-4.3-4.6-4.3-12.4 0-17Z" /></>,
    box: <path d="m4 8 8-4 8 4-8 4-8-4Zm0 0v8l8 4 8-4V8m-8 4v8" />,
    chart: <path d="M4 5v14h16M7 15l3-4 3 2 5-6" />, edit: <path d="m4 16-.7 4.7L8 20 19 9l-4-4L4 16Zm9-9 4 4" />,
    external: <path d="M14 4h6v6m0-6-9 9m7 0v6H4V5h6" />,
    copy: <><rect x="8" y="8" width="11" height="12" rx="2" /><path d="M16 8V4H4v13h4" /></>,
    download: <path d="M12 4v12m-5-5 5 5 5-5M4 20h16" />, plus: <path d="M12 5v14M5 12h14" />,
    lock: <><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    eye: <><path d="M3 12s3-5 9-5 9 5 9 5-3 5-9 5-9-5-9-5Z" /><circle cx="12" cy="12" r="2" /></>,
    alert: <path d="m12 4 9 16H3L12 4Zm0 5v5m0 3h.01" />, upload: <path d="M12 16V4m-5 5 5-5 5 5M5 20h14" />,
    card: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h4" /></>,
    key: <><circle cx="8" cy="15" r="4" /><path d="m11 12 8-8m-4 4 2 2m0-4 2 2" /></>,
    stand: <path d="M6 4h12v10H6zM9 20h6m-3-6v6" />, admin: <><path d="m12 3 8 4v5c0 4.5-3 7.6-8 9-5-1.4-8-4.5-8-9V7l8-4Z" /><path d="M9 12h6m-3-3v6" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>,
    pin: <><path d="M19 10c0 5-7 10-7 10S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2" /></>,
    file: <path d="M6 3h8l4 4v14H6V3Zm8 0v5h4M9 13h6m-6 4h6" />,
    share: <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m9 10 6-3M9 14l6 3" /></>,
    up: <path d="m6 10 6-6 6 6M12 4v16" />,
    instagram: <><rect x="4" y="4" width="16" height="16" rx="5" /><circle cx="12" cy="12" r="3.5" /><circle cx="17.2" cy="6.8" r=".8" fill="currentColor" stroke="none" /></>,
    linkedin: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 10v6M8 7.5v.01M11 16v-3.2a2.8 2.8 0 0 1 5.6 0V16M11 10v6" /></>,
    facebook: <path d="M13.5 20v-7h2.4l.4-3h-2.8V8.1c0-.9.3-1.5 1.6-1.5h1.4V4a18 18 0 0 0-2.1-.1c-2.6 0-4.3 1.6-4.3 4.4V10H7.5v3h2.6v7" />,
    x: <path d="m5 4 14 16M19 4 5 20" />,
    tiktok: <path d="M14 4v10.2a3.7 3.7 0 1 1-3-3.6M14 4c.6 2.2 2 3.6 4.5 4" />,
    youtube: <><rect x="3" y="6" width="18" height="12" rx="4" /><path d="m10 9 5 3-5 3V9Z" /></>,
    whatsapp: <><path d="M5 19.5 6.3 16A7.8 7.8 0 1 1 9 18.5L5 19.5Z" /><path d="M9 9.5c.6 2 2 3.4 4 4m-4.8-4.9c0-.6.4-.9.8-.9h.7l.8 1.7-.7.8m4.6 2.9.8-.7 1.7.8v.7c0 .5-.3.9-.9.9-1.1-.2-2.1-.7-3-1.4" /></>,
    telegram: <path d="m4 11 16-6-5 15-3.2-5.2L4 11Zm7.8 3.8L20 5" />,
    github: <><circle cx="12" cy="12" r="8.5" /><path d="M8.5 18.5c.2-1.6-.4-2.4-1.2-3m9.4 3c-.2-1.6.4-2.4 1.2-3M8 9.2c-.6-1-.5-2.2-.1-3.2M16 9.2c.6-1 .5-2.2.1-3.2M8 13.5c1.6 1 6.4 1 8 0" /></>,
    behance: <><path d="M4 6h5.2c2.4 0 3.8 1.2 3.8 3 0 1.2-.7 2.1-1.8 2.5 1.5.3 2.4 1.4 2.4 2.8 0 2-1.5 3.7-4.2 3.7H4V6Zm3 2.4v2.2h1.7c.8 0 1.3-.4 1.3-1.1s-.5-1.1-1.3-1.1H7Zm0 4.6v2.5h2c.9 0 1.5-.5 1.5-1.3s-.6-1.2-1.5-1.2H7Z" /><path d="M17 8h3m-5.2 6.1c.2 1.1 1 1.7 2 1.7 1 0 1.6-.4 2-.9M14.8 13.2c0-2.3 1.4-3.7 3.3-3.7s3.1 1.5 3.1 3.8v.3h-4.7" /></>,
    dribbble: <><circle cx="12" cy="12" r="8.5" /><path d="M4 9.5c4.8.4 9.2-.5 13.1-2.7M5.5 16c3.6-2 7.4-2.5 12.2-1.3M9 4.2c2.8 3.5 4.8 7.6 5.9 13.5M4.6 13.5c3.8-1.3 8.5-1.6 14.7-.9" /></>,
    threads: <><path d="M17.7 11.2c-.3-2.4-1.8-3.8-4.2-4.1-2.3-.3-4.4.7-5.2 2.6-.7 1.6-.1 3.3 1.5 4.1 1.4.8 3.3.4 4.1-.8.8-1.2.2-2.8-1.2-3.4-1.6-.7-3.5 0-3.6 1.9-.2 2.8 2.2 4.8 5.1 4.8 3.2 0 5.4-2 5.4-5.2 0-3.4-2.5-5.7-6.1-5.7" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.spark}</svg>;
}

export function Button({ children, variant = 'dark', icon, className, type = 'button', ...props }) {
  return <button className={cx('button', `button--${variant}`, className)} type={type} {...props}>{icon && <Icon name={icon} size={17} />}<span>{children}</span></button>;
}
export const Eyebrow = ({ children, light }) => <span className={cx('eyebrow', light && 'eyebrow--accent')}>{children}</span>;
export function Status({ children, tone = 'info', icon = 'shield' }) {
  return <span className={`status-badge status-badge--${tone}`}><Icon name={icon} size={13} />{children}</span>;
}
export function Heading({ eyebrow, title, children, center }) {
  return <div className={cx('section-heading', center && 'section-heading--center')}><Eyebrow>{eyebrow}</Eyebrow><h2>{title}</h2>{children && <p>{children}</p>}</div>;
}
export function Field({ label, value, onChange, hint, multiline, ...props }) {
  const id = useId();
  const shared = { id, value: value || '', onChange: (e) => onChange(e.target.value), 'aria-label': label, 'aria-describedby': hint ? `${id}-hint` : undefined, ...props };
  return <label className="form-field" htmlFor={id}><span>{label}{props.required && <b aria-hidden="true">*</b>}</span>{multiline ? <textarea rows={4} {...shared} /> : <input type="text" {...shared} />}{hint && <small id={`${id}-hint`}>{hint}</small>}</label>;
}
export function ErrorBox({ errors }) {
  return errors?.length ? <div className="form-error" role="alert"><Icon name="alert" /><div>{errors.map((error) => <p key={error}>{error}</p>)}</div></div> : null;
}
export function DemoNotice({ children = 'Accounts, publication, verification and orders are simulated locally.' }) {
  return <div className="demo-banner"><span className="demo-dot" /><strong>{isProductionRelease ? 'Local release' : 'Development'}</strong><span>{children}</span></div>;
}
export function Stepper({ current = 1 }) {
  return <ol className="stepper" aria-label="Profile creation progress">{['Start', 'Customize', 'Review', 'Share'].map((label, i) => <li key={label} className={cx('stepper__step', i + 1 < current && 'is-complete', i + 1 === current && 'is-current')} aria-current={i + 1 === current ? 'step' : undefined}><span>{i + 1 < current ? <Icon name="check" size={13} /> : i + 1}</span><small>{label}</small></li>)}</ol>;
}
export function Empty({ icon = 'spark', title, children, action, onClick }) {
  return <div className="empty-state"><span className="empty-state__icon"><Icon name={icon} size={26} /></span><h2>{title}</h2><p>{children}</p>{action && <Button variant="outline" onClick={onClick}>{action}</Button>}</div>;
}

export function Header({ workspace = false }) {
  const { state, go, start, dispatch, route } = useUMBO();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [route.path, route.search]);
  return <header className="public-header" data-sticky-header><div className="shell public-header__inner">
    <a className="brand-mark" href="#/" aria-label="UMBO home"><img className="umbo-logo" src="/brand/umbo-logo-inverse.svg" alt="UMBO" width="180" height="48" /></a>
    <nav id="main-nav" className={cx('public-nav', open && 'public-nav--open')} aria-label="Main navigation">
      {workspace ? <><a href="#/dashboard">My dashboard</a><a href="#/examples">Explore examples</a><a href="#/smartmerch">SmartMerch</a><button onClick={() => { dispatch({ type: 'SIGN_OUT' }); go('sign-in'); }}>Sign out</button></> : <>
        <a href="#/examples" className={route.path.startsWith('example') ? 'is-active' : ''}>Examples</a>
        <a href="#/examples?category=Personal">Personal</a>
        <a href="#/application/business">Business</a><a href="#/application/organization">Organizations</a><a href="#/smartmerch">SmartMerch</a>
        <div className="public-nav__actions"><Button variant="quiet" onClick={() => go(state.authenticated ? 'dashboard' : 'sign-in')}>{state.authenticated ? 'My dashboard' : 'Sign in'}</Button><Button variant="light" onClick={() => start('studio')}>Create your UMBO <Icon name="arrow" size={15} /></Button></div>
      </>}
    </nav>
    <button className="icon-button public-header__menu" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="main-nav" onClick={() => setOpen(!open)}><Icon name={open ? 'close' : 'menu'} size={23} /></button>
  </div></header>;
}

export function Footer() {
  return <footer className="public-footer"><div className="shell"><div className="public-footer__top"><div><a className="brand-mark" href="#/" aria-label="UMBO home"><img className="umbo-logo" src="/brand/umbo-logo-inverse.svg" alt="UMBO" width="180" height="48" /></a><p className="public-footer__tagline">One digital presence.<br />Connected to the real world.</p></div><div className="footer-links"><div><strong>Explore UMBO</strong><a href="#/examples">Working examples</a><a href="#/flow">How it works</a><a href="#/smartmerch">SmartMerch</a></div><div><strong>Your next step</strong><a href="#/account">Create your profile</a><a href="#/dashboard">Your dashboard</a><a href="#/design">Design system</a></div></div></div><div className="public-footer__bottom"><span>© 2026 UMBO · Giving shape to ideas.</span><a href="#/reviewer">Reviewer demo</a><span>Interactive prototype · simulated data</span></div></div></footer>;
}

export function ExampleCard({ example }) {
  const { go } = useUMBO();
  return <article className="example-card"><a className="example-card__image" href={`#/example/${example.id}`} aria-label={`Preview ${example.name}`}><img src={`/images/${example.image}`} alt="" loading="lazy" /><div className="example-card__image-overlay" /><Status tone="light" icon={example.kind === 'personal' ? 'people' : example.kind === 'business' ? 'building' : 'globe'}>{example.useCase}</Status><span className="example-card__open"><Icon name="arrow" /></span></a><div className="example-card__body"><Eyebrow>{example.category} · {example.location.split(',')[0]}</Eyebrow><h3>{example.name}</h3><p>{example.description}</p><div className="example-card__stats">{example.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><button className="text-link" onClick={() => go(`example/${example.id}`)}>View example <Icon name="arrow" size={15} /></button></div></article>;
}

function dataUrlBytes(dataUrl) {
  const base64 = dataUrl.split(',')[1] || '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function PdfPreview({ file, label }) {
  const canvasRef = useRef(null);
  const [pdf, setPdf] = useState(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [status, setStatus] = useState('Loading PDF preview…');
  useEffect(() => {
    let active = true;
    let loadedPdf;
    setPdf(null); setPage(1); setPages(0); setStatus('Loading PDF preview…');
    loadPdfJs().then((pdfjsLib) => pdfjsLib.getDocument({ data: dataUrlBytes(file.dataUrl) }).promise).then((document) => {
      loadedPdf = document;
      if (!active) return document.destroy();
      setPdf(document); setPages(document.numPages); setStatus('');
    }).catch(() => { if (active) setStatus('This PDF could not be previewed here. Use Download file to open it.'); });
    return () => { active = false; if (loadedPdf) loadedPdf.destroy(); };
  }, [file.dataUrl]);
  useEffect(() => {
    if (!pdf || !canvasRef.current) return undefined;
    let active = true;
    pdf.getPage(page).then((pdfPage) => {
      if (!active) return;
      const baseViewport = pdfPage.getViewport({ scale: 1 });
      const scale = Math.min(1.8, Math.max(.7, 700 / baseViewport.width));
      const viewport = pdfPage.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.aspectRatio = `${viewport.width} / ${viewport.height}`;
      return pdfPage.render({ canvasContext: context, viewport }).promise;
    }).catch(() => { if (active) setStatus('This PDF page could not be rendered. Use Download file to open it.'); });
    return () => { active = false; };
  }, [pdf, page]);
  return <div className="profile-pdf-preview">{status && <p className="profile-pdf-status" role="status">{status}</p>}<canvas ref={canvasRef} aria-label={`PDF preview of ${label}`} />{pages > 1 && <div className="profile-pdf-pages"><button className="button button--quiet button--small" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button><span>Page {page} of {pages}</span><button className="button button--quiet button--small" disabled={page >= pages} onClick={() => setPage((current) => Math.min(pages, current + 1))}>Next</button></div>}</div>;
}

function ProfileFiles({ files = [], visible = true }) {
  const [previewFile, setPreviewFile] = useState(null);
  useEffect(() => {
    if (!previewFile) return undefined;
    const closeOnEscape = (event) => { if (event.key === 'Escape') setPreviewFile(null); };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [previewFile]);
  if (!visible || !files.length) return null;
  const labelFor = (file) => file.label?.trim() || file.fileName || 'Open file';
  const download = async (file) => {
    const link = document.createElement('a');
    link.download = file.fileName || `${labelFor(file)}.${file.type === 'application/pdf' ? 'pdf' : 'file'}`;
    try {
      const response = await fetch(file.dataUrl);
      const objectUrl = URL.createObjectURL(await response.blob());
      link.href = objectUrl;
      link.click();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
    } catch {
      link.href = file.dataUrl;
      link.click();
    }
  };
  return <><div className="profile-file-list" aria-label="Profile files">{files.map((file) => <button className="profile-file-button" disabled={!file.dataUrl} key={file.id || file.fileName} onClick={() => setPreviewFile(file)}><Icon name={file.type === 'application/pdf' ? 'file' : 'eye'} size={17} /><span>{file.dataUrl ? labelFor(file) : `${labelFor(file)} (loading…)`}</span><Icon name="external" size={14} /></button>)}</div>{previewFile && <div className="profile-file-modal" role="presentation" onMouseDown={() => setPreviewFile(null)}><section className="profile-file-modal__dialog" role="dialog" aria-modal="true" aria-labelledby={`profile-file-preview-title-${previewFile.id || 'file'}`} onMouseDown={(event) => event.stopPropagation()}><header className="profile-file-modal__header"><div><Eyebrow>File preview</Eyebrow><h3 id={`profile-file-preview-title-${previewFile.id || 'file'}`}>{labelFor(previewFile)}</h3></div><button className="icon-button" aria-label="Close file preview" onClick={() => setPreviewFile(null)}><Icon name="close" size={19} /></button></header><div className="profile-file-modal__body">{previewFile.type === 'application/pdf' ? <PdfPreview file={previewFile} label={labelFor(previewFile)} /> : <img src={previewFile.dataUrl} alt={`Preview of ${labelFor(previewFile)}`} />}</div><footer className="profile-file-modal__footer"><button className="button button--outline" onClick={() => download(previewFile)}><Icon name="download" size={16} /><span>Download file</span></button><button className="button button--dark" onClick={() => setPreviewFile(null)}>Close</button></footer></section></div>}</>;
}

export function ProfileView({ profile, kind = 'personal', example = false, published = false, compact = false }) {
  const [tab, setTab] = useState('about');
  const [contactSaved, setContactSaved] = useState(false);
  const vis = profile.visibility || { basics: true, contact: true, links: true, sections: true };
  const contactIsPublic = Boolean(vis.contact && (profile.email?.trim() || profile.phone?.trim()));
  const mobileDevice = isMobileDevice();
  const legacySocials = [
    profile.instagram ? { platform: 'instagram', value: profile.instagram } : null,
    profile.linkedin ? { platform: 'linkedin', value: profile.linkedin } : null,
  ].filter(Boolean);
  const links = [
    { label: 'Website', value: profile.website, href: profile.website, icon: 'link' },
    ...(profile.socials?.length ? profile.socials : legacySocials).map((social) => { const platform = socialPlatformById(social.platform); return { label: platform.label, value: social.value, href: socialHref(social.platform, social.value), icon: platform.icon }; }),
  ].filter((link) => safeUrl(link.href));
  const saveContact = async () => {
    const filename = `${slugify(profile.name || 'umbo-contact')}.vcf`;
    const file = new File([buildVCard(profile)], filename, { type: 'text/vcard;charset=utf-8' });
    if (mobileDevice && typeof navigator.share === 'function') {
      try {
        const canShareFile = typeof navigator.canShare !== 'function' || navigator.canShare({ files: [file] });
        if (canShareFile) {
          await navigator.share({ title: `${profile.name || 'UMBO'} contact`, files: [file] });
          setContactSaved(true);
          return;
        }
      } catch (error) {
        if (error?.name === 'AbortError') return;
      }
    }
    downloadVCard(profile);
    setContactSaved(true);
  };
  return <article className={cx('public-builder-preview', `profile-theme--${profile.accent || 'mint'}`, compact && 'profile-view--compact')} aria-label="Public profile preview">
     {vis.basics ? <><div className="builder-cover" style={{ backgroundImage: `linear-gradient(0deg, #061e4933, transparent), url("${profile.cover || '/images/personal.jpg'}")`, backgroundPosition: imagePositionValue(profile.coverPosition) }} /><div className="builder-preview__content"><span className="avatar avatar--photo builder-avatar"><img src={profile.avatar || '/images/personal.jpg'} style={{ objectPosition: imagePositionValue(profile.avatarPosition) }} alt={`${profile.name || 'Your'} profile`} /></span>
      <Status tone={kind === 'organization' ? 'purple' : 'success'} icon={kind === 'personal' ? 'people' : 'check'}>{example ? `${kind === 'personal' ? 'Personal' : 'Verified'} example` : `${kindLabels[kind] === 'Organizations' ? 'Organization' : kindLabels[kind]} ${published ? '· simulated' : 'profile'}`}</Status>
      <h2>{profile.name || 'Your name'}</h2><p className="preview-headline">{profile.headline || 'A headline that sounds like you.'}</p>
      {profile.location && <span className="profile-location"><Icon name="pin" size={14} />{profile.location}</span>}
      <div className="profile-content-tabs" aria-label="Profile sections"><button className={tab === 'about' ? 'is-selected' : ''} onClick={() => setTab('about')}>About</button><button className={tab === 'connect' ? 'is-selected' : ''} onClick={() => setTab('connect')}>Connect <Icon name="arrow" size={13} /></button></div>
      {tab === 'about' ? <><p className="profile-bio">{profile.bio || 'Your story starts here. Add a short introduction.'}</p>{vis.sections && profile.sections?.filter((s) => s.title || s.body).map((section) => <details className="profile-section" key={section.id || section.title}><summary>{section.title || 'More about me'}<Icon name="plus" size={15} /></summary><p>{section.body || section.detail || 'More details coming soon.'}</p>{safeUrl(section.url) && <a href={safeUrl(section.url)} target="_blank" rel="noreferrer">Explore this link <Icon name="external" size={13} /></a>}</details>)}</> : <div className="profile-contact-panel">{vis.contact && (profile.email || profile.phone) ? <><strong>Let’s start a conversation.</strong>{profile.email && <a href={`mailto:${profile.email}`}><Icon name="mail" size={15} />{profile.email}</a>}{profile.phone && <a href={`tel:${profile.phone.replace(/[^+\d]/g, '')}`}><Icon name="people" size={15} />{profile.phone}</a>}{contactIsPublic && <button className="save-contact-button" data-contact-mode={mobileDevice ? 'mobile' : 'desktop'} onClick={saveContact}><Icon name="download" size={16} />{contactSaved ? 'Contact ready' : 'Save contact'}</button>}</> : <><Icon name="lock" size={20} /><strong>Contact details are restricted.</strong><p>This profile owner chooses what to share.</p></>}</div>}
      {vis.links && links.length > 0 && <div className="social-link-list">{links.map((link) => <a key={`${link.label}-${link.href}`} href={safeUrl(link.href)} target="_blank" rel="noreferrer" aria-label={link.label}><Icon name={link.icon} size={16} /><span>{link.label}</span></a>)}</div>}
      <div className="profile-powered"><img src="/brand/umbo-mark.svg" width="18" height="18" alt="" />Connected with UMBO{example && <span>Demo profile</span>}</div>
    </div></> : <div className="profile-restricted"><Icon name="lock" size={30} /><h3>This profile is restricted.</h3><p>Make profile basics public to share your introduction.</p></div>}
    <ProfileFiles files={profile.files} visible={profile.visibility?.basics !== false && profile.visibility?.files !== false} />
  </article>;
}

export function WorkspaceNav({ current }) {
  const { state } = useUMBO();
  return <nav className="workspace-nav" aria-label="Workspace navigation"><div className="workspace-nav__label">Your connected world</div>{[['dashboard', 'Overview', 'chart'], ['builder/personal', 'My profile', 'people'], ['share/personal', 'QR & link', 'qr'], ['workspace/business', 'Business', 'building'], ['workspace/organization', 'Organization', 'globe'], ['smartmerch', 'SmartMerch', 'box']].map(([path, label, icon]) => <a href={`#/${path}`} key={path} className={current === path ? 'is-active' : ''} aria-current={current === path ? 'page' : undefined}><Icon name={icon} size={18} /><span>{label}</span></a>)}<div className="workspace-nav__identity"><span className="avatar avatar--initials">{state.account?.name?.slice(0, 1) || 'U'}</span><span>{state.account?.name || 'Demo workspace'}<small>Prototype member</small></span></div></nav>;
}

export function WorkspaceLayout({ current, eyebrow = 'Your UMBO workspace', title, subtitle, children, action }) {
  return <section className="section-block workspace-page"><div className="shell workspace-layout"><WorkspaceNav current={current} /><div className="workspace-main"><div className="workspace-header"><div><Eyebrow>{eyebrow}</Eyebrow><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>{children}</div></div></section>;
}

export const money = (value) => `KSh ${value.toLocaleString('en-KE')}`;
