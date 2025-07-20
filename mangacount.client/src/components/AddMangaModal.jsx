import { useState, useEffect } from 'react';
import './AddMangaModal.css';

const AddMangaModal = ({ 
    isOpen, 
    onClose, 
    onSuccess,
    editManga = null // New prop for editing existing manga
}) => {
    const [formData, setFormData] = useState({
        name: '',
        volumes: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Populate form when editing
    useEffect(() => {
        if (editManga) {
            setFormData({
                name: editManga.name,
                volumes: editManga.volumes ? editManga.volumes.toString() : ''
            });
        } else {
            // Reset form for new manga
            setFormData({
                name: '',
                volumes: ''
            });
        }
        setError('');
    }, [editManga, isOpen]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
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

        try {
            const mangaData = {
                id: editManga ? editManga.id : 0,
                name: formData.name.trim(),
                volumes: formData.volumes ? parseInt(formData.volumes) : null
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
                        volumes: ''
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