import { templates, kinds, socialPlatforms } from './data.js';

export const STORAGE_KEY = 'umbo.prototype.v2';
export const MAX_PROFILE_FILES = 2;
export const MAX_PROFILE_FILE_BYTES = 2 * 1024 * 1024;
export const profileFileTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const templateById = (id) => templates.find((t) => t.id === id) || templates[0];
export const slugify = (name) => name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'my-profile';
export const sampleUrl = (record) => `https://umbo.me/${record.slug || slugify(record.draft.name)}`;
export const normalizeImagePosition = (value, fallback = { x: 50, y: 50 }) => {
  const coordinate = (candidate, defaultValue) => Number.isFinite(candidate) ? Math.min(100, Math.max(0, candidate)) : defaultValue;
  return { x: coordinate(value?.x, fallback.x), y: coordinate(value?.y, fallback.y) };
};
export const imagePositionValue = (value) => {
  const position = normalizeImagePosition(value);
  return `${position.x}% ${position.y}%`;
};
export const vCardEscape = (value) => String(value ?? '').replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
export const buildVCard = (profile) => {
  const name = profile?.name?.trim() || 'UMBO contact';
  const parts = name.split(/\s+/);
  const family = parts.length > 1 ? parts.pop() : '';
  const given = parts.join(' ');
  const lines = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${vCardEscape(name)}`, `N:${vCardEscape(family)};${vCardEscape(given)};;;`];
  if (profile?.email?.trim()) lines.push(`EMAIL;TYPE=INTERNET:${vCardEscape(profile.email.trim())}`);
  if (profile?.phone?.trim()) lines.push(`TEL;TYPE=CELL,VOICE:${vCardEscape(profile.phone.trim())}`);
  lines.push('END:VCARD');
  return `${lines.join('\r\n')}\r\n`;
};
export const safeUrl = (value) => {
  if (!value?.trim()) return null;
  const text = value.trim();
  if (/^[a-z][a-z\d+.-]*:/i.test(text) && !/^https?:\/\//i.test(text)) return null;
  try { const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`); return ['http:', 'https:'].includes(url.protocol) && url.hostname.includes('.') ? url.href : null; } catch { return null; }
};

const templateSections = (kind, template) => template.sections.map((title, i) => ({ id: `${kind}-${i}`, title, body: i === 0 ? ({ personal: 'A little more about the work I do and the things I care about.', business: 'Explore our services and the people behind our work.', organization: 'Discover our purpose, programmes and community.' })[kind] : '', url: '' }));

const validProfileFile = (file) => {
  const hasInlineData = typeof file?.dataUrl === 'string' && file.dataUrl.startsWith(`data:${file.type};base64,`);
  const hasStoredData = typeof file?.storageKey === 'string' && /^profile:[a-z]+:(?:draft|published):file:[a-zA-Z0-9_-]+$/.test(file.storageKey);
  if (!isRecord(file) || !profileFileTypes.includes(file.type) || (!hasInlineData && !hasStoredData) || (hasInlineData && file.dataUrl.length > MAX_PROFILE_FILE_BYTES * 2)) return null;
  const fileName = typeof file.fileName === 'string' && file.fileName.trim() ? file.fileName.trim().slice(0, 160) : 'profile-file';
  const label = typeof file.label === 'string' && file.label.trim() ? file.label.trim().slice(0, 80) : fileName;
  const id = typeof file.id === 'string' && /^[a-zA-Z0-9_-]+$/.test(file.id) ? file.id : `file-${slugify(label)}`;
  return { id, label, fileName, type: file.type, dataUrl: hasInlineData ? file.dataUrl : '', ...(hasStoredData ? { storageKey: file.storageKey } : {}) };
};

