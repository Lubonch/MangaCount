import { useEffect, useState } from 'react';
import { coverSearch, coverLink, coverUnlink, coverStatus, coverLocal, pickFile } from '../api/localAdapter';
import './LinkCoverModal.css';

const IMAGE_FILTERS = [{ name: 'Imágenes', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }];

// Vincula la portada de un manga con AniList: busca (prellenado con el título
// local), el usuario elige un candidato y se descarga/cachea la portada.
// También permite elegir una imagen local del equipo (para mangas que no están
// en AniList). Se guarda SOLO el vínculo; el nombre local no cambia.
export default function LinkCoverModal({ manga, onClose, onLinked }) {
  const [query, setQuery] = useState(manga?.name ?? '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [localBusy, setLocalBusy] = useState(false);
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

  // Elige una imagen del equipo y la vincula como portada local. Cancelar el
  // diálogo no es un error: no se llama a `coverLocal`.
  const pickLocal = async () => {
    setError('');
    setLocalBusy(true);
    try {
      const sourcePath = await pickFile(IMAGE_FILTERS);
      if (!sourcePath) return;
      const res = await coverLocal(manga.id, sourcePath);
      onLinked?.(manga.id, res.coverUrl);
      onClose();
    } catch {
      setError('No se pudo usar esa imagen (formato no soportado o demasiado grande).');
    } finally {
      setLocalBusy(false);
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
          Si el manga no está en AniList, podés elegir una imagen de tu equipo.
        </p>

        {status && (
          <div className="link-cover-current">
            {status.coverUrl && (
              <img className="link-cover-current-thumb" src={status.coverUrl} alt="" />
            )}
            <span className="link-cover-current-origin">
              {status.provider === 'local' ? 'Portada local' : 'Portada de AniList'}
            </span>
          </div>
        )}

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
          <button
            className="link-cover-local-button"
            onClick={pickLocal}
            disabled={localBusy}
          >
            {localBusy ? 'Leyendo…' : 'Buscar en mi PC…'}
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
