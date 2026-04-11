import './RecommendationModal.css';

const RecommendationModal = ({
    isOpen,
    isLoading = false,
    error = null,
    recommendations = null,
    onClose,
}) => {
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
                aria-labelledby="pages-recommendation-title"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="recommendation-header">
                    <div>
                        <h2 id="pages-recommendation-title">Recommendations</h2>
                        <p className="recommendation-subtitle">Country: {inferredCountry}</p>
                        <p className="recommendation-provider">Provider: {provider}</p>
                        {showImportNote && (
                            <p className="recommendation-meta">
                                Showing {items.length} local picks. {blockedByImportCount} import {blockedByImportCount === 1 ? 'candidate was' : 'candidates were'} excluded.
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        className="recommendation-close"
                        aria-label="Close Recommendations"
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>

                {isLoading && (
                    <div className="recommendation-state">
                        <p>Building your recommendations...</p>
                    </div>
                )}

                {!isLoading && error && (
                    <div className="recommendation-state error">
                        <p>{error}</p>
                    </div>
                )}

                {!isLoading && !error && items.length === 0 && (
                    <div className="recommendation-state">
                        <p>No eligible recommendations were found for your local market.</p>
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
                                    {item.reason && <p className="recommendation-reason">{item.reason}</p>}
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