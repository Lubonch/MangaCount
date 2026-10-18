import { useEffect, useState } from 'react';
import { coverSearch, coverLink, coverUnlink, coverStatus, coverLocal, pickFile } from '../api/localAdapter';
import './LinkCoverModal.css';
import { useT } from '../contexts/I18nContext';

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif'];

// Vincula la portada de un manga con AniList: busca (prellenado con el título
// local), el usuario elige un candidato y se descarga/cachea la portada.
// También permite elegir una imagen local del equipo (para mangas que no están
// en AniList). Se guarda SOLO el vínculo; el nombre local no cambia.
export default function LinkCoverModal({ manga, onClose, onLinked, showAdultCovers = false }) {
  const t = useT();
  const [query, setQuery] = useState(manga?.name ?? '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [localBusy, setLocalBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState(null);
  // Candidatos +18 revelados por click (solo con la preferencia apagada).
  const [revealedCandidates, setRevealedCandidates] = useState({});

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
      if (found.length === 0) setError(t('lcm.noResults'));
    } catch {
      setError(t('lcm.searchFailed'));
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
      setError(t('lcm.downloadFailed'));
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
      const sourcePath = await pickFile([{ name: t('lcm.imageFilterName'), extensions: IMAGE_EXTENSIONS }]);
      if (!sourcePath) return;
      const res = await coverLocal(manga.id, sourcePath);
      onLinked?.(manga.id, res.coverUrl);
      onClose();
    } catch {
      setError(t('lcm.imageFailed'));
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
      setError(t('lcm.unlinkFailed'));
    }
  };

  const isRevealed = (candidate) =>
    candidate.isAdult === true && !showAdultCovers && revealedCandidates[candidate.id] === true;

  const candidateClassName = (candidate) => {
    const isAdult = candidate.isAdult === true;
    return [
      'cover-candidate',
      isAdult ? 'cover-candidate--adult' : '',
      isAdult && showAdultCovers ? 'cover-candidate--reveal-hover' : '',
      isRevealed(candidate) ? 'cover-candidate--revealed' : '',
    ].filter(Boolean).join(' ');
  };

  // Con el pref OFF el primer click revela y el segundo ejecuta la vinculación
  // real; con el pref ON el hover ya revela y el click vincula directo.
  const handleCandidateClick = (candidate) => {
    if (candidate.isAdult === true && !showAdultCovers && !revealedCandidates[candidate.id]) {
      setRevealedCandidates((prev) => ({ ...prev, [candidate.id]: true }));
      return;
    }
    link(candidate);
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
          {t('lcm.intro1')}
          {t('lcm.intro2')}
        </p>

        {status && (
          <div className="link-cover-current">
            {status.coverUrl && (
              <img className="link-cover-current-thumb" src={status.coverUrl} alt="" />
            )}
            <span className="link-cover-current-origin">
              {t(status.provider === 'local' ? 'lcm.coverLocal' : 'lcm.coverAniList')}
            </span>
          </div>
        )}

        <div className="link-cover-search">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('lcm.searchPlaceholder')}
            onKeyDown={(e) => e.key === 'Enter' && runSearch()}
          />
          <button className="submit-button" onClick={runSearch} disabled={loading}>
            {t(loading ? 'lcm.searching' : 'lcm.search')}
          </button>
          <button
            className="link-cover-local-button"
            onClick={pickLocal}
            disabled={localBusy}
          >
            {t(localBusy ? 'lcm.reading' : 'lcm.pickLocal')}
          </button>
        </div>

        {error && <div className="link-cover-error">{error}</div>}

        <div className="link-cover-results">
          {results.map((candidate) => (
            <button
              key={candidate.id}
              className={candidateClassName(candidate)}
              onClick={() => handleCandidateClick(candidate)}
              disabled={busyId != null}
              title={t('lcm.linkTitle', { title: candidate.title })}
            >
              {candidate.coverUrl ? (
                <img src={candidate.coverUrl} alt="" loading="lazy" />
              ) : (
                <span className="cover-candidate-placeholder">{t('lcm.noCover')}</span>
              )}
              {candidate.isAdult && <span className="cover-candidate-adult">+18</span>}
              {candidate.source && (
                <span className="cover-candidate-source">
                  {candidate.source === 'mangadex' ? 'MangaDex' : 'AniList'}
                </span>
              )}
              <span className="cover-candidate-title">{candidate.title}</span>
              <span className="cover-candidate-meta">
                {[candidate.format, candidate.year, candidate.volumes ? t('lcm.volShort', { count: candidate.volumes }) : null]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
              {busyId === candidate.id && <span className="cover-candidate-busy">{t('lcm.downloading')}</span>}
            </button>
          ))}
        </div>

        <div className="modal-actions">
          {status && (
            <button className="cancel-button link-cover-unlink" onClick={unlink}>
              {t('lcm.unlink')}
            </button>
          )}
          <button className="cancel-button" onClick={onClose}>
            {t('lcm.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
