import { useEffect, useState } from 'react';
import { coverSearch, coverLink, coverUnlink, coverStatus } from '../api/localAdapter';
import './LinkCoverModal.css';

// Vincula la portada de un manga con AniList: busca (prellenado con el título
// local), el usuario elige un candidato y se descarga/cachea la portada.
// Se guarda SOLO el vínculo (AniListId + archivo); el nombre local no cambia.
export default function LinkCoverModal({ manga, onClose, onLinked }) {
  const [query, setQuery] = useState(manga?.name ?? '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState(null);

  useEffect(() => {
    let active = true;
    coverStatus(manga.id)
      .then((s) => {
        if (active) setStatus(s);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [manga.id]);

  const runSearch = async () => {
    setLoading(true);
    setError('');
    try {
      const found = await coverSearch(query);
      setResults(found);
      if (found.length === 0) setError('Sin resultados para ese título.');
    } catch {
      setError('No se pudo buscar en AniList (revisá la conexión).');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const link = async (candidate) => {
    setBusyId(candidate.id);
    setError('');
    try {
      const res = await coverLink(manga.id, candidate);
      onLinked?.(manga.id, res.coverUrl);
      onClose();
    } catch {
      setError('No se pudo descargar la portada.');
    } finally {
      setBusyId(null);
    }
  };

  const unlink = async () => {
    try {
      await coverUnlink(manga.id);
      onLinked?.(manga.id, null);
      onClose();
    } catch {
      setError('No se pudo quitar el vínculo.');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content link-cover-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Portada — {manga.name}</h2>
          <button className="close-button" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>
        <p className="link-cover-hint">
          Buscá en AniList y elegí la edición. Se guarda solo el vínculo; el nombre local no cambia.
        </p>

        <div className="link-cover-search">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Título en AniList…"
            onKeyDown={(e) => e.key === 'Enter' && runSearch()}
          />
          <button className="submit-button" onClick={runSearch} disabled={loading}>
            {loading ? 'Buscando…' : 'Buscar'}
          </button>
        </div>

        {error && <div className="link-cover-error">{error}</div>}

        <div className="link-cover-results">
          {results.map((candidate) => (
            <button
              key={candidate.id}
              className="cover-candidate"
              onClick={() => link(candidate)}
              disabled={busyId != null}
              title={`Vincular con ${candidate.title}`}
            >
              {candidate.coverUrl ? (
                <img src={candidate.coverUrl} alt="" loading="lazy" />
              ) : (
                <span className="cover-candidate-placeholder">Sin portada</span>
              )}
              {candidate.isAdult && <span className="cover-candidate-adult">+18</span>}
              <span className="cover-candidate-title">{candidate.title}</span>
              <span className="cover-candidate-meta">
                {[candidate.format, candidate.year, candidate.volumes ? `${candidate.volumes} vol.` : null]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
              {busyId === candidate.id && <span className="cover-candidate-busy">Descargando…</span>}
            </button>
          ))}
        </div>

        <div className="modal-actions">
          {status && (
            <button className="cancel-button link-cover-unlink" onClick={unlink}>
              Quitar vínculo
            </button>
          )}
          <button className="cancel-button" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
