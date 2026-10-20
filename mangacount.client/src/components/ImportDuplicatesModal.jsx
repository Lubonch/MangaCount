import { useState } from 'react';
import { useT } from '../contexts/I18nContext';

const totalLabel = (value) => (value > 0 ? value : '??');

const ImportDuplicatesModal = ({
  isOpen,
  duplicates = [],
  isCommitting = false,
  error = '',
  onConfirm,
  onCancel,
}) => {
  const t = useT();
  const [answers, setAnswers] = useState({});

  if (!isOpen || duplicates.length === 0) return null;

  const answered = duplicates.filter((duplicate) => answers[duplicate.rowIndex] !== undefined).length;
  const allAnswered = answered === duplicates.length;

  const setAnswer = (rowIndex, same) => {
    setAnswers((previous) => ({ ...previous, [rowIndex]: same }));
  };

  const confirm = () => {
    if (!allAnswered || isCommitting) return;
    onConfirm(
      duplicates.map((duplicate) => ({
        rowIndex: duplicate.rowIndex,
        same: answers[duplicate.rowIndex],
      }))
    );
  };

  return (
    <div
      className="modal-overlay import-review-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-review-title"
    >
      <div className="modal-content import-review-content">
        <div className="modal-header">
          <h2 id="import-review-title">{t('settings.importReviewTitle')}</h2>
          <button
            type="button"
            className="close-button"
            aria-label={t('settings.close')}
            onClick={onCancel}
            disabled={isCommitting}
          >
            &times;
          </button>
        </div>

        <div className="import-review-body">
          <p className="import-review-intro">
            {t('settings.importReviewIntro', { count: duplicates.length })}
          </p>
          <p className="import-review-progress">
            {t('settings.importReviewProgress', { answered, total: duplicates.length })}
          </p>

          <ul className="import-review-list">
            {duplicates.map((duplicate) => {
              const { incoming, candidate, source } = duplicate;
              const answer = answers[duplicate.rowIndex];
              return (
                <li key={duplicate.rowIndex} className="import-review-card">
                  <div className="import-review-pair">
                    <div className="import-review-side">
                      <span className="import-review-label">
                        {t('settings.importReviewIncoming')}
                      </span>
                      <strong>{incoming.title}</strong>
                      <span className="import-review-meta">
                        {t('settings.importReviewMeta', {
                          quantity: incoming.quantity,
                          total: totalLabel(incoming.totalVolumes),
                          format: incoming.formatName,
                          publisher: incoming.publisherName,
                        })}
                      </span>
                      {incoming.pending && (
                        <span className="import-review-meta">
                          {t('settings.importReviewPending', { pending: incoming.pending })}
                        </span>
                      )}
                    </div>

                    <div className="import-review-arrow" aria-hidden="true">
                      ↔
                    </div>

                    <div className="import-review-side">
                      <span className="import-review-label">
                        {source === 'existing'
                          ? t('settings.importReviewExisting')
                          : t('settings.importReviewBatch')}
                      </span>
                      <strong>{candidate.title}</strong>
                      <span className="import-review-meta">
                        {t('settings.importReviewMeta', {
                          quantity: candidate.entry?.quantity ?? candidate.quantity ?? 0,
                          total: totalLabel(candidate.volumes),
                          format: candidate.formatName,
                          publisher: candidate.publisherName,
                        })}
                      </span>
                      {candidate.entry && (
                        <span className="import-review-meta">
                          {t('settings.importReviewEntry', { quantity: candidate.entry.quantity })}
                          {candidate.entry.pending
                            ? t('settings.importReviewPending', { pending: candidate.entry.pending })
                            : ''}
                        </span>
                      )}
                      {source === 'batch' && (
                        <span className="import-review-meta">
                          {t('settings.importReviewBatchLine', { line: candidate.lineNumber })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="import-review-actions">
                    <button
                      type="button"
                      className={`settings-btn${answer === true ? ' settings-btn--primary' : ''}`}
                      aria-pressed={answer === true}
                      onClick={() => setAnswer(duplicate.rowIndex, true)}
                    >
                      {t('settings.importSame')}
                    </button>
                    <button
                      type="button"
                      className={`settings-btn${answer === false ? ' settings-btn--primary' : ''}`}
                      aria-pressed={answer === false}
                      onClick={() => setAnswer(duplicate.rowIndex, false)}
                    >
                      {t('settings.importDifferent')}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          {error && <p className="settings-message error">{error}</p>}
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="cancel-button"
            onClick={onCancel}
            disabled={isCommitting}
          >
            {t('settings.importCancel')}
          </button>
          <button
            type="button"
            className="submit-button"
            onClick={confirm}
            disabled={!allAnswered || isCommitting}
          >
            {t(isCommitting ? 'settings.importCommitting' : 'settings.importConfirm')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportDuplicatesModal;