function makeProfile(kind) {
  const templateId = { personal: 'studio', business: 'service', organization: 'community' }[kind];
  const template = templateById(templateId);
  const info = {
    personal: ['Amina Otieno', 'Designer making useful things feel simple.', 'I turn thoughtful ideas into useful digital experiences. Based in Nairobi, open to meaningful collaborations.'],
    business: ['Kijani Studio', 'Design. Print. Make an impression.', 'We help growing teams bring their brands to life. Discover our services, find your nearest branch and meet the people behind the work.'],
    organization: ['Pamoja Foundation', 'Better futures, built together.', 'Community-led programmes helping young people build safer, more connected futures. Meet our people and explore our work.'],
  }[kind];
  return {
    templateId, slug: null, published: null,
    draft: { name: info[0], headline: info[1], bio: info[2], location: 'Nairobi, Kenya', email: `hello@${kind}.example`, phone: '', website: '', socials: [], instagram: '', linkedin: '', files: [], avatar: `/images/${template.image}`, avatarPosition: { x: 50, y: 50 }, cover: `/images/${template.image}`, coverPosition: { x: 50, y: 50 }, accent: template.accent, sections: templateSections(kind, template), visibility: { basics: true, contact: false, links: true, sections: true, files: true } },
  };
}

function makeApplication(kind) {
  return { kind, status: 'not-started', templateId: kind === 'business' ? 'service' : 'community', name: '', email: '', registration: '', location: '', notes: '', evidence: '', authorized: false, reviewerNote: '', submittedAt: null };
}

export function initialState() {
  return { version: 2, account: null, onboarding: { name: '', email: '' }, authenticated: false, role: 'member', pendingProfilePreset: null, selectedTemplateId: 'studio', activeKind: 'personal', profiles: Object.fromEntries(kinds.map((kind) => [kind, makeProfile(kind)])), applications: { business: makeApplication('business'), organization: makeApplication('organization') }, merch: { productId: 'card', finish: 'Midnight', quantity: '25', label: '', destination: 'sample', artwork: '' }, quotes: [], records: [] };
}

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const validDate = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : null;
function restoreTextFields(value, defaults) {
  const restored = { ...defaults };
  for (const [key, fallback] of Object.entries(defaults)) {
    if (typeof fallback === 'string' && typeof value?.[key] === 'string') restored[key] = value[key];
  }
  return restored;
}

const socialPlatformIds = new Set(socialPlatforms.map((platform) => platform.id));
function restoreSocials(value, defaults) {
  const restored = [];
  const add = (platform, socialValue) => {
    if (!socialPlatformIds.has(platform) || typeof socialValue !== 'string' || !socialValue.trim() || restored.some((social) => social.platform === platform)) return;
    restored.push({ platform, value: socialValue });
  };
  if (Array.isArray(value?.socials)) value.socials.forEach((social) => add(social?.platform, social?.value));
  add('instagram', value?.instagram);
  add('linkedin', value?.linkedin);
  return restored.length ? restored : structuredClone(defaults.socials || []);
}

function restoreDraft(value, defaults) {
  if (!isRecord(value)) return structuredClone(defaults);
  const restored = restoreTextFields(value, defaults);
  restored.sections = Array.isArray(value.sections) ? value.sections.filter(isRecord).map((section, i) => restoreTextFields(section, { id: `restored-${i}`, title: '', body: '', url: '' })) : structuredClone(defaults.sections);
  restored.files = Array.isArray(value.files) ? value.files.map(validProfileFile).filter(Boolean).slice(0, MAX_PROFILE_FILES) : structuredClone(defaults.files || []);
  for (const field of ['avatar', 'cover']) {
    const ref = typeof value[`${field}Ref`] === 'string' && /^profile:[a-z]+:(?:draft|published):(?:avatar|cover):$/.test(value[`${field}Ref`]) ? value[`${field}Ref`] : '';
    restored[`${field}Ref`] = ref;
    if (!restored[field]) restored[field] = defaults[field];
  }
  restored.avatarPosition = normalizeImagePosition(value.avatarPosition, defaults.avatarPosition);
  restored.coverPosition = normalizeImagePosition(value.coverPosition, defaults.coverPosition);
  restored.socials = restoreSocials(value, defaults);
  restored.instagram = restored.socials.find((social) => social.platform === 'instagram')?.value || '';
  restored.linkedin = restored.socials.find((social) => social.platform === 'linkedin')?.value || '';
  restored.visibility = Object.fromEntries(Object.entries(defaults.visibility).map(([key, fallback]) => { const stored = isRecord(value.visibility) ? value.visibility[key] : undefined; return [key, typeof stored === 'boolean' ? stored : fallback]; }));
  if (!['mint', 'blue', 'teal', 'purple'].includes(restored.accent)) restored.accent = defaults.accent;
  return restored;
}

// Repair individual legacy/corrupt fields, preserving valid drafts and snapshots.
// A refresh never restores reviewer authority or trusts an incomplete account.
export function restoreState(serialized) {
  const defaults = initialState();
  try {
    const saved = JSON.parse(serialized);
    if (!isRecord(saved) || saved.version !== 2) return defaults;
    const profiles = Object.fromEntries(kinds.map((kind) => {
      const base = defaults.profiles[kind];
      const stored = saved.profiles?.[kind];
      const template = templates.find((t) => t.id === stored?.templateId && t.kind === kind) || templateById(base.templateId);
      const draft = restoreDraft(stored?.draft, { ...base.draft, accent: template.accent, sections: templateSections(kind, template) });
      const snapshot = stored?.published;
       const snapshotDefaults = { ...base.draft, ...Object.fromEntries(Object.entries(base.draft).filter(([, value]) => typeof value === 'string').map(([key]) => [key, ''])), avatar: base.draft.avatar, cover: base.draft.cover, accent: template.accent, sections: [], visibility: { basics: false, contact: false, links: false, sections: false, files: false } };
      const published = isRecord(snapshot) && ['name', 'headline', 'bio'].every((key) => typeof snapshot[key] === 'string') && isRecord(snapshot.visibility) ? restoreDraft(snapshot, snapshotDefaults) : null;
      const slug = typeof stored?.slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(stored.slug) ? stored.slug : published ? slugify(published.name) : null;
      return [kind, { templateId: template.id, draft, published, slug }];
    }));
    const applications = Object.fromEntries(['business', 'organization'].map((kind) => {
      const stored = saved.applications?.[kind];
      const application = restoreTextFields(stored, defaults.applications[kind]);
      if (!['not-started', 'draft', 'pending', 'approved', 'needs-info', 'rejected'].includes(application.status)) application.status = 'draft';
      application.templateId = templates.find((t) => t.id === application.templateId && t.kind === kind)?.id || profiles[kind].templateId;
      return [kind, { ...application, kind, authorized: stored?.authorized === true, submittedAt: validDate(stored?.submittedAt) }];
    }));
    const account = isRecord(saved.account) && ['name', 'email'].every((key) => typeof saved.account[key] === 'string' && saved.account[key].trim()) ? { name: saved.account.name, email: saved.account.email } : null;
    const activeKind = kinds.includes(saved.activeKind) ? saved.activeKind : defaults.activeKind;
    const quotes = Array.isArray(saved.quotes) ? saved.quotes.filter((quote) => isRecord(quote) && ['id', 'productName', 'finish'].every((key) => typeof quote[key] === 'string') && Number.isFinite(quote.total) && Number.isFinite(quote.quantity)) : [];
    const records = Array.isArray(saved.records) ? saved.records.filter((record) => isRecord(record) && typeof record.action === 'string').map((record) => ({ action: record.action, kind: kinds.includes(record.kind) ? record.kind : 'demo', note: typeof record.note === 'string' ? record.note : '', at: validDate(record.at) })) : [];
     return { ...defaults, account, authenticated: saved.authenticated === true && account !== null, role: 'member', pendingProfilePreset: ['emergency-self', 'emergency-child'].includes(saved.pendingProfilePreset) ? saved.pendingProfilePreset : null, activeKind, selectedTemplateId: templates.find((t) => t.id === saved.selectedTemplateId)?.id || profiles[activeKind].templateId, profiles, applications, onboarding: restoreTextFields(saved.onboarding, defaults.onboarding), merch: restoreTextFields(saved.merch, defaults.merch), quotes, records };
  } catch { return defaults; }
}

