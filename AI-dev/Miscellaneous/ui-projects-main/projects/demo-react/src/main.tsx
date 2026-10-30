import React from 'react'
import ReactDOM from 'react-dom/client'

const App = () => {
  return (
    <div style={{
      fontFamily: 'system-ui, sans-serif',
      padding: '2rem',
      textAlign: 'center'
    }}>
      <h1>React Demo</h1>
      <p>This is a React project built with Vite in the monorepo.</p>
      <div style={{ marginTop: '2rem' }}>
        <a href="../" style={{ color: '#2563eb' }}>← Back to Showcase</a>
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
