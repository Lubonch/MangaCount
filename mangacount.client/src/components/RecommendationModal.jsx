import { useT } from '../contexts/I18nContext';
import './RecommendationModal.css';

const RecommendationModal = ({
    isOpen,
    isLoading = false,
    error = null,
    recommendations = null,
    onClose,
}) => {
    const t = useT();
    if (!isOpen) {
        return null;
    }

    const items = recommendations?.items || [];
    const inferredCountry = recommendations?.inferredCountry || 'Unknown';
    const provider = recommendations?.provider || 'local';
    const limit = recommendations?.limit || 10;
    const blockedByImportCount = recommendations?.blockedByImportCount || 0;
    const showImportNote = !isLoading && !error && blockedByImportCount > 0 && items.length < limit;

    return (
        <div className="recommendation-overlay" role="presentation" onClick={onClose}>
            <div
                className="recommendation-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="recommendation-title"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="recommendation-header">
                    <div>
                        <h2 id="recommendation-title">{t('rec.title')}</h2>
                        <p className="recommendation-subtitle">
                            {t('rec.country', { country: inferredCountry })}
                        </p>
                        <p className="recommendation-provider">{t('rec.provider', { provider })}</p>
                        {showImportNote && (
                            <p className="recommendation-meta">
                                {t('rec.picks', { count: items.length, blocked: blockedByImportCount, word: t(blockedByImportCount === 1 ? 'rec.candidateWas' : 'rec.candidatesWere') })}
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        className="recommendation-close"
                        aria-label={t('rec.closeAria')}
                        onClick={onClose}
                    >
                        {t('rec.close')}
                    </button>
                </div>

                {isLoading && (
                    <div className="recommendation-state">
                        <p>{t('rec.building')}</p>
                    </div>
                )}

                {!isLoading && error && (
                    <div className="recommendation-state error">
                        <p>{error}</p>
                    </div>
                )}

                {!isLoading && !error && items.length === 0 && (
                    <div className="recommendation-state">
                        <p>{t('rec.none')}</p>
                    </div>
                )}

                {!isLoading && items.length > 0 && (
                    <ol className="recommendation-list">
                        {items.map((item, index) => (
                            <li key={item.id} className="recommendation-item">
                                <div className="recommendation-rank">#{index + 1}</div>
                                <div className="recommendation-content">
                                    <h3>{item.title}</h3>
                                    <p className="recommendation-meta">
                                        {item.publisher} · {item.publisherCountry}
                                        {item.format ? ` · ${item.format}` : ''}
                                    </p>
                                    {item.reason && (
                                        <p className="recommendation-reason">{item.reason}</p>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ol>
                )}
            </div>
        </div>
    );
};

export default RecommendationModal;