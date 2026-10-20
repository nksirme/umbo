import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { serializeStateForStorage } from '../src/assetStore.js';
import { examples } from '../src/data.js';
import { buildVCard, initialState, reducer, restoreState, profileErrors, sampleUrl, safeUrl } from '../src/model.js';

const auth = (state) => reducer(state, { type: 'AUTHENTICATE', name: 'Alex Kimani', email: 'alex@example.com' });
function submit(state, kind) {
  state = reducer(state, { type: 'UPDATE_APPLICATION', kind, patch: { name: 'Our workspace', email: 'owner@example.com', registration: 'DEMO-01', evidence: 'Sample document.pdf', authorized: true } });
  return reducer(state, { type: 'SUBMIT_APPLICATION', kind, at: '2026-10-17T10:00:00Z' });
}

test('selected restricted template survives account creation and refresh', () => {
  let state = reducer(initialState(), { type: 'SELECT_TEMPLATE', id: 'hospitality' });
  state = restoreState(JSON.stringify(auth(state)));
  assert.equal(state.activeKind, 'business');
  assert.equal(state.selectedTemplateId, 'hospitality');
  assert.equal(state.profiles.business.templateId, 'hospitality');
  assert.equal(state.applications.business.templateId, 'hospitality');
  assert.equal(state.profiles.business.draft.sections[0].title, 'Menu & reservations');
});

test('switching templates preserves edited section content and profile information', () => {
  let state = auth(initialState());
  state = reducer(state, { type: 'UPDATE_PROFILE', patch: { bio: 'My own biography', sections: [{ id: 'custom', title: 'My project', body: 'A story I wrote.', url: '' }] } });
  state = reducer(state, { type: 'SELECT_TEMPLATE', id: 'professional' });
  assert.equal(state.profiles.personal.draft.bio, 'My own biography');
  assert.equal(state.profiles.personal.draft.sections[0].body, 'A story I wrote.');
});

test('publishing requires essentials, authentication and public basics', () => {
  const state = initialState();
  assert.equal(reducer(state, { type: 'PUBLISH' }).profiles.personal.published, null);
  let signedIn = auth(state);
  signedIn = reducer(signedIn, { type: 'UPDATE_PROFILE', patch: { name: ' ', visibility: { basics: false } } });
  assert.ok(profileErrors(signedIn).length >= 2);
  assert.equal(reducer(signedIn, { type: 'PUBLISH' }).profiles.personal.published, null);
});

test('a published snapshot keeps its URL and content until an explicit update', () => {
  let state = reducer(auth(initialState()), { type: 'PUBLISH' });
  const url = sampleUrl(state.profiles.personal);
  state = reducer(state, { type: 'UPDATE_PROFILE', patch: { name: 'A new name', visibility: { basics: true, contact: true, links: false, sections: true } } });
  assert.equal(state.profiles.personal.published.name, 'Alex Kimani');
  assert.equal(state.profiles.personal.published.visibility.contact, false);
  state = reducer(state, { type: 'PUBLISH' });
  assert.equal(state.profiles.personal.published.visibility.links, false);
  assert.equal(sampleUrl(state.profiles.personal), url);
});

test('business and organization decisions are independent and restricted', () => {
  let state = submit(submit(auth(initialState()), 'business'), 'organization');
  const action = { type: 'DECIDE_APPLICATION', kind: 'business', status: 'approved', at: 'now' };
  assert.equal(reducer(state, action).applications.business.status, 'pending');
  assert.equal(reducer(state, { type: 'PUBLISH', kind: 'business' }).profiles.business.published, null);
  state = reducer(reducer(state, { type: 'ENTER_REVIEWER' }), action);
  assert.equal(state.applications.business.status, 'approved');
  assert.equal(state.applications.organization.status, 'pending');
  assert.equal(state.profiles.business.published, null);
  assert.ok(reducer(state, { type: 'PUBLISH', kind: 'business' }).profiles.business.published);
  assert.equal(restoreState(JSON.stringify(state)).role, 'member');
});

test('submission requires evidence and authorization; requests for info require a note', () => {
  let state = auth(initialState());
  state = reducer(state, { type: 'SUBMIT_APPLICATION', kind: 'business' });
  assert.equal(state.applications.business.status, 'not-started');
  state = reducer(submit(state, 'business'), { type: 'ENTER_REVIEWER' });
  state = reducer(state, { type: 'DECIDE_APPLICATION', kind: 'business', status: 'needs-info', note: '' });
  assert.equal(state.applications.business.status, 'pending');
  state = reducer(state, { type: 'DECIDE_APPLICATION', kind: 'business', status: 'needs-info', note: 'Please add authorization.' });
  assert.equal(state.applications.business.status, 'needs-info');
  assert.equal(reducer(state, { type: 'SUBMIT_APPLICATION', kind: 'business' }).applications.business.status, 'pending');
});

test('invalid saved data recovers; link fields refuse executable URL schemes', () => {
  assert.equal(restoreState('{broken').activeKind, 'personal');
  assert.equal(restoreState('{}').version, 2);
  assert.equal(safeUrl('javascript:alert(1)'), null);
  assert.equal(safeUrl('data:text/html,hello'), null);
  assert.equal(safeUrl('https://example.com/work'), 'https://example.com/work');
  assert.equal(safeUrl('example.com'), 'https://example.com/');
});

test('vCards contain only the available contact details and escape fields', () => {
  const vcard = buildVCard({ name: 'Amina, Otieno', email: 'amina@example.com', phone: '+254 700;123' });
  assert.match(vcard, /^BEGIN:VCARD\r\nVERSION:3\.0/m);
  assert.match(vcard, /FN:Amina\\, Otieno/);
  assert.match(vcard, /N:Otieno;Amina\\,;;;/);
  assert.match(vcard, /EMAIL;TYPE=INTERNET:amina@example\.com/);
  assert.match(vcard, /TEL;TYPE=CELL,VOICE:\+254 700\\;123/);
  assert.match(vcard, /END:VCARD\r\n$/);
  assert.doesNotMatch(buildVCard({ name: 'No email', phone: '' }), /EMAIL|TEL/);
});

test('image positions default to center and restore within safe bounds', () => {
  const saved = auth(initialState());
  saved.profiles.personal.draft.avatarPosition = { x: 18, y: 82 };
  saved.profiles.personal.draft.coverPosition = { x: 140, y: -20 };
  const recovered = restoreState(JSON.stringify(saved));
  assert.deepEqual(recovered.profiles.personal.draft.avatarPosition, { x: 18, y: 82 });
  assert.deepEqual(recovered.profiles.personal.draft.coverPosition, { x: 100, y: 0 });
  assert.deepEqual(initialState().profiles.personal.draft.avatarPosition, { x: 50, y: 50 });
  assert.deepEqual(initialState().profiles.personal.draft.coverPosition, { x: 50, y: 50 });
});

test('profile files restore only supported files and keep at most two entries', () => {
  const saved = auth(initialState());
  saved.profiles.personal.draft.files = [
    { id: 'brochure', label: 'Download brochure', fileName: 'brochure.pdf', type: 'application/pdf', dataUrl: 'data:application/pdf;base64,JVBERi0xLjQ=' },
    { id: 'portfolio', label: 'View portfolio', fileName: 'portfolio.jpg', type: 'image/jpeg', dataUrl: 'data:image/jpeg;base64,/9j/4AAQ' },
    { id: 'bad-type', label: 'Unsafe', fileName: 'unsafe.svg', type: 'image/svg+xml', dataUrl: 'data:image/svg+xml;base64,PHN2Zz4=' },
  ];
  const recovered = restoreState(JSON.stringify(saved));
  assert.deepEqual(recovered.profiles.personal.draft.files, saved.profiles.personal.draft.files.slice(0, 2));
  assert.equal(recovered.profiles.personal.draft.visibility.files, true);
  const legacy = auth(initialState());
  delete legacy.profiles.personal.draft.files;
  delete legacy.profiles.personal.draft.visibility.files;
  const restoredLegacy = restoreState(JSON.stringify(legacy));
  assert.deepEqual(restoredLegacy.profiles.personal.draft.files, []);
  assert.equal(restoredLegacy.profiles.personal.draft.visibility.files, true);
});

test('large profile assets are removed from localStorage payloads and replaced with references', () => {
  const saved = auth(initialState());
  saved.profiles.personal.draft.avatar = 'data:image/jpeg;base64,avatar-data';
  saved.profiles.personal.draft.files = [{ id: 'brochure', label: 'Brochure', fileName: 'brochure.pdf', type: 'application/pdf', dataUrl: 'data:application/pdf;base64,pdf-data' }];
  const serialized = serializeStateForStorage(saved);
  const draft = serialized.profiles.personal.draft;
  assert.equal(draft.avatar, '');
  assert.equal(draft.avatarRef, 'profile:personal:draft:avatar:');
  assert.equal(draft.files[0].dataUrl, '');
  assert.equal(draft.files[0].storageKey, 'profile:personal:draft:file:brochure');
  assert.doesNotMatch(JSON.stringify(serialized), /data:(?:image|application)\//);
});

test('personal emergency presets generate self and child profiles, and examples use unique images', () => {
  let state = reducer(initialState(), { type: 'SET_PROFILE_PRESET', preset: 'emergency-child' });
  assert.equal(state.pendingProfilePreset, 'emergency-child');
  state = auth(state);
  assert.equal(state.profiles.personal.draft.name, 'Your child’s profile');
  assert.equal(state.profiles.personal.draft.sections[0].title, 'About your child');
  state = reducer(state, { type: 'SET_PROFILE_PRESET', preset: 'emergency-self' });
  assert.equal(state.profiles.personal.draft.name, 'Alex Kimani');
  assert.equal(state.profiles.personal.draft.sections[0].title, 'If I need help');
  assert.equal(examples.length, 13);
  assert.equal(new Set(examples.map((example) => example.image)).size, examples.length);
  assert.ok(examples.every((example) => example.image.endsWith('.jpg')));
  assert.ok(examples.every((example) => existsSync(`public/images/${example.image}`)));
  assert.ok(!examples.some((example) => example.id === 'milo'));
  assert.equal(examples.findIndex((example) => example.id === 'emergency-self'), examples.findIndex((example) => example.id === 'pamoja') + 1);
  assert.ok(!examples.find((example) => example.id === 'emergency-self').featured);
  assert.ok(examples.some((example) => example.id === 'umoja-party' && example.category === 'Organizations'));
  assert.ok(examples.some((example) => example.id === 'emergency-self' && example.generator === 'emergency'));
});

test('partial or legacy saved state repairs invalid fields without losing a valid draft', () => {
  const saved = auth(initialState());
  saved.activeKind = 'legacy-personal';
  saved.selectedTemplateId = 'retired-template';
  saved.profiles.personal.draft.name = 'My saved introduction';
  saved.profiles.personal.draft.headline = null;
  saved.profiles.personal.draft.sections = { legacy: true };
  saved.profiles.personal.draft.socials = [{ platform: 'github', value: 'github.com/saved' }, { platform: 'unknown', value: 'javascript:bad' }];
  saved.profiles.personal.draft.instagram = '@legacy.saved';
  saved.profiles.personal.draft.linkedin = 'linkedin.com/in/legacy-saved';
  saved.profiles.personal.draft.visibility = { basics: true, contact: false };
  saved.onboarding = null;
  saved.merch = { quantity: null };
  saved.quotes = null;
  saved.records = [null, { action: 'Application submitted', kind: 'business', at: 'invalid date', note: { legacy: true } }];
  const recovered = restoreState(JSON.stringify(saved));
  assert.equal(recovered.activeKind, 'personal');
  assert.equal(recovered.selectedTemplateId, 'studio');
  assert.equal(recovered.profiles.personal.draft.name, 'My saved introduction');
  assert.equal(typeof recovered.profiles.personal.draft.headline, 'string');
  assert.ok(Array.isArray(recovered.profiles.personal.draft.sections));
  assert.deepEqual(recovered.profiles.personal.draft.socials, [
    { platform: 'github', value: 'github.com/saved' },
    { platform: 'instagram', value: '@legacy.saved' },
    { platform: 'linkedin', value: 'linkedin.com/in/legacy-saved' },
  ]);
  assert.equal(recovered.profiles.personal.draft.instagram, '@legacy.saved');
  assert.equal(recovered.profiles.personal.draft.linkedin, 'linkedin.com/in/legacy-saved');
  assert.equal(recovered.profiles.personal.draft.visibility.contact, false);
  assert.equal(typeof recovered.profiles.personal.draft.visibility.links, 'boolean');
  assert.equal(recovered.onboarding.email, '');
  assert.equal(recovered.merch.quantity, '25');
  assert.deepEqual(recovered.quotes, []);
  assert.equal(recovered.records.length, 1);
  assert.equal(recovered.records[0].at, null);
  assert.equal(recovered.records[0].note, '');
  assert.doesNotThrow(() => profileErrors(recovered));
});

test('an invalid saved account cannot crash an authenticated dashboard or create publication', () => {
  const saved = auth(initialState());
  saved.account = { name: null, email: 'demo@example.com' };
  saved.profiles.personal.published = { name: null };
  const recovered = restoreState(JSON.stringify(saved));
  assert.equal(recovered.authenticated, false);
  assert.equal(recovered.account, null);
  assert.equal(recovered.profiles.personal.published, null);
});
