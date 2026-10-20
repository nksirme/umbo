import { Component } from 'react';

export default class RenderBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <section className="boot-screen" role="alert"><div className="boot-card"><div className="boot-brand"><img src="/brand/umbo-logo-inverse.svg" alt="UMBO" width="131" height="35" /></div><div className="boot-content"><span className="boot-eyebrow">Let’s get you connected again</span><h1>This view couldn’t open.</h1><p>Your saved profile data is still on this device. Reload to try again, or return to the homepage.</p><button className="boot-button" onClick={() => window.location.reload()}>Reload UMBO</button><a className="boot-link" href="#/" onClick={(event) => { event.preventDefault(); window.location.hash = '/'; this.setState({ failed: false }); }}>Return to homepage</a></div></div></section>;
  }
}
