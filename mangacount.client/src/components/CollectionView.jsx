import { useState, useEffect, useRef } from 'react';
import LoadingSpinner from './LoadingSpinner';
import AddEntryModal from './AddEntryModal';
import AddMangaModal from './AddMangaModal';
import { coverAll, coverAuto } from '../api/localAdapter';
import { useT } from '../contexts/I18nContext';
import './CollectionView.css';

const CollectionView = ({ entries, loading = false, onRefresh, mangas = [], selectedProfile, showAdultCovers = false }) => {
    const t = useT();
    const [filter, setFilter] = useState('all');
    const [sortBy, setSortBy] = useState('name');
    const [viewMode, setViewMode] = useState('cards');
    
    const [publisherFilter, setPublisherFilter] = useState('all');
    const [formatFilter, setFormatFilter] = useState('all');
    const [availablePublishers, setAvailablePublishers] = useState([]);
    const [availableFormats, setAvailableFormats] = useState([]);
    const [filtersLoading, setFiltersLoading] = useState(false);
    
    const [showEditEntry, setShowEditEntry] = useState(false);
    const [showEditManga, setShowEditManga] = useState(false);
    const [editingEntry, setEditingEntry] = useState(null);
    const [editingManga, setEditingManga] = useState(null);

    // Covers: map { mangaId: { url, isAdult } } (rendered on the cards).
    const [coverMap, setCoverMap] = useState({});
    // +18 covers revealed by click (only when the preference is off).
    const [revealedCovers, setRevealedCovers] = useState({});

    useEffect(() => {
        let active = true;
        coverAll()
            .then((map) => {
                if (active) setCoverMap(map ?? {});
            })
            .catch(() => {});
        return () => {
            active = false;
        };
    }, [entries, selectedProfile]);

    // Accepts `{ url, isAdult }` (or `null` on unlink). Auto-match still
    // returns only the URL: in that case there is no +18 data (assumed false).
    const handleCoverLinked = (mangaId, cover) => {
        const url = typeof cover === 'string' ? cover : cover?.url;
        const isAdult = typeof cover === 'object' && cover !== null && cover.isAdult === true;
        setCoverMap((prev) => {
            const next = { ...prev };
            if (url) next[mangaId] = { url, isAdult };
            else delete next[mangaId];
            return next;
        });
        setRevealedCovers((prev) => {
            if (!prev[mangaId]) return prev;
            const next = { ...prev };
            delete next[mangaId];
            return next;
        });
    };

    // Reveal by click: consume the event so the card action does not fire.
    const handleCoverReveal = (event, mangaId) => {
        event.stopPropagation();
        setRevealedCovers((prev) => ({ ...prev, [mangaId]: !prev[mangaId] }));
    };

    // Best-effort auto-match on add: when a new manga shows up, try to
    // link its cover (only if there is a unique match; fire-and-forget).
    const knownMangasRef = useRef(null);
    useEffect(() => {
        const ids = entries.map((entry) => entry.manga.id);
        if (knownMangasRef.current === null) {
            knownMangasRef.current = new Set(ids);
            return;
        }
        const known = knownMangasRef.current;
        const fresh = ids.filter((id) => !known.has(id));
        fresh.forEach((id) => known.add(id));
        if (fresh.length === 0) return;

        // Sequential: do not flood AniList (rate limit). Stops on a 429.
        let cancelled = false;
        (async () => {
            for (const id of fresh) {
                if (cancelled) break;
                try {
                    const url = await coverAuto(id);
                    if (url) handleCoverLinked(id, url);
                } catch {
                    break;
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [entries]);

    useEffect(() => {
        if (selectedProfile && entries.length > 0) {
            loadFilterOptions();
        }
    }, [selectedProfile, entries]);

    const loadFilterOptions = async () => {
        if (!selectedProfile) return;
        
        setFiltersLoading(true);
        try {
            const publishersResponse = await fetch(`/api/entry/filters/publishers?profileId=${selectedProfile.id}`);
            if (publishersResponse.ok) {
                const publishers = await publishersResponse.json();
                setAvailablePublishers(publishers);
            }

            const formatsResponse = await fetch(`/api/entry/filters/formats?profileId=${selectedProfile.id}`);
            if (formatsResponse.ok) {
                const formats = await formatsResponse.json();
                setAvailableFormats(formats);
            }
        } catch (error) {
            console.error('Error loading filter options:', error);
        } finally {
            setFiltersLoading(false);
        }
    };

    useEffect(() => {
        setPublisherFilter('all');
        setFormatFilter('all');
        setFilter('all');
    }, [selectedProfile]);

    const getCompletionPercentage = (entry) => {
        if (!entry.manga.volumes || entry.manga.volumes === 0) return null;
        return Math.round((entry.quantity / entry.manga.volumes) * 100);
    };

    const getEntryStatus = (entry) => {
        const isComplete = entry.manga.volumes && entry.quantity >= entry.manga.volumes;
        
        if (isComplete) {
            return 'complete';
        } else if (entry.priority) {
            return 'priority-incomplete';
        } else {
            return 'incomplete';
        }
    };

    // Visual identity generated from the title (fallback without cover): gradient + initials.
    const titleHash = (value) => {
        let hash = 0;
        const text = value || '';
        for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) | 0;
        return Math.abs(hash);
    };
    const coverGradient = (title) => {
        const hue = titleHash(title) % 360;
        return `linear-gradient(135deg, hsl(${hue} 68% 52%), hsl(${(hue + 42) % 360} 62% 36%))`;
    };
    const coverInitials = (title) =>
        (title || '?')
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((word) => word[0])
            .join('')
            .toUpperCase();

    const getStatusCounts = () => {
        const filteredAndStatusFiltered = getFilteredEntries();
        const counts = {
            complete: 0,
            incomplete: 0,
            priorityIncomplete: 0,
            total: filteredAndStatusFiltered.length
        };

        filteredAndStatusFiltered.forEach(entry => {
            const status = getEntryStatus(entry);
            if (status === 'complete') counts.complete++;
            else if (status === 'priority-incomplete') counts.priorityIncomplete++;
            else counts.incomplete++;
        });

        return counts;
    };

    const getFilteredEntries = () => {
        return entries.filter(entry => {
            if (publisherFilter !== 'all') {
                const publisherId = entry.manga?.publisher?.id || entry.manga?.publisherId;
                if (publisherId !== parseInt(publisherFilter)) {
                    return false;
                }
            }

            if (formatFilter !== 'all') {
                const formatId = entry.manga?.format?.id || entry.manga?.formatId;
                if (formatId !== parseInt(formatFilter)) {
                    return false;
                }
            }

            const status = getEntryStatus(entry);
            switch (filter) {
                case 'complete':
                    return status === 'complete';
                case 'incomplete':
                    return status === 'incomplete';
                case 'priority-incomplete':
                    return status === 'priority-incomplete';
                case 'priority':
                    return entry.priority;
                case 'pending':
                    return entry.pending && entry.pending.trim() !== '';
                default:
                    return true;
            }
        });
    };

    const handleEditEntry = (entry) => {
        setEditingEntry(entry);
        setShowEditEntry(true);
    };

    const handleEditManga = (manga) => {
        setEditingManga(manga);
        setShowEditManga(true);
    };

    const handleQuickVolumeUpdate = async (entry, newQuantity) => {
        try {
            const entryData = {
                ...entry,
                id: entry.id,
                quantity: newQuantity
            };

            // Use POST - the service determines create vs update based on ID
            const response = await fetch('/api/entry', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(entryData)
            });

            if (response.ok) {
                onRefresh();
            }
        } catch (err) {
            console.error('Error updating quantity:', err);
        }
    };

    const handleEditSuccess = () => {
        onRefresh();
        setShowEditEntry(false);
        setShowEditManga(false);
        setEditingEntry(null);
        setEditingManga(null);
    };

    const filteredEntries = getFilteredEntries();

    const sortedEntries = [...filteredEntries].sort((a, b) => {
        switch (sortBy) {
            case 'name':
                return a.manga.name.localeCompare(b.manga.name);
            case 'quantity':
                return b.quantity - a.quantity;
            case 'completion':
                const aPercent = getCompletionPercentage(a) || 0;
                const bPercent = getCompletionPercentage(b) || 0;
                return bPercent - aPercent;
            case 'priority':
                return b.priority - a.priority;
            case 'publisher':
                return (a.manga?.publisher?.name || '').localeCompare(b.manga?.publisher?.name || '');
            case 'format':
                return (a.manga?.format?.name || '').localeCompare(b.manga?.format?.name || '');
            default:
                return 0;
        }
    });

    const statusCounts = getStatusCounts();

    const clearAllFilters = () => {
        setFilter('all');
        setPublisherFilter('all');
        setFormatFilter('all');
    };

    const hasActiveFilters = filter !== 'all' || publisherFilter !== 'all' || formatFilter !== 'all';

    const renderSkeleton = () => {
        const skeletonCount = viewMode === 'table' ? 10 : viewMode === 'compact' ? 12 : 6;
        
        return (
            <div className="skeleton-loading">
                {Array.from({ length: skeletonCount }).map((_, index) => (
                    <div key={index} className="skeleton-item" />
                ))}
            </div>
        );
    };

    const renderTableView = () => (
        <div className="table-container">
            <table className="entries-table">
                <thead>
                    <tr>
                        <th>{t('collection.thTitle')}</th>
                        <th>{t('collection.thStatus')}</th>
                        <th>{t('collection.thProgress')}</th>
                        <th>{t('collection.thCompletion')}</th>
                        <th>{t('collection.thPending')}</th>
                        <th>{t('collection.thPriority')}</th>
                        <th>{t('collection.thActions')}</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedEntries.map(entry => {
                        const status = getEntryStatus(entry);
                        const completionPercent = getCompletionPercentage(entry);
                        
                        return (
                            <tr key={entry.id} className={`table-row ${status}`}>
                                <td className="title-cell">
                                    <strong>{entry.manga.name}</strong>
                                </td>
                                <td className="status-cell">
                                    <span className={`status-indicator ${status}`}>
                                        {status === 'complete' ? '✅' : 
                                         status === 'priority-incomplete' ? '⚡' : '❌'}
                                    </span>
                                </td>
                                <td className="progress-cell">
                                    <div className="table-progress">
                                        <span className="progress-text">
                                            {entry.quantity}
                                            {entry.manga.volumes > 0 ? ` / ${entry.manga.volumes}` : t('collection.volumesUnknown')}
                                        </span>
                                        {entry.manga.volumes > 0 && (
                                            <div className="table-progress-bar">
                                                <div 
                                                    className={`table-progress-fill ${status}`}
                                                    style={{ width: `${completionPercent}%` }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="completion-cell">
                                    {completionPercent !== null && (
                                        <span className={`completion-percent ${status}`}>
                                            {completionPercent}%
                                        </span>
                                    )}
                                </td>
                                <td className="pending-cell">
                                    {entry.pending && (
                                        <span className="pending-text">{entry.pending}</span>
                                    )}
                                </td>
                                <td className="priority-cell">
                                    {entry.priority && (
                                        <span className="priority-indicator">⚡</span>
                                    )}
                                </td>
                                <td className="actions-cell">
                                    <div className="action-buttons">
                                        {entry.manga.volumes > 0 && entry.quantity < entry.manga.volumes && (
                                            <button
                                                className="quick-btn plus-one"
                                                onClick={() => handleQuickVolumeUpdate(entry, entry.quantity + 1)}
                                                title={t('collection.addOne')}
                                            >
                                                +1
                                            </button>
                                        )}
                                        <button
                                            className="edit-btn"
                                            onClick={() => handleEditEntry(entry)}
                                            title={t('collection.editEntry')}
                                        >
                                            ✏️
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );

    const renderCompactView = () => (
        <div className="compact-grid">
            {sortedEntries.map(entry => {
                const status = getEntryStatus(entry);
                const completionPercent = getCompletionPercentage(entry);
                
                return (
                    <div key={entry.id} className={`compact-card ${status}`}>
                        <div className="compact-header">
                            <span className="compact-title">{entry.manga.name}</span>
                            <div className="compact-badges">
                                {entry.priority && <span className="compact-priority">⚡</span>}
                                <span className={`compact-status ${status}`}>
                                    {status === 'complete' ? '✅' : 
                                     status === 'priority-incomplete' ? '⚡' : '❌'}
                                </span>
                            </div>
                        </div>
                        <div className="compact-progress">
                            <span className="compact-numbers">
                                {entry.quantity}{entry.manga.volumes > 0 ? ` / ${entry.manga.volumes}` : ' / ??'}
                            </span>
                            {completionPercent !== null && (
                                <span className={`compact-percent ${status}`}>
                                    {completionPercent}%
                                </span>
                            )}
                        </div>
                        {entry.manga.volumes > 0 && (
                            <div className="compact-bar">
                                <div 
                                    className={`compact-fill ${status}`}
                                    style={{ width: `${completionPercent}%` }}
                                />
                            </div>
                        )}
                        {entry.pending && (
                            <div className="compact-pending">{entry.pending}</div>
                        )}
                        <div className="compact-actions">
                            {entry.manga.volumes > 0 && entry.quantity < entry.manga.volumes && (
                                <button
                                    className="quick-btn plus-one compact"
                                    onClick={() => handleQuickVolumeUpdate(entry, entry.quantity + 1)}
                                    title="Add 1 volume"
                                >
                                    +1
                                </button>
                            )}
                            <button
                                className="edit-btn compact"
                                onClick={() => handleEditEntry(entry)}
                                title="Edit entry"
                            >
                                ✏️
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );

    const renderCardsView = () => (
        <div className="entries-grid">
            {sortedEntries.map(entry => {
                const status = getEntryStatus(entry);
                const completionPercent = getCompletionPercentage(entry);
                const cover = coverMap[entry.manga.id];
                const isAdult = cover?.isAdult === true;
                // With the pref ON reveal is on hover (momentary); with the pref
                // OFF it needs a click and stays until undone.
                const revealOnHover = isAdult && showAdultCovers;
                const revealed = isAdult && !showAdultCovers && revealedCovers[entry.manga.id] === true;
                const coverClassName = [
                    'card-cover',
                    cover ? 'has-cover' : '',
                    isAdult ? 'card-cover--adult' : '',
                    revealOnHover ? 'card-cover--reveal-hover' : '',
                    revealed ? 'card-cover--revealed' : '',
                ].filter(Boolean).join(' ');

                return (
                    <div key={entry.id} className={`entry-card ${status}`}>
                        <div
                            className={coverClassName}
                            style={
                                cover
                                    ? undefined
                                    : { backgroundImage: coverGradient(entry.manga.name) }
                            }
                            onClick={
                                isAdult && !showAdultCovers
                                    ? (event) => handleCoverReveal(event, entry.manga.id)
                                    : undefined
                            }
                        >
                            {cover ? (
                                <img
                                    className="card-cover-img"
                                    src={cover.url}
                                    alt=""
                                    loading="lazy"
                                />
                            ) : (
                                <span className="card-cover-initials">{coverInitials(entry.manga.name)}</span>
                            )}
                            {isAdult && <span className="card-cover-adult">+18</span>}
                            {completionPercent !== null && (
                                <span className={`card-cover-badge ${status}`}>{completionPercent}%</span>
                            )}
                            {entry.priority && <span className="card-cover-priority">⭐</span>}
                        </div>
                        <div className="entry-header">
                            <h3 className="manga-title">{entry.manga.name}</h3>
                            <div className="entry-badges">
                                {entry.priority && <span className="priority-badge">{t('collection.priorityBadge')}</span>}
                                <span className={`status-badge ${status}`}>
                                    {status === 'complete' ? '✅' : 
                                     status === 'priority-incomplete' ? '⚡' : '❌'}
                                </span>
                            </div>
                        </div>

                        <div className="entry-details">
                            {(entry.manga.format || entry.manga.publisher) && (
                                <div className="card-chips">
                                    {entry.manga.format?.name && (
                                        <span className="chip">{entry.manga.format.name}</span>
                                    )}
                                    {entry.manga.publisher?.name && (
                                        <span className="chip">{entry.manga.publisher.name}</span>
                                    )}
                                </div>
                            )}
                            <div className="quantity-info">
                                <span className="owned">{t('collection.ownedLabel')} {entry.quantity}{entry.manga.volumes > 0 ? ` / ${entry.manga.volumes}` : ' / ??'}</span>
                                {entry.manga.volumes > 0 && (
                                    <>
                                        <div className="progress-bar">
                                            <div 
                                                className={`progress-fill ${status}`}
                                                style={{ width: `${completionPercent}%` }}
                                            ></div>
                                        </div>
                                        <span className={`percentage ${status}`}>
                                            {completionPercent}%
                                        </span>
                                    </>
                                )}
                            </div>
                            
                            {entry.pending && (
                                <div className="pending-info">
                                    <strong>{t('collection.pendingLabel')}</strong> {entry.pending}
                                </div>
                            )}

                            <div className="card-actions">
                                {entry.manga.volumes > 0 && entry.quantity < entry.manga.volumes && (
                                    <button
                                        className="quick-btn plus-one"
                                        onClick={() => handleQuickVolumeUpdate(entry, entry.quantity + 1)}
                                        title="Add 1 volume"
                                    >
                                        {t('collection.plusOneVolume')}
                                    </button>
                                )}
                                <button
                                    className="edit-btn"
                                    onClick={() => handleEditEntry(entry)}
                                    title="Edit entry"
                                >
                                    {t('collection.editEntryIcon')}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );

    return (
        <div className="collection-view">
            <div className="collection-header">
                <div className="header-content">
                    <h1>{t('collection.title')}</h1>
                    {onRefresh && (
                        <button 
                            className="refresh-button"
                            onClick={onRefresh}
                            disabled={loading}
                            title={t('collection.refresh')}
                        >
                            {loading ? (
                                <LoadingSpinner size="small" showMessage={false} />
                            ) : (
                                '🔄'
                            )}
                        </button>
                    )}
                </div>
                <p className="collection-stats">
                    {t('collection.stats', { total: entries.length, shown: filteredEntries.length, volumes: entries.reduce((sum, entry) => sum + entry.quantity, 0) })}
                </p>
                <div className="status-summary">
                    <span className="status-count complete">
                        <div className="status-dot complete"></div>
                        {t('collection.complete', { count: statusCounts.complete })}
                    </span>
                    <span className="status-count priority-incomplete">
                        <div className="status-dot priority-incomplete"></div>
                        {t('collection.priority', { count: statusCounts.priorityIncomplete })}
                    </span>
                    <span className="status-count incomplete">
                        <div className="status-dot incomplete"></div>
                        {t('collection.incomplete', { count: statusCounts.incomplete })}
                    </span>
                </div>
            </div>

            <div className="collection-controls">
                <div className="filters-row">
                    <div className="filter-group">
                        <label>{t('collection.fPublisher')}</label>
                        <select 
                            value={publisherFilter} 
                            onChange={(e) => setPublisherFilter(e.target.value)} 
                            disabled={loading || filtersLoading}
                        >
                            <option value="all">{t('collection.fAllPublishers')}</option>
                            {availablePublishers.map(publisher => (
                                <option key={publisher.id} value={publisher.id}>
                                    {publisher.name} ({publisher.count})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>{t('collection.fFormat')}</label>
                        <select 
                            value={formatFilter} 
                            onChange={(e) => setFormatFilter(e.target.value)} 
                            disabled={loading || filtersLoading}
                        >
                            <option value="all">{t('collection.fAllFormats')}</option>
                            {availableFormats.map(format => (
                                <option key={format.id} value={format.id}>
                                    {format.name} ({format.count})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>{t('collection.fStatus')}</label>
                        <select value={filter} onChange={(e) => setFilter(e.target.value)} disabled={loading}>
                            <option value="all">{t('collection.fAllStatus', { count: entries.length })}</option>
                            <option value="complete">{t('collection.sComplete')}</option>
                            <option value="priority-incomplete">{t('collection.sPriorityIncomplete')}</option>
                            <option value="incomplete">{t('collection.sIncomplete')}</option>
                            <option value="priority">{t('collection.sPriorityOnly')}</option>
                            <option value="pending">{t('collection.sWithPending')}</option>
                        </select>
                    </div>

                    {hasActiveFilters && (
                        <div className="filter-group">
                            <button 
                                className="clear-filters-btn"
                                onClick={clearAllFilters}
                                title={t('collection.fClearTitle')}
                            >
                                {t('collection.fClear')}
                            </button>
                        </div>
                    )}
                </div>

                <div className="controls-row">
                    <div className="view-controls">
                        <label>{t('collection.viewLabel')}</label>
                        <select value={viewMode} onChange={(e) => setViewMode(e.target.value)} disabled={loading}>
                            <option value="table">{t('collection.viewTable')}</option>
                            <option value="compact">{t('collection.viewCompact')}</option>
                            <option value="cards">{t('collection.viewCards')}</option>
                        </select>
                    </div>

                    <div className="sort-controls">
                        <label>{t('collection.sortLabel')}</label>
                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} disabled={loading}>
                            <option value="name">{t('collection.sortName')}</option>
                            <option value="completion">{t('collection.sortCompletion')}</option>
                            <option value="quantity">{t('collection.sortQuantity')}</option>
                            <option value="priority">{t('collection.sortPriority')}</option>
                            <option value="publisher">{t('collection.sortPublisher')}</option>
                            <option value="format">{t('collection.sortFormat')}</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="collection-content">
                {loading ? (
                    renderSkeleton()
                ) : sortedEntries.length === 0 ? (
                    <div className="empty-collection">
                        <p>{t('collection.empty')}</p>
                        {hasActiveFilters && (
                            <button onClick={clearAllFilters} className="reset-filter">
                                Clear All Filters
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        {viewMode === 'table' && renderTableView()}
                        {viewMode === 'compact' && renderCompactView()}
                        {viewMode === 'cards' && renderCardsView()}
                    </>
                )}
            </div>

            <AddEntryModal 
                isOpen={showEditEntry}
                onClose={() => {
                    setShowEditEntry(false);
                    setEditingEntry(null);
                }}
                mangas={mangas}
                selectedProfile={selectedProfile}
                onSuccess={handleEditSuccess}
                editEntry={editingEntry}
            />

            <AddMangaModal 
                isOpen={showEditManga}
                onClose={() => {
                    setShowEditManga(false);
                    setEditingManga(null);
                }}
                    onSuccess={handleEditSuccess}
                    editManga={editingManga}
            />
        </div>
    );
};

export default CollectionView;