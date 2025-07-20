import { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';
import AddEntryModal from './AddEntryModal';
import AddMangaModal from './AddMangaModal';
import './CollectionView.css';

const CollectionView = ({ entries, loading = false, onRefresh, mangas = [] }) => {
    const [filter, setFilter] = useState('all');
    const [sortBy, setSortBy] = useState('name');
    const [viewMode, setViewMode] = useState('cards');
    
    // Edit modal states
    const [showEditEntry, setShowEditEntry] = useState(false);
    const [showEditManga, setShowEditManga] = useState(false);
    const [editingEntry, setEditingEntry] = useState(null);
    const [editingManga, setEditingManga] = useState(null);

    // Helper functions (keeping existing ones)
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

    const getStatusCounts = () => {
        const counts = {
            complete: 0,
            incomplete: 0,
            priorityIncomplete: 0,
            total: entries.length
        };

        entries.forEach(entry => {
            const status = getEntryStatus(entry);
            if (status === 'complete') counts.complete++;
            else if (status === 'priority-incomplete') counts.priorityIncomplete++;
            else counts.incomplete++;
        });

        return counts;
    };

    // Edit handlers
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
                id: entry.id, // Include the ID for update
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

    // Filtering and sorting logic (keeping existing)
    const filteredEntries = entries.filter(entry => {
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
            default:
                return 0;
        }
    });

    const statusCounts = getStatusCounts();

    // Skeleton loading (keeping existing)
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

    // Enhanced render methods with edit buttons
    const renderTableView = () => (
        <div className="table-container">
            <table className="entries-table">
                <thead>
                    <tr>
                        <th>Title</th>
                        <th>Status</th>
                        <th>Progress</th>
                        <th>Completion</th>
                        <th>Pending</th>
                        <th>Priority</th>
                        <th>Actions</th>
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
                                            {entry.manga.volumes && ` / ${entry.manga.volumes}`}
                                        </span>
                                        {entry.manga.volumes && (
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
                                    {completionPercent && (
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
                                        {entry.manga.volumes && entry.quantity < entry.manga.volumes && (
                                            <button
                                                className="quick-btn plus-one"
                                                onClick={() => handleQuickVolumeUpdate(entry, entry.quantity + 1)}
                                                title="Add 1 volume"
                                            >
                                                +1
                                            </button>
                                        )}
                                        <button
                                            className="edit-btn"
                                            onClick={() => handleEditEntry(entry)}
                                            title="Edit entry"
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
                                {entry.quantity}{entry.manga.volumes && ` / ${entry.manga.volumes}`}
                            </span>
                            {completionPercent && (
                                <span className={`compact-percent ${status}`}>
                                    {completionPercent}%
                                </span>
                            )}
                        </div>
                        {entry.manga.volumes && (
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
                            {entry.manga.volumes && entry.quantity < entry.manga.volumes && (
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
                
                return (
                    <div key={entry.id} className={`entry-card ${status}`}>
                        <div className="entry-header">
                            <h3 className="manga-title">{entry.manga.name}</h3>
                            <div className="entry-badges">
                                {entry.priority && <span className="priority-badge">Priority</span>}
                                <span className={`status-badge ${status}`}>
                                    {status === 'complete' ? '✅' : 
                                     status === 'priority-incomplete' ? '⚡' : '❌'}
                                </span>
                            </div>
                        </div>
                        
                        <div className="entry-details">
                            <div className="quantity-info">
                                <span className="owned">Owned: {entry.quantity}</span>
                                {entry.manga.volumes && (
                                    <>
                                        <span className="total">/ {entry.manga.volumes}</span>
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
                                    <strong>Pending:</strong> {entry.pending}
                                </div>
                            )}

                            <div className="card-actions">
                                {entry.manga.volumes && entry.quantity < entry.manga.volumes && (
                                    <button
                                        className="quick-btn plus-one"
                                        onClick={() => handleQuickVolumeUpdate(entry, entry.quantity + 1)}
                                        title="Add 1 volume"
                                    >
                                        +1 Volume
                                    </button>
                                )}
                                <button
                                    className="edit-btn"
                                    onClick={() => handleEditEntry(entry)}
                                    title="Edit entry"
                                >
                                    ✏️ Edit Entry
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
                    <h1>My Manga Collection</h1>
                    {onRefresh && (
                        <button 
                            className="refresh-button"
                            onClick={onRefresh}
                            disabled={loading}
                            title="Refresh collection"
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
                    {entries.length} entries • {entries.reduce((sum, entry) => sum + entry.quantity, 0)} volumes total
                </p>
                <div className="status-summary">
                    <span className="status-count complete">
                        <div className="status-dot complete"></div>
                        Complete: {statusCounts.complete}
                    </span>
                    <span className="status-count priority-incomplete">
                        <div className="status-dot priority-incomplete"></div>
                        Priority: {statusCounts.priorityIncomplete}
                    </span>
                    <span className="status-count incomplete">
                        <div className="status-dot incomplete"></div>
                        Incomplete: {statusCounts.incomplete}
                    </span>
                </div>
            </div>

            <div className="collection-controls">
                <div className="view-controls">
                    <label>View:</label>
                    <select value={viewMode} onChange={(e) => setViewMode(e.target.value)} disabled={loading}>
                        <option value="table">📊 Table (Most Compact)</option>
                        <option value="compact">📋 Compact Cards</option>
                        <option value="cards">🎴 Full Cards</option>
                    </select>
                </div>

                <div className="filter-controls">
                    <label>Filter by Status:</label>
                    <select value={filter} onChange={(e) => setFilter(e.target.value)} disabled={loading}>
                        <option value="all">All Items ({entries.length})</option>
                        <option value="complete">✅ Complete ({statusCounts.complete})</option>
                        <option value="priority-incomplete">⚡ Priority Incomplete ({statusCounts.priorityIncomplete})</option>
                        <option value="incomplete">❌ Incomplete ({statusCounts.incomplete})</option>
                        <option value="priority">Priority Only</option>
                        <option value="pending">With Pending</option>
                    </select>
                </div>

                <div className="sort-controls">
                    <label>Sort by:</label>
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} disabled={loading}>
                        <option value="name">Name</option>
                        <option value="completion">Completion %</option>
                        <option value="quantity">Quantity</option>
                        <option value="priority">Priority</option>
                    </select>
                </div>
            </div>

            <div className="collection-content">
                {loading ? (
                    renderSkeleton()
                ) : sortedEntries.length === 0 ? (
                    <div className="empty-collection">
                        <p>No entries found for the selected filter.</p>
                        {filter !== 'all' && (
                            <button onClick={() => setFilter('all')} className="reset-filter">
                                Show All Entries
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

            {/* Edit Modals */}
            <AddEntryModal 
                isOpen={showEditEntry}
                onClose={() => {
                    setShowEditEntry(false);
                    setEditingEntry(null);
                }}
                mangas={mangas}
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