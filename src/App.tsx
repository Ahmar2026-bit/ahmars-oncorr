import './App.css'

function App() {
  return (
    <div className="oncorr-app">
      <header className="oncorr-header">
        <h1>🧬 OncoCorr</h1>
        <p className="oncorr-tagline">
          AI-Augmented Multi-Omics Research &amp; Gene Correlation Dashboard
        </p>
      </header>

      <main className="oncorr-main">
        <section className="oncorr-card">
          <h2>Gene Correlation Analysis</h2>
          <p>
            Explore co-expression networks and cross-omics correlations powered
            by AI-driven statistical models.
          </p>
        </section>

        <section className="oncorr-card">
          <h2>Multi-Omics Integration</h2>
          <p>
            Integrate genomics, transcriptomics, proteomics, and epigenomics
            data to uncover disease-driving pathways.
          </p>
        </section>

        <section className="oncorr-card">
          <h2>AI Insights</h2>
          <p>
            Machine-learning models surface hidden biomarker signatures and
            predict clinical outcomes from complex datasets.
          </p>
        </section>
      </main>

      <footer className="oncorr-footer">
        <p>OncoCorr · MOHD AHMAR RAUF PhD</p>
      </footer>
    </div>
  )
}

export default App
