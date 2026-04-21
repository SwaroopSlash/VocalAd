import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import AdVocalizeLab from './AdVocalizeLab';
import reportWebVitals from './reportWebVitals';

class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32, textAlign: 'center', color: 'white', fontFamily: 'sans-serif' }}>
          <div style={{ fontSize: 40 }}>⚠️</div>
          <h2 style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>Studio crashed</h2>
          <p style={{ color: '#94a3b8', fontSize: 12, maxWidth: 300, margin: 0 }}>{this.state.error?.message || 'Unknown error'}</p>
          <button onClick={() => window.location.reload()} style={{ marginTop: 8, padding: '12px 28px', background: '#4f46e5', color: 'white', borderRadius: 12, fontWeight: 900, border: 'none', cursor: 'pointer', fontSize: 13 }}>Reload Studio</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const isLabMode = window.location.search.includes('lab=true');
const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      {isLabMode ? <AdVocalizeLab /> : <App />}
    </ErrorBoundary>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