export function profileErrors(state, kind = state.activeKind) {
  const draft = state.profiles[kind].draft;
  const errors = [];
  if (!state.authenticated) errors.push('Enter a demo account to continue.');
  if (!draft.name.trim()) errors.push('Add a profile name.');
  if (!draft.headline.trim()) errors.push('Add a short headline.');
  if (!draft.bio.trim()) errors.push('Add a short biography or description.');
  if (!draft.visibility.basics) errors.push('Make profile basics public before publishing.');
  if (kind !== 'personal' && state.applications[kind].status !== 'approved') errors.push('This profile needs approval from a demo reviewer before publishing.');
  return errors;
}

export function applicationErrors(application) {
  const errors = [];
  if (!application.name.trim()) errors.push('Add the business or organization name.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(application.email)) errors.push('Add a valid contact email.');
  if (!application.registration.trim()) errors.push('Add a registration or authorization reference.');
  if (!application.evidence) errors.push('Choose an evidence file or use the sample document.');
  if (!application.authorized) errors.push('Confirm that you are authorized to apply.');
  return errors;
}

function applyProfilePreset(state, preset) {
  if (!['emergency-self', 'emergency-child'].includes(preset)) return state;
  const current = state.profiles.personal;
  const self = preset === 'emergency-self';
  const draft = {
    ...current.draft,
    name: self ? state.account?.name || 'My emergency profile' : 'Your child’s profile',
    headline: self ? 'The details that matter in a moment.' : 'A calm, clear way to help them get home.',
    bio: self ? 'A private-by-default profile designed to share only the information someone needs when I cannot explain it myself.' : 'Keep the details a trusted finder or carer needs in one place.',
    email: self ? state.account?.email || current.draft.email : '',
    phone: '',
    sections: self ? [
      { id: 'emergency-help', title: 'If I need help', body: 'Add allergies, conditions, medication or support needs.', url: '' },
      { id: 'emergency-contacts', title: 'Emergency contacts', body: 'Add the people to call and the best way to reach them.', url: '' },
    ] : [
      { id: 'child-about', title: 'About your child', body: 'Add routines, support needs and the details a trusted carer should know.', url: '' },
      { id: 'child-contacts', title: 'Trusted adults', body: 'Add guardian-approved contacts and pickup details.', url: '' },
    ],
    visibility: { ...current.draft.visibility, basics: true, contact: false, links: false, sections: true, files: false },
  };
  return { ...state, pendingProfilePreset: null, activeKind: 'personal', profiles: { ...state.profiles, personal: { ...current, templateId: 'family', draft } } };
}

export function reducer(state, action) {
  switch (action.type) {
    case 'UPDATE_ONBOARDING': return { ...state, onboarding: { ...state.onboarding, ...action.patch } };
    case 'SELECT_TEMPLATE': {
      const t = templateById(action.id);
      const profile = state.profiles[t.kind];
      const pristineSections = JSON.stringify(profile.draft.sections) === JSON.stringify(templateSections(t.kind, templateById(profile.templateId)));
      return { ...state, selectedTemplateId: t.id, activeKind: t.kind, profiles: { ...state.profiles, [t.kind]: { ...profile, templateId: t.id, draft: { ...profile.draft, accent: t.accent, sections: pristineSections ? templateSections(t.kind, t) : profile.draft.sections } } }, applications: t.kind === 'personal' ? state.applications : { ...state.applications, [t.kind]: { ...state.applications[t.kind], templateId: t.id } } };
    }
    case 'SET_KIND': return kinds.includes(action.kind) ? { ...state, activeKind: action.kind } : state;
    case 'AUTHENTICATE': {
      const next = { ...state, authenticated: true, role: 'member', account: { name: action.name.trim(), email: action.email.trim() }, profiles: { ...state.profiles, personal: { ...state.profiles.personal, draft: { ...state.profiles.personal.draft, name: state.account ? state.profiles.personal.draft.name : action.name.trim(), email: state.account ? state.profiles.personal.draft.email : action.email.trim() } } } };
      return next.pendingProfilePreset ? applyProfilePreset(next, next.pendingProfilePreset) : next;
    }
    case 'SIGN_OUT': return { ...state, authenticated: false, role: 'member' };
    case 'ENTER_REVIEWER': return { ...state, role: 'reviewer' };
    case 'LEAVE_REVIEWER': return { ...state, role: 'member' };
    case 'UPDATE_MERCH': return { ...state, merch: { ...state.merch, ...action.patch } };
    case 'SET_PROFILE_PRESET': return action.preset ? (state.authenticated ? applyProfilePreset(state, action.preset) : { ...state, pendingProfilePreset: action.preset }) : state;
    case 'UPDATE_PROFILE': {
      const kind = action.kind || state.activeKind;
      return { ...state, profiles: { ...state.profiles, [kind]: { ...state.profiles[kind], draft: { ...state.profiles[kind].draft, ...action.patch } } } };
    }
    case 'HYDRATE_ASSETS': {
      const profiles = structuredClone(state.profiles);
      for (const asset of action.assets || []) {
        const profile = profiles[asset.kind]?.[asset.scope];
        if (!profile) continue;
        if (asset.field === 'file') {
          const file = profile.files?.find((entry) => entry.id === asset.id && entry.storageKey === asset.key);
          if (file && !file.dataUrl) file.dataUrl = asset.dataUrl;
        } else if (profile[`${asset.field}Ref`] === asset.key && !String(profile[asset.field] || '').startsWith('data:')) {
          profile[asset.field] = asset.dataUrl;
        }
      }
      return { ...state, profiles };
    }
    case 'PUBLISH': {
      const kind = action.kind || state.activeKind;
      if (profileErrors(state, kind).length) return state;
      const record = state.profiles[kind];
      return { ...state, profiles: { ...state.profiles, [kind]: { ...record, slug: record.slug || slugify(record.draft.name), published: structuredClone(record.draft) } } };
    }
    case 'UPDATE_APPLICATION': {
      const app = state.applications[action.kind];
      return { ...state, applications: { ...state.applications, [action.kind]: { ...app, ...action.patch, status: app.status === 'not-started' ? 'draft' : app.status } } };
    }
    case 'SUBMIT_APPLICATION': {
      const kind = action.kind;
      const app = state.applications[kind];
      if (!state.authenticated || applicationErrors(app).length || ['pending', 'approved'].includes(app.status)) return state;
      return { ...state, applications: { ...state.applications, [kind]: { ...app, status: 'pending', submittedAt: action.at, reviewerNote: '' } }, profiles: { ...state.profiles, [kind]: { ...state.profiles[kind], draft: { ...state.profiles[kind].draft, name: app.name, email: app.email, location: app.location } } }, records: [{ kind, action: 'Application submitted', at: action.at }, ...state.records] };
    }
    case 'DECIDE_APPLICATION': {
      const app = state.applications[action.kind];
      if (state.role !== 'reviewer' || app.status !== 'pending' || !['approved', 'needs-info', 'rejected'].includes(action.status) || (action.status !== 'approved' && !action.note?.trim())) return state;
      return { ...state, applications: { ...state.applications, [action.kind]: { ...app, status: action.status, reviewerNote: action.note?.trim() || 'Ownership and authorization checked in the demo.' } }, records: [{ kind: action.kind, action: `Reviewer: ${action.status}`, note: action.note, at: action.at }, ...state.records] };
    }
    case 'SEED_REVIEW_QUEUE': {
      if (state.role !== 'reviewer') return state;
      const applications = { ...state.applications };
      for (const kind of ['business', 'organization']) {
        if (!['not-started', 'draft'].includes(applications[kind].status)) continue;
        applications[kind] = { ...applications[kind], name: kind === 'business' ? 'Kijani Studio' : 'Pamoja Foundation', email: 'owner@example.com', registration: 'DEMO-2026-001', location: 'Nairobi, Kenya', evidence: 'Sample authorization.pdf', authorized: true, status: 'pending', submittedAt: action.at };
      }
      return { ...state, applications, records: [{ action: 'Sample review queue loaded', kind: 'demo', at: action.at }, ...state.records] };
    }
    case 'SAVE_QUOTE': return { ...state, quotes: [action.quote, ...state.quotes] };
    case 'RESET': return initialState();
    default: return state;
  }
}
