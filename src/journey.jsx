import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { templates, kindLabels, socialPlatforms, socialPlatformById } from './data.js';
import { MAX_PROFILE_FILE_BYTES, MAX_PROFILE_FILES, imagePositionValue, normalizeImagePosition, profileErrors, profileFileTypes, sampleUrl, safeUrl, templateById } from './model.js';
import { useUMBO, Button, Eyebrow, Icon, Status, Field, Stepper, DemoNotice, ProfileView, Empty, ErrorBox, cx } from './ui.jsx';

export function Account({ signIn = false }) {
  const { state, dispatch, template, go, notify } = useUMBO();
  const [error, setError] = useState('');
  const kind = template.kind;
  const restricted = kind !== 'personal';
  const form = state.onboarding;
  const after = () => go(restricted ? `application/${kind}` : 'builder/personal');
  const submit = (event) => {
    event.preventDefault();
    if (!form.name.trim()) return setError('Add your name so we can personalize your demo.');
    dispatch({ type: 'AUTHENTICATE', name: form.name, email: form.email });
    notify(signIn ? 'Signed in to this local demo.' : 'Your demo workspace is ready. Nothing was sent to a server.');
    after();
  };
  return <section className="section-block account-page"><div className="shell account-layout"><div className="account-intro"><a className="back-link" href="#/examples"><Icon name="back" size={16} />Explore examples</a><Eyebrow>{signIn ? 'Welcome back' : 'Your story starts here'}</Eyebrow><h1>{signIn ? 'Your world is waiting.' : <>Make room for<br />your next connection.</>}</h1><p>One clear introduction. A permanent destination. A presence that connects with your world.</p><div className="account-benefits">{[['link', 'Your template comes with you', `${template.name} is selected and ready to customize.`], ['shield', 'You choose what is shared', 'Preview public and restricted information before publishing.'], ['spark', restricted ? 'A trusted workspace' : 'Start simply. Grow naturally.', restricted ? 'Next, add your details and evidence. Publication follows approval.' : 'Add only the essentials now. You can build on your profile later.']].map(([icon, title, text]) => <div className="trust-point" key={title}><span className="icon-tile"><Icon name={icon} size={20} /></span><div><strong>{title}</strong><p>{text}</p></div></div>)}</div><Stepper current={1} /></div>
    <div className="account-card"><DemoNotice>Simulated authentication. Use sample details; no password or real account is needed.</DemoNotice><div className="selected-template"><div className="selected-template__image" style={{ backgroundImage: `url(/images/${template.image})` }} /><div><Eyebrow>Your selected template</Eyebrow><strong>{template.name}</strong><p>{kindLabels[kind]}{restricted ? ' · application required' : ' · ready to customize'}</p></div><a className="text-link" href="#/examples">Change</a></div>
      {state.authenticated ? <div className="account-continue"><Status tone="success" icon="check">Demo workspace ready</Status><h2>Good to see you, {state.account.name.split(' ')[0]}.</h2><p>{restricted ? 'Your template is saved. Next, submit an ownership or authorization application.' : 'Your template is saved. Next, add your story and make it yours.'}</p><Button className="button--full" onClick={after}>{restricted ? 'Continue to application' : 'Continue to customization'}<Icon name="arrow" size={16} /></Button><button className="text-link" onClick={() => { dispatch({ type: 'SIGN_OUT' }); go('sign-in'); }}>Use a different demo account</button></div> : <><div className="auth-title"><h2>{signIn ? 'Sign in to the demo' : 'Create your demo workspace'}</h2><p>{restricted ? 'Application details and evidence come next.' : 'A few details, then you’re ready to customize.'}</p></div><form className="form-stack" onSubmit={submit}><Field label="Your name" value={form.name} onChange={(name) => dispatch({ type: 'UPDATE_ONBOARDING', patch: { name } })} autoComplete="name" placeholder="e.g. Alex Kimani" required maxLength={80} /><Field label="Email address" type="email" value={form.email} onChange={(email) => dispatch({ type: 'UPDATE_ONBOARDING', patch: { email } })} placeholder="alex@example.com" autoComplete="email" required hint="Demo only. We won’t send anything or create a real account." /><ErrorBox errors={error ? [error] : []} /><Button type="submit" className="button--full">{signIn ? 'Enter demo workspace' : 'Create demo & continue'}<Icon name="arrow" size={16} /></Button><button className="text-link text-link--center" type="button" onClick={() => dispatch({ type: 'UPDATE_ONBOARDING', patch: { name: 'Alex Kimani', email: 'alex@example.com' } })}>Use sample details</button></form><p className="form-footnote">{signIn ? 'New to UMBO?' : 'Already exploring?'} <a href={signIn ? '#/account' : '#/sign-in'}>{signIn ? 'Create a demo' : 'Sign in'}</a></p></>}
      <details className="template-options"><summary>Try a different starting point <Icon name="chevron" size={15} /></summary><div className="template-mini-grid">{templates.slice(0, 6).map((item) => <button className={cx('template-mini', template.id === item.id && 'is-selected')} key={item.id} onClick={() => dispatch({ type: 'SELECT_TEMPLATE', id: item.id })}><span className="template-mini__image" style={{ backgroundImage: `url(/images/${item.image})` }} /><span><strong>{item.name}</strong><small>{kindLabels[item.kind]}{item.kind !== 'personal' ? ' · Apply' : ''}</small></span><Icon name={template.id === item.id ? 'check' : 'arrow'} size={16} /></button>)}</div></details>
    </div></div></section>;
}

function ImagePositionControl({ label, value, onChange }) {
  const position = normalizeImagePosition(value);
  const update = (axis, event) => onChange({ ...position, [axis]: Number(event.target.value) });
  return <fieldset className="image-position-controls"><legend>Adjust {label.toLowerCase()} position</legend><p>Move the image inside its frame.</p><label><span>Horizontal <output>{position.x}%</output></span><input type="range" min="0" max="100" value={position.x} aria-label={`${label} horizontal position`} onChange={(event) => update('x', event)} /></label><label><span>Vertical <output>{position.y}%</output></span><input type="range" min="0" max="100" value={position.y} aria-label={`${label} vertical position`} onChange={(event) => update('y', event)} /></label></fieldset>;
}

function ImageUpload({ label, value, onChange, cover = false, position, onPositionChange }) {
  const [error, setError] = useState('');
  const upload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 1.5 * 1024 * 1024) { setError('Choose a JPG, PNG or WebP image smaller than 1.5 MB.'); e.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = () => { onChange(reader.result); setError(''); };
    reader.onerror = () => setError('This image could not be read. Please choose it again.');
    reader.readAsDataURL(file);
  };
  return <div className={`image-upload ${cover ? 'image-upload--cover' : ''}`}><div className={cover ? 'cover-upload-preview image-upload__preview' : 'avatar avatar--photo image-upload__preview'}><img src={value} style={{ objectPosition: imagePositionValue(position) }} alt={`${label} preview`} /></div><div className="image-upload__details"><strong>{label}</strong><small>JPG, PNG or WebP · up to 1.5 MB</small><label className="text-link upload-action">Upload or replace<input type="file" accept="image/jpeg,image/png,image/webp" aria-label={`Upload ${label.toLowerCase()}`} onChange={upload} /></label></div>{onPositionChange && <ImagePositionControl label={label} value={position} onChange={onPositionChange} />}{error && <p className="field-error" role="alert">{error}</p>}</div>;
}

function ProfileFilesEditor({ files = [], onChange }) {
  const [error, setError] = useState('');
  const readFile = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsDataURL(file);
  });
  const upload = async (event) => {
    const selected = Array.from(event.target.files || []);
    const remaining = MAX_PROFILE_FILES - files.length;
    const errors = [];
    if (!selected.length) return;
    if (remaining <= 0) errors.push('Remove a file before adding another. You can share up to 2 files.');
    const additions = [];
    for (const file of selected.slice(0, Math.max(0, remaining))) {
      if (!profileFileTypes.includes(file.type)) { errors.push(`${file.name}: choose a PDF or image file.`); continue; }
      if (file.size > MAX_PROFILE_FILE_BYTES) { errors.push(`${file.name}: choose a file smaller than 2 MB.`); continue; }
      try { additions.push({ id: `${Date.now()}-${additions.length}`, label: file.name, fileName: file.name, type: file.type, dataUrl: await readFile(file) }); } catch (readError) { errors.push(readError.message); }
    }
    if (selected.length > Math.max(0, remaining)) errors.push('Only 2 files can be shared on a profile.');
    if (additions.length) onChange([...files, ...additions]);
    setError(errors.join(' '));
    event.target.value = '';
  };
  const update = (index, patch) => onChange(files.map((file, fileIndex) => fileIndex === index ? { ...file, ...patch } : file));
  return <div className="profile-files-editor"><div><strong className="field-label">Profile files</strong><p className="field-help">Upload up to 2 PDFs or images. Each file gets its own named button that visitors can preview and download.</p></div>{files.map((file, index) => <div className="profile-file-editor-row" key={file.id || `${file.fileName}-${index}`}><span className="profile-file-editor-icon"><Icon name={file.type === 'application/pdf' ? 'file' : 'eye'} size={20} /></span><div className="profile-file-editor-meta"><strong>{file.fileName}</strong><small>{file.type === 'application/pdf' ? 'PDF document' : 'Image'} · shared with visitors</small></div><Field label={`File button name ${index + 1}`} value={file.label} onChange={(label) => update(index, { label })} maxLength={80} placeholder="e.g. Download brochure" /><button className="icon-button icon-button--danger profile-file-remove" aria-label={`Remove file ${index + 1}`} onClick={() => onChange(files.filter((_, fileIndex) => fileIndex !== index))}><Icon name="close" size={16} /></button></div>)}{files.length < MAX_PROFILE_FILES && <label className="profile-file-upload"><Icon name="upload" size={21} /><span><strong>{files.length ? 'Add another file' : 'Upload files'}</strong><small>PDF, JPG, PNG, WebP or GIF · up to 2 MB each</small></span><input type="file" multiple accept="application/pdf,image/jpeg,image/png,image/webp,image/gif" aria-label="Upload profile files" onChange={upload} /></label>}{error && <p className="field-error" role="alert">{error}</p>}{files.length >= MAX_PROFILE_FILES && <small className="field-help">You have reached the 2-file limit. Remove one to replace it.</small>}</div>;
}

function SocialLinksEditor({ socials = [], onChange }) {
  const [nextPlatform, setNextPlatform] = useState('');
  const available = socialPlatforms.filter((platform) => !socials.some((social) => social.platform === platform.id));
  const addPlatform = () => {
    if (!nextPlatform) return;
    onChange([...socials, { platform: nextPlatform, value: '' }]);
    setNextPlatform('');
  };
  const update = (index, patch) => onChange(socials.map((social, i) => i === index ? { ...social, ...patch } : social));
  return <div className="social-editor"><p className="field-help">Choose the platforms you want to share. Each one gets its own icon and public link.</p>{socials.map((social, index) => { const platform = socialPlatformById(social.platform); return <div className="social-editor-row" key={`${social.platform}-${index}`}><label className="platform-field"><span>Platform {index + 1}</span><select aria-label={`Social platform ${index + 1}`} value={social.platform} onChange={(event) => update(index, { platform: event.target.value })}>{socialPlatforms.map((option) => <option key={option.id} value={option.id} disabled={socials.some((item, itemIndex) => itemIndex !== index && item.platform === option.id)}>{option.label}</option>)}</select></label><Field label={`${platform.label} profile`} value={social.value} onChange={(value) => update(index, { value })} placeholder={platform.placeholder} hint="Use a username or full profile URL." /><button className="icon-button icon-button--danger social-remove" aria-label={`Remove ${platform.label}`} onClick={() => onChange(socials.filter((_, itemIndex) => itemIndex !== index))}><Icon name="close" size={16} /></button></div>; })}<div className="social-add-row"><label className="platform-field"><span>Add a platform</span><select aria-label="Add a social platform" value={nextPlatform} onChange={(event) => setNextPlatform(event.target.value)}><option value="">Choose a platform…</option>{available.map((platform) => <option key={platform.id} value={platform.id}>{platform.label}</option>)}</select></label><Button variant="outline" icon="plus" disabled={!nextPlatform} onClick={addPlatform}>Add platform</Button></div>{!available.length && <small className="field-help">All available platforms have been added.</small>}</div>;
}

export function Builder({ kind }) {
  const { state, dispatch, go, notify } = useUMBO();
  const record = state.profiles[kind];
  const profile = record.draft;
  const template = templateById(record.templateId);
  const [tab, setTab] = useState('basics');
  const [mobileView, setMobileView] = useState('edit');
  const update = (patch) => dispatch({ type: 'UPDATE_PROFILE', kind, patch });
  const sectionUpdate = (id, patch) => update({ sections: profile.sections.map((s) => s.id === id ? { ...s, ...patch } : s) });
  useEffect(() => { dispatch({ type: 'SET_KIND', kind }); }, [kind, dispatch]);
  return <section className="section-block builder-page"><div className="shell"><div className="builder-heading"><div><a className="back-link" href="#/dashboard"><Icon name="back" size={16} />Your dashboard</a><Eyebrow>{kindLabels[kind]} profile · {template.name}</Eyebrow><h1>Make it yours.</h1><p>A little about you. A clear next step for everyone else.</p></div><Status tone="info" icon="edit">{record.published ? 'Editing draft · public version saved' : 'Draft · saved on this device'}</Status></div><Stepper current={2} />
    {kind !== 'personal' && state.applications[kind].status !== 'approved' && <div className="verification-inline"><Icon name="shield" /><span>You can customize your draft. Publishing becomes available after application approval.</span><a href={`#/application/${kind}`}>View application <Icon name="arrow" size={14} /></a></div>}
    <div className="mobile-builder-switch" aria-label="Builder view"><button aria-pressed={mobileView === 'edit'} onClick={() => setMobileView('edit')}><Icon name="edit" size={16} />Edit</button><button aria-pressed={mobileView === 'preview'} onClick={() => setMobileView('preview')}><Icon name="eye" size={16} />Live preview</button></div>
     <div className={cx('builder-layout', mobileView === 'preview' && 'builder-layout--preview')}><div className="builder-panel"><div className="builder-panel__header"><div><strong>Your profile, your way.</strong><small>Changes save automatically on this device.</small></div><Icon name="edit" /></div><div className="builder-tabs" aria-label="Edit sections">{[['basics', 'The essentials'], ['links', 'Links'], ['files', 'Files'], ['sections', 'Sections'], ['style', 'Style']].map(([key, label]) => <button className={tab === key ? 'is-selected' : ''} aria-pressed={tab === key} onClick={() => setTab(key)} key={key}>{label}</button>)}</div>
     {tab === 'basics' && <div className="form-stack"><ImageUpload label="Profile image" value={profile.avatar} position={profile.avatarPosition} onChange={(avatar) => update({ avatar })} onPositionChange={(avatarPosition) => update({ avatarPosition })} /><Field label="Profile name" value={profile.name} onChange={(name) => update({ name })} required maxLength={80} /><Field label="Headline" value={profile.headline} onChange={(headline) => update({ headline })} required maxLength={160} hint="A clear sentence about who you are or what you do." /><Field label={kind === 'personal' ? 'Biography' : 'Description'} multiline value={profile.bio} onChange={(bio) => update({ bio })} required maxLength={1200} /><Field label="Location" value={profile.location} onChange={(location) => update({ location })} placeholder="City, country" maxLength={100} /><details className="optional-fields"><summary>Contact details <Status tone="info" icon="lock">Private by default</Status></summary><div className="form-stack"><Field label="Contact email" type="email" value={profile.email} onChange={(email) => update({ email })} /><Field label="Phone number" type="tel" value={profile.phone} onChange={(phone) => update({ phone })} /></div></details></div>}
      {tab === 'links' && <div className="form-stack"><Field label="Website or portfolio" value={profile.website} onChange={(website) => update({ website })} placeholder="example.com" hint={profile.website && !safeUrl(profile.website) ? 'Use a valid http or https web address.' : 'You can add a URL with or without https://.'} /><SocialLinksEditor socials={profile.socials} onChange={(socials) => update({ socials, instagram: socials.find((social) => social.platform === 'instagram')?.value || '', linkedin: socials.find((social) => social.platform === 'linkedin')?.value || '' })} /></div>}
      {tab === 'files' && <ProfileFilesEditor files={profile.files} onChange={(files) => update({ files })} />}
      {tab === 'sections' && <div className="form-stack"><p className="field-help">A project, a service, a programme or a little more of your story. Add only what matters.</p>{profile.sections.map((section, i) => <div className="section-editor" key={section.id}><div className="section-editor__header"><strong>Section {i + 1}</strong><button className="icon-button" aria-label={`Remove section ${i + 1}`} onClick={() => update({ sections: profile.sections.filter((s) => s.id !== section.id) })}><Icon name="close" size={16} /></button></div><Field label={`Section ${i + 1} title`} value={section.title} onChange={(title) => sectionUpdate(section.id, { title })} maxLength={80} /><Field label={`Section ${i + 1} details`} multiline value={section.body} onChange={(body) => sectionUpdate(section.id, { body })} maxLength={1500} /><Field label={`Section ${i + 1} link (optional)`} value={section.url} onChange={(url) => sectionUpdate(section.id, { url })} placeholder="https://example.com/project" /></div>)}<Button variant="outline" icon="plus" disabled={profile.sections.length >= 6} onClick={() => update({ sections: [...profile.sections, { id: crypto.randomUUID(), title: '', body: '', url: '' }] })}>Add a section{profile.sections.length >= 6 ? ' (maximum 6)' : ''}</Button></div>}
     {tab === 'style' && <div className="form-stack"><div><strong className="field-label">Your UMBO accent</strong><p className="field-help">A touch of personality, from the existing brand palette.</p><div className="accent-picker">{['mint', 'blue', 'teal', 'purple'].map((accent) => <button className={`accent-swatch accent-swatch--${accent} ${profile.accent === accent ? 'is-selected' : ''}`} aria-label={`${accent} accent`} aria-pressed={profile.accent === accent} key={accent} onClick={() => update({ accent })}>{profile.accent === accent && <Icon name="check" size={18} />}</button>)}</div></div><ImageUpload label="Cover image" cover value={profile.cover} position={profile.coverPosition} onChange={(cover) => update({ cover })} onPositionChange={(coverPosition) => update({ coverPosition })} /><div className="image-presets"><span className="field-label">Or choose a sample cover</span>{['personal.jpg', 'business.jpg', 'community.jpg'].map((image, i) => <button key={image} aria-label={`Sample cover ${i + 1}`} onClick={() => update({ cover: `/images/${image}` })}><img src={`/images/${image}`} alt="" /></button>)}</div></div>}
      <div className="builder-panel__footer"><button className="text-link" onClick={() => { notify('Your draft is saved on this device.'); go('dashboard'); }}>Save & finish later</button><Button onClick={() => go(`review/${kind}`)}>Preview & review <Icon name="arrow" size={16} /></Button></div>
    </div><div className="builder-preview"><div className="preview-label"><span><Icon name="eye" size={16} />Your visitor’s view</span><Status tone="warning" icon="edit">Unpublished draft</Status></div><div className="preview-device"><ProfileView profile={profile} kind={kind} /></div><p className="preview-note"><Icon name="shield" size={14} />Your contact details follow your visibility settings.</p><Button className="mobile-preview-continue" onClick={() => go(`review/${kind}`)}>Review visibility <Icon name="arrow" size={16} /></Button></div></div></div></section>;
}

function VisibilitySwitch({ label, description, checked, onChange }) {
  return <div className="visibility-toggle"><span><strong>{label}</strong><small>{description}</small></span><button type="button" className={cx('toggle', checked && 'is-on')} role="switch" aria-label={label} aria-checked={checked} onClick={() => onChange(!checked)}><span /></button></div>;
}

export function Review({ kind }) {
  const { state, dispatch, go, notify } = useUMBO();
  const record = state.profiles[kind];
  const profile = record.draft;
  const errors = profileErrors(state, kind);
  const updateVisibility = (key, value) => dispatch({ type: 'UPDATE_PROFILE', kind, patch: { visibility: { ...profile.visibility, [key]: value } } });
  const publish = () => {
    if (errors.length) return;
    dispatch({ type: 'PUBLISH', kind });
    notify('Profile published in this prototype. Your production presence has not changed.');
    go(`share/${kind}?published=1`);
  };
  return <section className="section-block review-page"><div className="shell"><div className="builder-heading"><div><a className="back-link" href={`#/builder/${kind}`}><Icon name="back" size={16} />Back to customization</a><Eyebrow>One last look</Eyebrow><h1>A clear introduction.<br />On your terms.</h1><p>See what a visitor sees. Choose what stays private.</p></div><Status tone="warning" icon="edit">{record.published ? 'Draft update' : 'Unpublished draft'}</Status></div><Stepper current={3} /><div className="review-layout"><div className="review-preview"><div className="preview-label"><span><Icon name="eye" size={16} />Public visitor preview</span><span>{templateById(record.templateId).name}</span></div><div className="preview-device"><ProfileView profile={profile} kind={kind} /></div></div><div className="review-panel"><div className="review-panel__header"><div><strong>Your visibility choices</strong><small>Changes are reflected in the preview.</small></div><Icon name="shield" /></div>{[['basics', 'Public profile basics', 'Name, image, headline, location and biography.'], ['contact', 'Public contact details', 'Email and phone. Off means restricted.'], ['links', 'Public social links', 'Website, Instagram and LinkedIn.'], ['sections', 'Public profile sections', 'Your projects, services and additional information.']].map(([key, label, description]) => <VisibilitySwitch key={key} label={label} description={description} checked={profile.visibility[key]} onChange={(value) => updateVisibility(key, value)} />)}<div className="visibility-summary"><strong><Icon name="eye" size={16} />At a glance</strong><span><Icon name={profile.visibility.contact ? 'globe' : 'lock'} size={14} />Contact details {profile.visibility.contact ? 'public' : 'restricted'}</span><span><Icon name={profile.visibility.links ? 'globe' : 'lock'} size={14} />Social links {profile.visibility.links ? 'public' : 'restricted'}</span></div>{errors.length ? <><ErrorBox errors={errors} /><a className="text-link review-fix-link" href={kind !== 'personal' && state.applications[kind].status !== 'approved' ? `#/application/${kind}` : `#/builder/${kind}`}>Complete the next step <Icon name="arrow" size={15} /></a></> : <div className="review-alert review-alert--success"><Icon name="check" /><div><strong>Ready for your next connection.</strong><p>Your essentials are complete. You can edit your profile again at any time.</p></div></div>}<div className="review-actions"><Button className="button--full" disabled={errors.length > 0} onClick={publish}>{record.published ? 'Publish demo update' : 'Publish demo profile'}<Icon name="arrow" size={16} /></Button></div><p className="form-footnote"><Icon name="shield" size={13} />Simulated publication · stored on this device</p></div></div></div></section>;
}

export function PublicProfile({ kind, slug }) {
  const { state, go } = useUMBO();
  const record = state.profiles[kind];
  if (!record.published || (slug && slug !== record.slug)) return <section className="section-block shell"><Empty icon="lock" title="This profile is still a draft." action="Continue to review" onClick={() => go(`review/${kind}`)}>Nothing has been published. Your draft and visibility choices are saved on this device.</Empty></section>;
  return <section className="section-block published-profile-page"><div className="shell"><div className="published-profile-toolbar"><a className="back-link" href="#/dashboard"><Icon name="back" size={16} />Your dashboard</a><Status tone="success" icon="globe">Published · simulated</Status><Button variant="outline" icon="share" onClick={() => go(`share/${kind}`)}>Share profile</Button></div><div className="published-profile-main"><ProfileView profile={record.published} kind={kind} published /><aside className="published-profile-aside"><Eyebrow>The public visitor experience</Eyebrow><h1>Your introduction,<br />all in one place.</h1><p>This is your last published demo version. Draft edits only appear here when you publish an update.</p><div className="profile-link-box"><small>Illustrative permanent link</small><strong>{sampleUrl(record)}</strong><a className="text-link" href={`#/share/${kind}`}>QR & sharing tools <Icon name="arrow" size={15} /></a></div><div className="visibility-summary"><strong><Icon name="shield" size={16} />Published visibility</strong>{Object.entries(record.published.visibility).map(([key, on]) => <span key={key}><Icon name={on ? 'globe' : 'lock'} size={14} />{({ basics: 'Profile basics', contact: 'Contact details', links: 'Social links', sections: 'Profile sections' })[key]} {on ? 'public' : 'restricted'}</span>)}</div></aside></div></div></section>;
}

export function Sharing({ kind }) {
  const { state, go, notify, route } = useUMBO();
  const record = state.profiles[kind];
  const [qr, setQr] = useState('');
  const [qrError, setQrError] = useState(false);
  const [copied, setCopied] = useState(false);
  const localUrl = `${window.location.origin}/#/p/${kind}/${record.slug || 'draft'}`;
  useEffect(() => {
    if (!record.published) return;
    let active = true;
    QRCode.toString(localUrl, { type: 'svg', errorCorrectionLevel: 'M', margin: 4, color: { dark: '#061e49', light: '#ffffff' } }).then((svg) => { if (active) setQr(svg); }).catch(() => { if (active) setQrError(true); });
    return () => { active = false; };
  }, [localUrl, record.published]);
  if (!record.published) return <section className="section-block shell"><Empty icon="qr" title="A little more to do before sharing." action="Review your draft" onClick={() => go(`review/${kind}`)}>Your profile needs to be published in this prototype before it has a sharing link or QR code.</Empty></section>;
  const url = sampleUrl(record);
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); notify('Sample profile link copied.'); setTimeout(() => setCopied(false), 2500); }
    catch { notify('Clipboard is unavailable. Select and copy the sample URL shown in the card.'); }
  };
  const download = () => {
    if (!qr) return;
    const objectUrl = URL.createObjectURL(new Blob([qr], { type: 'image/svg+xml' }));
    const a = document.createElement('a'); a.href = objectUrl; a.download = `umbo-${record.slug}-qr.svg`; a.click();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
    notify('Your working prototype QR code has been downloaded.');
  };
  const share = async () => {
    if (!navigator.share) return copy();
    try { await navigator.share({ title: `${record.published.name} · UMBO demo`, text: 'Explore my sample UMBO introduction.', url }); }
    catch (error) { if (error.name !== 'AbortError') notify('Sharing is unavailable here. You can copy your sample link instead.'); }
  };
  return <section className="section-block success-page"><div className="shell"><div className="success-layout"><div className="success-copy"><div className="success-mark"><Icon name="check" size={30} /></div><Eyebrow light>{route.params.has('published') ? 'You made it yours' : 'Your QR & sharing tools'}</Eyebrow><h1>Your presence.<br /><span className="gradient-text">Ready to travel.</span></h1><p>A single introduction. A permanent destination. Your demo profile is ready for the next hello — from a link, a scan or a tap.</p><Status tone="light" icon="globe">Published in prototype · not a production profile</Status><div className="success-actions"><Button variant="gradient" icon="copy" onClick={copy}>{copied ? 'Link copied' : 'Copy sample profile link'}</Button><Button variant="outline-light" icon="external" onClick={() => go(`p/${kind}/${record.slug}`)}>View published profile</Button></div><button className="success-merch-link" onClick={() => go(`smartmerch?kind=${kind}`)}><Icon name="nfc" size={22} /><span><strong>Take your introduction offline.</strong><small>Explore optional SmartMerch, linked to this profile.</small></span><Icon name="arrow" size={18} /></button><a className="success-dashboard-link" href="#/dashboard">Back to your dashboard <Icon name="arrow" size={16} /></a></div><div className="success-share-card"><div className="success-share-card__top"><span><Icon name="link" size={16} />Your permanent link</span><Status tone="success" icon="check">Demo published</Status></div><div className="success-url" tabIndex="0">{url}</div><p className="sample-url-note">Illustrative UMBO URL. No live umbo.me profile is created.</p>{qr ? <img className="qr-image" src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr)}`} alt={`Working QR for ${record.published.name}'s local prototype profile`} data-qr-value={localUrl} width="240" height="240" /> : <div className="qr-loading" role="status">{qrError ? 'QR unavailable. Your sample link is still ready to copy.' : 'Preparing your QR…'}</div>}<p className="qr-explanation">This working QR opens the local prototype route. Your demo profile data is saved in this browser.</p><div className="success-share-card__footer"><Button variant="outline" icon="download" disabled={!qr} onClick={download}>Download QR · SVG</Button><Button variant="quiet" icon="share" onClick={share}>Share link</Button></div><a className="email-share" href={`mailto:?subject=${encodeURIComponent('My UMBO demo profile')}&body=${encodeURIComponent(`Here is my sample UMBO profile: ${url}`)}`}><Icon name="mail" size={15} />Share by email</a></div></div></div></section>;
}
