import { useState, useEffect } from 'react';
import './AddMangaModal.css';
import { useT } from '../contexts/I18nContext';
import { coverSearch, mangaCreateFromCandidate } from '../api/localAdapter';

const AddMangaModal = ({ 
    isOpen, 
    onClose, 
    onSuccess,
    editManga = null,
    mangas = [],
    showAdultCovers = false
}) => {
    const t = useT();
    const [formData, setFormData] = useState({
        name: '',
        volumes: '',
        formatId: '',
        publisherId: '',
        isAdult: false
    });
    const [formats, setFormats] = useState([]);
    const [publishers, setPublishers] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [showAddFormat, setShowAddFormat] = useState(false);
    const [showAddPublisher, setShowAddPublisher] = useState(false);
    const [newFormatName, setNewFormatName] = useState('');
    const [newPublisherName, setNewPublisherName] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [revealedCandidates, setRevealedCandidates] = useState({});
    const [coverWarning, setCoverWarning] = useState('');

    useEffect(() => {
        if (isOpen) {
            loadFormats();
            loadPublishers();
        }
    }, [isOpen]);

    useEffect(() => {
        if (editManga) {
            setFormData({
                name: editManga.name,
                volumes: editManga.volumes ? editManga.volumes.toString() : '',
                formatId: editManga.formatId ? editManga.formatId.toString() : '',
                publisherId: editManga.publisherId ? editManga.publisherId.toString() : '',
                isAdult: editManga.isAdult === true
            });
        } else {
            setFormData({
                name: '',
                volumes: '',
                formatId: '',
                publisherId: '',
                isAdult: false
            });
            setSearchQuery('');
            setSearchResults([]);
            setSearchError('');
            setIsSearching(false);
            setSelectedCandidate(null);
            setRevealedCandidates({});
        }
        setError('');
        setCoverWarning('');
    }, [editManga, isOpen]);

    const loadFormats = async () => {
        try {
            const response = await fetch('/api/format');
            if (response.ok) {
                const data = await response.json();
                setFormats(data);
            }
        } catch (err) {
            console.error('Error loading formats:', err);
        }
    };

    const loadPublishers = async () => {
        try {
            const response = await fetch('/api/publisher');
            if (response.ok) {
                const data = await response.json();
                setPublishers(data);
            }
        } catch (err) {
            console.error('Error loading publishers:', err);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleAddFormat = async () => {
        if (!newFormatName.trim()) return;

        try {
            const response = await fetch('/api/format', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: newFormatName.trim() })
            });

            if (response.ok) {
                const newFormat = await response.json();
                setFormats(prev => [...prev, newFormat]);
                setFormData(prev => ({ ...prev, formatId: newFormat.id.toString() }));
                setNewFormatName('');
                setShowAddFormat(false);
            }
        } catch (err) {
            console.error('Error adding format:', err);
        }
    };

    const handleAddPublisher = async () => {
        if (!newPublisherName.trim()) return;

        try {
            const response = await fetch('/api/publisher', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: newPublisherName.trim() })
            });

            if (response.ok) {
                const newPublisher = await response.json();
                setPublishers(prev => [...prev, newPublisher]);
                setFormData(prev => ({ ...prev, publisherId: newPublisher.id.toString() }));
                setNewPublisherName('');
                setShowAddPublisher(false);
            }
        } catch (err) {
            console.error('Error adding publisher:', err);
        }
    };

    const runSearch = async () => {
        const query = searchQuery.trim();
        if (!query) return;
        setIsSearching(true);
        setSearchError('');
        try {
            const found = await coverSearch(query);
            const list = Array.isArray(found) ? found : [];
            setSearchResults(list);
            if (list.length === 0) setSearchError(t('addManga.noResults'));
        } catch {
            setSearchResults([]);
            setSearchError(t('addManga.searchError'));
        } finally {
            setIsSearching(false);
        }
    };

    const selectCandidate = (candidate) => {
        setSelectedCandidate(candidate);
        setFormData((prev) => ({
            ...prev,
            name: candidate.title || prev.name,
            volumes: candidate.volumes ? String(candidate.volumes) : '',
            isAdult: candidate.isAdult === true,
        }));
        setSearchError('');
    };

    const isRevealed = (candidate) =>
        candidate.isAdult === true && !showAdultCovers && revealedCandidates[candidate.id] === true;

    const handleCandidateClick = (candidate) => {
        if (candidate.isAdult === true && !showAdultCovers && !revealedCandidates[candidate.id]) {
            setRevealedCandidates((prev) => ({ ...prev, [candidate.id]: true }));
            return;
        }
        selectCandidate(candidate);
    };

    const candidateClassName = (candidate) =>
        [
            'manga-candidate',
            candidate.isAdult ? 'manga-candidate--adult' : '',
            candidate.isAdult && showAdultCovers ? 'manga-candidate--reveal-hover' : '',
            isRevealed(candidate) ? 'manga-candidate--revealed' : '',
            selectedCandidate?.id === candidate.id ? 'manga-candidate--selected' : '',
        ]
            .filter(Boolean)
            .join(' ');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        if (!formData.name.trim()) {
            setError(t('addManga.errName'));
            setIsSubmitting(false);
            return;
        }

        if (!formData.formatId) {
            setError(t('addManga.errFormat'));
            setIsSubmitting(false);
            return;
        }

        if (!formData.publisherId) {
            setError(t('addManga.errPublisher'));
            setIsSubmitting(false);
            return;
        }

        try {
            const mangaData = {
                id: editManga ? editManga.id : 0,
                name: formData.name.trim(),
                volumes: formData.volumes ? parseInt(formData.volumes, 10) : 0,
                formatId: parseInt(formData.formatId),
                publisherId: parseInt(formData.publisherId),
                isAdult: formData.isAdult === true
            };

            if (!editManga && selectedCandidate) {
                const result = await mangaCreateFromCandidate({
                    candidate: selectedCandidate,
                    name: mangaData.name,
                    volumes: mangaData.volumes,
                    formatId: mangaData.formatId,
                    publisherId: mangaData.publisherId,
                    isAdult: mangaData.isAdult,
                });
                onSuccess();
                if (result?.coverError) {
                    setCoverWarning(t('addManga.coverUnavailable'));
                    return;
                }
                onClose();
                setFormData({
                    name: '',
                    volumes: '',
                    formatId: '',
                    publisherId: '',
                    isAdult: false
                });
                setSearchQuery('');
                setSearchResults([]);
                setSelectedCandidate(null);
                return;
            }

            const method = editManga ? 'PUT' : 'POST';
            const url = editManga ? `/api/manga/${editManga.id}` : '/api/manga';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(mangaData)
            });

            if (response.ok) {
                onSuccess();
                onClose();
                if (!editManga) {
                    setFormData({
                        name: '',
                        volumes: '',
                        formatId: '',
                        publisherId: '',
                        isAdult: false
                    });
                    setSearchQuery('');
                    setSearchResults([]);
                    setSelectedCandidate(null);
                }
            } else {
                const error = await response.json();
                setError(t(editManga ? 'addManga.errUpdate' : 'addManga.errCreate', { message: error.message || t('addManga.unknownError') }));
            }
        } catch (err) {
            setError(t(editManga ? 'addManga.errNetUpdate' : 'addManga.errNetCreate', { message: err.message }));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const isEditing = !!editManga;
    const normalizedName = formData.name.trim().toLowerCase();
    const duplicateName =
        !isEditing &&
        normalizedName &&
        mangas.some((manga) => String(manga.name ?? '').trim().toLowerCase() === normalizedName);

    const candidateMeta = (candidate) =>
        [
            candidate.format,
            candidate.year,
            candidate.volumes ? t('addManga.volShort', { count: candidate.volumes }) : null,
        ]
            .filter(Boolean)
            .join(' · ');

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>{t(isEditing ? 'addManga.titleEdit' : 'addManga.titleCreate')}</h2>
                    <button className="close-button" onClick={onClose}>&times;</button>
                </div>
                
                <form onSubmit={handleSubmit} className="manga-form">
                    {!isEditing && (
                        <div className="form-group manga-search">
                            <label htmlFor="mangaSearch">{t('addManga.searchLabel')}</label>
                            <div className="manga-search-row">
                                <input
                                    type="search"
                                    id="mangaSearch"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            runSearch();
                                        }
                                    }}
                                    placeholder={t('addManga.searchPlaceholder')}
                                />
                                <button
                                    type="button"
                                    className="manga-search-btn"
                                    onClick={runSearch}
                                    disabled={isSearching || !searchQuery.trim()}
                                >
                                    {t(isSearching ? 'addManga.searching' : 'addManga.search')}
                                </button>
                            </div>
                            {searchError && <div className="manga-search-message">{searchError}</div>}
                            {searchResults.length > 0 && (
                                <div className="manga-search-results">
                                    {searchResults.map((candidate) => (
                                        <button
                                            key={candidate.id}
                                            type="button"
                                            className={candidateClassName(candidate)}
                                            onClick={() => handleCandidateClick(candidate)}
                                            title={t('addManga.selectCandidateTitle', {
                                                title: candidate.title,
                                            })}
                                        >
                                            {candidate.coverUrl ? (
                                                <img src={candidate.coverUrl} alt="" loading="lazy" />
                                            ) : (
                                                <span className="manga-candidate-placeholder">
                                                    {t('lcm.noCover')}
                                                </span>
                                            )}
                                            {candidate.isAdult && (
                                                <span className="manga-candidate-adult">+18</span>
                                            )}
                                            {candidate.source && (
                                                <span className="manga-candidate-source">
                                                    {candidate.source === 'mangadex'
                                                        ? 'MangaDex'
                                                        : 'AniList'}
                                                </span>
                                            )}
                                            <span className="manga-candidate-title">
                                                {candidate.title}
                                            </span>
                                            <span className="manga-candidate-meta">
                                                {candidateMeta(candidate)}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {selectedCandidate && (
                                <div className="manga-selected">
                                    {selectedCandidate.coverUrl && (
                                        <img
                                            className="manga-selected-cover"
                                            src={selectedCandidate.coverUrl}
                                            alt=""
                                        />
                                    )}
                                    <div className="manga-selected-info">
                                        <span className="manga-selected-label">
                                            {t('addManga.selectedCandidate')}
                                        </span>
                                        <strong>{selectedCandidate.title}</strong>
                                        <span className="manga-candidate-meta">
                                            {candidateMeta(selectedCandidate)}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        className="manga-selected-clear"
                                        onClick={() => setSelectedCandidate(null)}
                                    >
                                        {t('addManga.clearCandidate')}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="name">{t('addManga.nameLabel')}</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            placeholder={t('addManga.namePlaceholder')}
                            required
                        />
                        {duplicateName && (
                            <div className="manga-duplicate-warning">
                                {t('addManga.duplicateWarning')}
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <label htmlFor="volumes">{t('addManga.volumesLabel')}</label>
                        <input
                            type="number"
                            id="volumes"
                            name="volumes"
                            value={formData.volumes}
                            onChange={handleInputChange}
                            min="1"
                            placeholder={t('addManga.volumesPlaceholder')}
                        />
                        <small>{t('addManga.volumesHint')}</small>
                    </div>

                    <div className="form-group">
                        <label htmlFor="formatId">{t('addManga.formatLabel')}</label>
                        <div className="select-with-add">
                            <select
                                id="formatId"
                                name="formatId"
                                value={formData.formatId}
                                onChange={handleInputChange}
                                required
                            >
                                <option value="">{t('addManga.selectFormat')}</option>
                                {formats.map(format => (
                                    <option key={format.id} value={format.id}>
                                        {format.name}
                                    </option>
                                ))}
                            </select>
                            <button 
                                type="button" 
                                onClick={() => setShowAddFormat(true)}
                                className="add-new-btn"
                                title={t('addManga.addFormatTitle')}
                            >
                                +
                            </button>
                        </div>
                        
                        {showAddFormat && (
                            <div className="add-new-section">
                                <input
                                    type="text"
                                    value={newFormatName}
                                    onChange={(e) => setNewFormatName(e.target.value)}
                                    placeholder={t('addManga.newFormatName')}
                                    onKeyPress={(e) => e.key === 'Enter' && handleAddFormat()}
                                />
                                <button type="button" onClick={handleAddFormat}>{t('addManga.add')}</button>
                                <button type="button" onClick={() => setShowAddFormat(false)}>{t('addManga.cancel')}</button>
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <label htmlFor="publisherId">{t('addManga.publisherLabel')}</label>
                        <div className="select-with-add">
                            <select
                                id="publisherId"
                                name="publisherId"
                                value={formData.publisherId}
                                onChange={handleInputChange}
                                required
                            >
                                <option value="">{t('addManga.selectPublisher')}</option>
                                {publishers.map(publisher => (
                                    <option key={publisher.id} value={publisher.id}>
                                        {publisher.name}
                                    </option>
                                ))}
                            </select>
                            <button 
                                type="button" 
                                onClick={() => setShowAddPublisher(true)}
                                className="add-new-btn"
                                title={t('addManga.addPublisherTitle')}
                            >
                                +
                            </button>
                        </div>
                        
                        {showAddPublisher && (
                            <div className="add-new-section">
                                <input
                                    type="text"
                                    value={newPublisherName}
                                    onChange={(e) => setNewPublisherName(e.target.value)}
                                    placeholder={t('addManga.newPublisherName')}
                                    onKeyPress={(e) => e.key === 'Enter' && handleAddPublisher()}
                                />
                                <button type="button" onClick={handleAddPublisher}>Add</button>
                                <button type="button" onClick={() => setShowAddPublisher(false)}>Cancel</button>
                            </div>
                        )}
                    </div>

                    <div className="form-group checkbox-group">
                        <label htmlFor="isAdult">
                            <input
                                type="checkbox"
                                id="isAdult"
                                name="isAdult"
                                checked={formData.isAdult}
                                onChange={handleInputChange}
                            />
                            {t('addManga.isAdult')}
                        </label>
                    </div>

                    {coverWarning && (
                        <div className="manga-cover-warning">{coverWarning}</div>
                    )}

                    {error && <div className="error-message">{error}</div>}

                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="cancel-button">
                            Cancel
                        </button>
                        <button type="submit" disabled={isSubmitting || !!coverWarning} className="submit-button">
                            {isSubmitting ? 
                                t(isEditing ? 'addManga.submittingUpdate' : 'addManga.submittingCreate') :
                                t(isEditing ? 'addManga.submitUpdate' : 'addManga.submitCreate')
                            }
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddMangaModal;