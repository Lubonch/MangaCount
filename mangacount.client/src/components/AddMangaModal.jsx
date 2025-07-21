import { useState, useEffect } from 'react';
import './AddMangaModal.css';

const AddMangaModal = ({ 
    isOpen, 
    onClose, 
    onSuccess,
    editManga = null
}) => {
    const [formData, setFormData] = useState({
        name: '',
        volumes: '',
        formatId: '',
        publisherId: ''
    });
    const [formats, setFormats] = useState([]);
    const [publishers, setPublishers] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [showAddFormat, setShowAddFormat] = useState(false);
    const [showAddPublisher, setShowAddPublisher] = useState(false);
    const [newFormatName, setNewFormatName] = useState('');
    const [newPublisherName, setNewPublisherName] = useState('');

    // Load formats and publishers when modal opens
    useEffect(() => {
        if (isOpen) {
            loadFormats();
            loadPublishers();
        }
    }, [isOpen]);

    // Populate form when editing
    useEffect(() => {
        if (editManga) {
            setFormData({
                name: editManga.name,
                volumes: editManga.volumes ? editManga.volumes.toString() : '',
                formatId: editManga.formatId ? editManga.formatId.toString() : '',
                publisherId: editManga.publisherId ? editManga.publisherId.toString() : ''
            });
        } else {
            setFormData({
                name: '',
                volumes: '',
                formatId: '',
                publisherId: ''
            });
        }
        setError('');
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
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        if (!formData.name.trim()) {
            setError('Please enter a manga name');
            setIsSubmitting(false);
            return;
        }

        if (!formData.formatId) {
            setError('Please select a format');
            setIsSubmitting(false);
            return;
        }

        if (!formData.publisherId) {
            setError('Please select a publisher');
            setIsSubmitting(false);
            return;
        }

        try {
            const mangaData = {
                id: editManga ? editManga.id : 0,
                name: formData.name.trim(),
                volumes: formData.volumes ? parseInt(formData.volumes) : null,
                formatId: parseInt(formData.formatId),
                publisherId: parseInt(formData.publisherId)
            };

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
                        publisherId: ''
                    });
                }
            } else {
                const error = await response.json();
                setError(`Failed to ${editManga ? 'update' : 'create'} manga: ${error.message || 'Unknown error'}`);
            }
        } catch (err) {
            setError(`Error ${editManga ? 'updating' : 'creating'} manga: ` + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const isEditing = !!editManga;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>{isEditing ? 'Edit Manga' : 'Add New Manga'}</h2>
                    <button className="close-button" onClick={onClose}>&times;</button>
                </div>
                
                <form onSubmit={handleSubmit} className="manga-form">
                    <div className="form-group">
                        <label htmlFor="name">Manga Name *</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            placeholder="Enter manga title"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="volumes">Total Volumes (optional)</label>
                        <input
                            type="number"
                            id="volumes"
                            name="volumes"
                            value={formData.volumes}
                            onChange={handleInputChange}
                            min="1"
                            placeholder="e.g., 42"
                        />
                        <small>Leave empty if unknown or ongoing series</small>
                    </div>

                    <div className="form-group">
                        <label htmlFor="formatId">Format *</label>
                        <div className="select-with-add">
                            <select
                                id="formatId"
                                name="formatId"
                                value={formData.formatId}
                                onChange={handleInputChange}
                                required
                            >
                                <option value="">Select Format</option>
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
                                title="Add new format"
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
                                    placeholder="New format name"
                                    onKeyPress={(e) => e.key === 'Enter' && handleAddFormat()}
                                />
                                <button type="button" onClick={handleAddFormat}>Add</button>
                                <button type="button" onClick={() => setShowAddFormat(false)}>Cancel</button>
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <label htmlFor="publisherId">Publisher *</label>
                        <div className="select-with-add">
                            <select
                                id="publisherId"
                                name="publisherId"
                                value={formData.publisherId}
                                onChange={handleInputChange}
                                required
                            >
                                <option value="">Select Publisher</option>
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
                                title="Add new publisher"
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
                                    placeholder="New publisher name"
                                    onKeyPress={(e) => e.key === 'Enter' && handleAddPublisher()}
                                />
                                <button type="button" onClick={handleAddPublisher}>Add</button>
                                <button type="button" onClick={() => setShowAddPublisher(false)}>Cancel</button>
                            </div>
                        )}
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="cancel-button">
                            Cancel
                        </button>
                        <button type="submit" disabled={isSubmitting} className="submit-button">
                            {isSubmitting ? 
                                (isEditing ? 'Updating...' : 'Creating...') : 
                                (isEditing ? 'Update Manga' : 'Create Manga')
                            }
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddMangaModal;