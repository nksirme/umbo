import React, { useEffect, useReducer, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { hydrateStateAssets, persistStateAssets, serializeStateForStorage } from './assetStore.js';
import { UMBOContext, Header, Footer, Icon } from './ui.jsx';
import { STORAGE_KEY, initialState, restoreState, reducer, templateById } from './model.js';
import { Home, Examples, ExampleDetail, FullProfilePreview, DesignSystem, FlowOverview } from './public.jsx';
import { Account, Builder, Review, PublicProfile, Sharing } from './journey.jsx';
import { Dashboard, Application, Workspace, Reviewer, Admin, SmartMerch } from './workspaces.jsx';
import RenderBoundary from './RenderBoundary.jsx';
import { dataModeLabel, isProductionRelease, releaseLabel } from './buildInfo.js';
import './styles.css';
import './refinements.css';

function readRoute() {
  const [path, search = ''] = (window.location.hash.replace(/^#\/?/, '') || 'home').split('?');
  return { path, search, params: new URLSearchParams(search) };
}

function App() {
  const [state, dispatch] = useReducer(reducer, null, () => {
    try { return restoreState(localStorage.getItem(STORAGE_KEY)); } catch { return initialState(); }
  });
  const [route, setRoute] = useState(readRoute);
  const [notice, setNotice] = useState('');
  const [storageError, setStorageError] = useState(false);
  const [assetStorageError, setAssetStorageError] = useState(false);
  const [showTopButton, setShowTopButton] = useState(false);
  const go = (path) => { window.location.hash = `/${path}`; };
  const notify = (message) => setNotice(message);
  const start = (id, preset) => { dispatch({ type: 'SELECT_TEMPLATE', id }); if (preset) dispatch({ type: 'SET_PROFILE_PRESET', preset }); go('account'); };
  useEffect(() => { const listener = () => setRoute(readRoute()); window.addEventListener('hashchange', listener); return () => window.removeEventListener('hashchange', listener); }, []);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeStateForStorage({ ...state, role: 'member' }))); setStorageError(false); }
    catch { setStorageError(true); }
    persistStateAssets(state).then(() => setAssetStorageError(false)).catch(() => setAssetStorageError(true));
  }, [state]);
  useEffect(() => {
    let active = true;
    hydrateStateAssets(state).then((assets) => { if (active && assets.length) dispatch({ type: 'HYDRATE_ASSETS', assets }); }).catch(() => { /* The local draft remains usable even when asset storage is unavailable. */ });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.title = `${route.path.startsWith('example') ? 'Explore examples' : route.path.startsWith('builder') ? 'Make it yours' : route.path.startsWith('admin') ? 'Admin demo' : 'One digital presence'} · UMBO`;
    requestAnimationFrame(() => { const title = document.querySelector('main h1'); if (title) { title.setAttribute('tabindex', '-1'); title.focus({ preventScroll: true }); } });
  }, [route.path]);
  useEffect(() => { if (!notice) return; const timeout = setTimeout(() => setNotice(''), 4200); return () => clearTimeout(timeout); }, [notice]);
  useEffect(() => {
    const onScroll = () => setShowTopButton(window.scrollY > 420);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const [page, arg, slug] = route.path.split('/');
  const kind = ['personal', 'business', 'organization'].includes(arg) ? arg : state.activeKind;
  const workspace = ['dashboard', 'workspace', 'admin'].includes(page);
  const fullPreview = page === 'profile-preview';
  let content;
  switch (page) {
    case 'home': case '': content = <Home />; break;
    case 'examples': content = <Examples key={route.search} />; break;
    case 'example': content = <ExampleDetail id={arg} />; break;
    case 'profile-preview': content = <FullProfilePreview id={arg} />; break;
    case 'account': case 'sign-in': content = <Account signIn={page === 'sign-in'} />; break;
    case 'builder': content = state.authenticated ? <Builder key={kind} kind={kind} /> : <Account />; break;
    case 'review': content = state.authenticated ? <Review kind={kind} /> : <Account />; break;
    case 'share': content = <Sharing kind={kind} />; break;
    case 'p': content = <PublicProfile kind={kind} slug={slug} />; break;
    case 'dashboard': content = state.authenticated ? <Dashboard /> : <Account signIn />; break;
    case 'application': content = <Application key={kind} kind={kind === 'personal' ? 'business' : kind} />; break;
    case 'workspace': content = <Workspace key={kind} kind={kind === 'personal' ? 'business' : kind} />; break;
    case 'smartmerch': content = <SmartMerch />; break;
    case 'reviewer': content = <Reviewer />; break;
    case 'admin': content = state.role === 'reviewer' ? <Admin /> : <Reviewer />; break;
    case 'design': content = <DesignSystem />; break;
    case 'flow': content = <FlowOverview />; break;
    default: content = <Home />;
  }
  return <UMBOContext.Provider value={{ state, dispatch, go, start, notify, route, template: templateById(state.selectedTemplateId) }}><div className={`app-shell ${fullPreview ? 'app-shell--full-preview' : ''}`}><button className="skip-link" onClick={() => document.getElementById('main').focus()}>Skip to content</button>{!fullPreview && <Header workspace={workspace && state.authenticated} />}<main id="main" tabIndex="-1">{content}</main>{!fullPreview && <Footer />} {!fullPreview && <div className={`prototype-strip ${isProductionRelease ? 'release-strip' : ''}`} data-build-mode={isProductionRelease ? 'production' : 'development'}><Icon name="shield" size={13} /><span>{releaseLabel} · {dataModeLabel} · accounts, publishing, verification and orders remain local simulations.</span></div>}{showTopButton && !fullPreview && <button className="back-to-top" aria-label="Back to top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}><Icon name="up" size={18} /><span>Top</span></button>}{notice && <div className="feedback-toast" role="status"><Icon name="check" />{notice}<button aria-label="Dismiss notification" onClick={() => setNotice('')}><Icon name="close" size={16} /></button></div>}{storageError && <div className="storage-warning" role="alert">Your browser could not save this update. Profile text and file metadata remain local; allow browser storage to keep image and file data.</div>}{assetStorageError && <div className="storage-warning" role="alert">Your browser could not save uploaded image or PDF data. Allow browser storage to keep profile files after refresh.</div>}</div></UMBOContext.Provider>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><RenderBoundary><App /></RenderBoundary></React.StrictMode>);
