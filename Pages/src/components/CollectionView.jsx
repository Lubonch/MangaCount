import { useState, useMemo } from 'react';
import './CollectionView.css';

const CollectionView = ({ entries, onUpdateEntry }) => {
    const [filter, setFilter]               = useState('all');
    const [sortBy, setSortBy]               = useState('name');
    const [viewMode, setViewMode]           = useState('cards');
    const [publisherFilter, setPublisherFilter] = useState('all');
    const [formatFilter, setFormatFilter]   = useState('all');

    // Edit modal state
    const [editingEntry, setEditingEntry]   = useState(null);

    // ── Derived filter options from local data ──────────────────
    const availablePublishers = useMemo(() => {
        const map = {};
        entries.forEach(e => {
            const p = e.manga?.publisher;
            if (p) map[p.id] = map[p.id] ? { ...p, count: map[p.id].count + 1 } : { ...p, count: 1 };
        });
        return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
    }, [entries]);

    const availableFormats = useMemo(() => {
        const map = {};
        entries.forEach(e => {
            const f = e.manga?.format;
            if (f) map[f.id] = map[f.id] ? { ...f, count: map[f.id].count + 1 } : { ...f, count: 1 };
        });
        return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
    }, [entries]);

    // ── Helpers ──────────────────────────────────────────────────
    const getCompletionPercentage = (entry) => {
        if (!entry.manga.volumes) return null;
        return Math.round((entry.quantity / entry.manga.volumes) * 100);
    };

    const getEntryStatus = (entry) => {
        const isComplete = entry.manga.volumes && entry.quantity >= entry.manga.volumes;
        if (isComplete) return 'complete';
        if (entry.priority) return 'priority-incomplete';
        return 'incomplete';
    };

    // ── Filtering & sorting ──────────────────────────────────────
    const getFilteredEntries = () => {
        return entries.filter(entry => {
            if (publisherFilter !== 'all' && entry.manga?.publisher?.id !== parseInt(publisherFilter)) return false;
            if (formatFilter !== 'all' && entry.manga?.format?.id !== parseInt(formatFilter)) return false;
            const status = getEntryStatus(entry);
            switch (filter) {
                case 'complete':            return status === 'complete';
                case 'incomplete':          return status === 'incomplete';
                case 'priority-incomplete': return status === 'priority-incomplete';
                case 'priority':            return entry.priority;
                case 'pending':             return entry.pending && entry.pending.trim() !== '';
                default:                    return true;
            }
        });
    };

    const filteredEntries = getFilteredEntries();

    const sortedEntries = [...filteredEntries].sort((a, b) => {
        switch (sortBy) {
            case 'name':       return a.manga.name.localeCompare(b.manga.name, 'es');
            case 'quantity':   return b.quantity - a.quantity;
            case 'completion': return (getCompletionPercentage(b) || 0) - (getCompletionPercentage(a) || 0);
            case 'priority':   return (b.priority ? 1 : 0) - (a.priority ? 1 : 0);
            case 'publisher':  return (a.manga?.publisher?.name || '').localeCompare(b.manga?.publisher?.name || '');
            case 'format':     return (a.manga?.format?.name || '').localeCompare(b.manga?.format?.name || '');
            default:           return 0;
        }
    });

    const statusCounts = {
        complete:          filteredEntries.filter(e => getEntryStatus(e) === 'complete').length,
        priorityIncomplete:filteredEntries.filter(e => getEntryStatus(e) === 'priority-incomplete').length,
        incomplete:        filteredEntries.filter(e => getEntryStatus(e) === 'incomplete').length,
    };

    const hasActiveFilters = filter !== 'all' || publisherFilter !== 'all' || formatFilter !== 'all';

    const clearAllFilters = () => { setFilter('all'); setPublisherFilter('all'); setFormatFilter('all'); };

    // ── Actions ─────────────────────────────────────────────────
    const handleQuickVolumeUpdate = (entry, newQuantity) => {
        onUpdateEntry(entry.id, { quantity: newQuantity });
    };

    // ── View renderers (faithful to original) ───────────────────
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
                                <td className="title-cell"><strong>{entry.manga.name}</strong></td>
                                <td className="status-cell">
                                    <span className={`status-indicator ${status}`}>
                                        {status === 'complete' ? '✅' : status === 'priority-incomplete' ? '⚡' : '❌'}
                                    </span>
                                </td>
                                <td className="progress-cell">
                                    <div className="table-progress">
                                        <span className="progress-text">
                                            {entry.quantity}{entry.manga.volumes && ` / ${entry.manga.volumes}`}
                                        </span>
                                        {entry.manga.volumes && (
                                            <div className="table-progress-bar">
                                                <div className={`table-progress-fill ${status}`} style={{ width: `${completionPercent}%` }} />
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="completion-cell">
                                    {completionPercent && <span className={`completion-percent ${status}`}>{completionPercent}%</span>}
                                </td>
                                <td className="pending-cell">
                                    {entry.pending && <span className="pending-text">{entry.pending}</span>}
                                </td>
                                <td className="priority-cell">
                                    {entry.priority && <span className="priority-indicator">⚡</span>}
                                </td>
                                <td className="actions-cell">
                                    <div className="action-buttons">
                                        {entry.manga.volumes && entry.quantity < entry.manga.volumes && (
                                            <button className="quick-btn plus-one" onClick={() => handleQuickVolumeUpdate(entry, entry.quantity + 1)} title="Add 1 volume">+1</button>
                                        )}
                                        <button className="edit-btn" onClick={() => setEditingEntry(entry)} title="Edit entry">✏️</button>
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
                                    {status === 'complete' ? '✅' : status === 'priority-incomplete' ? '⚡' : '❌'}
                                </span>
                            </div>
                        </div>
                        <div className="compact-progress">
                            <span className="compact-numbers">{entry.quantity}{entry.manga.volumes && ` / ${entry.manga.volumes}`}</span>
                            {completionPercent && <span className={`compact-percent ${status}`}>{completionPercent}%</span>}
                        </div>
                        {entry.manga.volumes && (
                            <div className="compact-bar">
                                <div className={`compact-fill ${status}`} style={{ width: `${completionPercent}%` }} />
                            </div>
                        )}
                        {entry.pending && <div className="compact-pending">{entry.pending}</div>}
                        <div className="compact-actions">
                            {entry.manga.volumes && entry.quantity < entry.manga.volumes && (
                                <button className="quick-btn plus-one compact" onClick={() => handleQuickVolumeUpdate(entry, entry.quantity + 1)} title="Add 1 volume">+1</button>
                            )}
                            <button className="edit-btn compact" onClick={() => setEditingEntry(entry)} title="Edit entry">✏️</button>
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
                                    {status === 'complete' ? '✅' : status === 'priority-incomplete' ? '⚡' : '❌'}
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
                                            <div className={`progress-fill ${status}`} style={{ width: `${completionPercent}%` }} />
                                        </div>
                                        <span className={`percentage ${status}`}>{completionPercent}%</span>
                                    </>
                                )}
                            </div>
                            {entry.pending && (
                                <div className="pending-info"><strong>Pending:</strong> {entry.pending}</div>
                            )}
                            <div className="card-actions">
                                {entry.manga.volumes && entry.quantity < entry.manga.volumes && (
                                    <button className="quick-btn plus-one" onClick={() => handleQuickVolumeUpdate(entry, entry.quantity + 1)} title="Add 1 volume">+1 Volume</button>
                                )}
                                <button className="edit-btn" onClick={() => setEditingEntry(entry)} title="Edit entry">✏️ Edit Entry</button>
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
                </div>
                <p className="collection-stats">
                    {entries.length} total entries · {filteredEntries.length} shown · {entries.reduce((s, e) => s + e.quantity, 0)} volumes total
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
                <div className="filters-row">
                    <div className="filter-group">
                        <label>📚 Publisher:</label>
                        <select value={publisherFilter} onChange={e => setPublisherFilter(e.target.value)}>
                            <option value="all">All Publishers</option>
                            {availablePublishers.map(p => <option key={p.id} value={p.id}>{p.name} ({p.count})</option>)}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>📖 Format:</label>
                        <select value={formatFilter} onChange={e => setFormatFilter(e.target.value)}>
                            <option value="all">All Formats</option>
                            {availableFormats.map(f => <option key={f.id} value={f.id}>{f.name} ({f.count})</option>)}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>📊 Status:</label>
                        <select value={filter} onChange={e => setFilter(e.target.value)}>
                            <option value="all">All Status ({entries.length})</option>
                            <option value="complete">✅ Complete</option>
                            <option value="priority-incomplete">⚡ Priority Incomplete</option>
                            <option value="incomplete">❌ Incomplete</option>
                            <option value="priority">Priority Only</option>
                            <option value="pending">With Pending</option>
                        </select>
                    </div>
                    {hasActiveFilters && (
                        <div className="filter-group">
                            <button className="clear-filters-btn" onClick={clearAllFilters}>🗑️ Clear Filters</button>
                        </div>
                    )}
                </div>
                <div className="controls-row">
                    <div className="view-controls">
                        <label>View:</label>
                        <select value={viewMode} onChange={e => setViewMode(e.target.value)}>
                            <option value="table">📊 Table</option>
                            <option value="compact">📋 Compact</option>
                            <option value="cards">🎴 Cards</option>
                        </select>
                    </div>
                    <div className="sort-controls">
                        <label>Sort by:</label>
                        <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
                            <option value="name">Name</option>
                            <option value="completion">Completion %</option>
                            <option value="quantity">Quantity</option>
                            <option value="priority">Priority</option>
                            <option value="publisher">Publisher</option>
                            <option value="format">Format</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="collection-content">
                {sortedEntries.length === 0 ? (
                    <div className="empty-collection">
                        <p>No entries found for the selected filters.</p>
                        {hasActiveFilters && <button onClick={clearAllFilters} className="reset-filter">Clear All Filters</button>}
                    </div>
                ) : (
                    <>
                        {viewMode === 'table'   && renderTableView()}
                        {viewMode === 'compact' && renderCompactView()}
                        {viewMode === 'cards'   && renderCardsView()}
                    </>
                )}
            </div>

            {/* Inline edit modal */}
            {editingEntry && (
                <EditModal
                    entry={editingEntry}
                    onSave={(id, changes) => { onUpdateEntry(id, changes); setEditingEntry(null); }}
                    onClose={() => setEditingEntry(null)}
                />
            )}
        </div>
    );
};

// ── Simple local edit modal ──────────────────────────────────────
const EditModal = ({ entry, onSave, onClose }) => {
    const [quantity, setQuantity] = useState(entry.quantity);
    const [priority, setPriority] = useState(entry.priority);
    const [pending, setPending]   = useState(entry.pending || '');

    const handleSave = () => {
        onSave(entry.id, { quantity: parseInt(quantity) || 0, priority, pending });
    };

    return (
        <div className="edit-modal-overlay" onClick={onClose}>
            <div className="edit-modal" onClick={e => e.stopPropagation()}>
                <h3 className="edit-modal-title">{entry.manga.name}</h3>

                <div className="edit-field">
                    <label>Volúmenes comprados</label>
                    <div className="edit-quantity-row">
                        <button className="qty-btn" onClick={() => setQuantity(q => Math.max(0, parseInt(q) - 1))}>−</button>
                        <input
                            type="number"
                            min="0"
                            value={quantity}
                            onChange={e => setQuantity(e.target.value)}
                            className="qty-input"
                        />
                        <button className="qty-btn" onClick={() => setQuantity(q => parseInt(q) + 1)}>+</button>
                        {entry.manga.volumes && <span className="qty-total">/ {entry.manga.volumes}</span>}
                    </div>
                </div>

                <div className="edit-field">
                    <label>Pendiente (números no consecutivos)</label>
                    <input
                        type="text"
                        value={pending}
                        onChange={e => setPending(e.target.value)}
                        placeholder="ej: 5, 12, 18"
                        className="text-input"
                    />
                </div>

                <div className="edit-field edit-checkbox-field">
                    <label>
                        <input
                            type="checkbox"
                            checked={priority}
                            onChange={e => setPriority(e.target.checked)}
                        />
                        ⚡ Marcar como prioridad
                    </label>
                </div>

                <div className="edit-modal-actions">
                    <button className="modal-btn cancel" onClick={onClose}>Cancelar</button>
                    <button className="modal-btn save" onClick={handleSave}>Guardar</button>
                </div>
            </div>
        </div>
    );
};

export default CollectionView;
