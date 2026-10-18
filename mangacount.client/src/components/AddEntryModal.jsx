import { useState, useEffect } from 'react';
import './AddEntryModal.css';
import { useT } from '../contexts/I18nContext';

const AddEntryModal = ({ 
    isOpen, 
    onClose, 
    mangas, 
    onSuccess, 
    editEntry = null,
    selectedProfile
}) => {
    const t = useT();
    const [formData, setFormData] = useState({
        mangaId: '',
        quantity: '',
        pending: '',
        priority: false
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (editEntry) {
            setFormData({
                mangaId: editEntry.mangaId.toString(),
                quantity: editEntry.quantity.toString(),
                pending: editEntry.pending || '',
                priority: editEntry.priority || false
            });
        } else {
            setFormData({
                mangaId: '',
                quantity: '',
                pending: '',
                priority: false
            });
        }
        setError('');
    }, [editEntry, isOpen]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        if (!formData.mangaId || !formData.quantity) {
            setError(t('addEntry.errSelect'));
            setIsSubmitting(false);
            return;
        }

        const profileId = editEntry?.profileId ?? selectedProfile?.id;

        if (!profileId) {
            setError(t('addEntry.errProfile'));
            setIsSubmitting(false);
            return;
        }

        try {
            const selectedManga = mangas.find(m => m.id === parseInt(formData.mangaId));
            const entryData = {
                id: editEntry ? editEntry.id : 0,
                manga: selectedManga,
                mangaId: parseInt(formData.mangaId),
                profileId,
                quantity: parseInt(formData.quantity),
                pending: formData.pending || null,
                priority: formData.priority
            };

            // Always use POST - the service determines create vs update based on ID
            const response = await fetch('/api/entry', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(entryData)
            });

            if (response.ok) {
                onSuccess();
                onClose();
                if (!editEntry) {
                    setFormData({
                        mangaId: '',
                        quantity: '',
                        pending: '',
                        priority: false
                    });
                }
            } else {
                const error = await response.json();
                setError(t(editEntry ? 'addEntry.errUpdate' : 'addEntry.errCreate', { message: error.message || t('addEntry.unknownError') }));
            }
        } catch (err) {
            setError(t(editEntry ? 'addEntry.errNetUpdate' : 'addEntry.errNetCreate', { message: err.message }));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const isEditing = !!editEntry;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>{t(isEditing ? 'addEntry.titleEdit' : 'addEntry.titleCreate')}</h2>
                    <button className="close-button" onClick={onClose}>&times;</button>
                </div>
                
                <form onSubmit={handleSubmit} className="entry-form">
                    <div className="form-group">
                        <label htmlFor="mangaId">{t('addEntry.mangaLabel')}</label>
                        <select
                            id="mangaId"
                            name="mangaId"
                            value={formData.mangaId}
                            onChange={handleInputChange}
                            required
                            disabled={isEditing}
                        >
                            <option value="">{t('addEntry.selectManga')}</option>
                            {mangas.map(manga => (
                                <option key={manga.id} value={manga.id}>
                                    {manga.name} {manga.volumes ? `(${manga.volumes} volumes)` : ''}
                                </option>
                            ))}
                        </select>
                        {isEditing && (
                            <small>{t('addEntry.mangaLocked')}</small>
                        )}
                    </div>

                    <div className="form-group">
                        <label htmlFor="quantity">{t('addEntry.quantityLabel')}</label>
                        <div className="quantity-input-group">
                            <input
                                type="number"
                                id="quantity"
                                name="quantity"
                                value={formData.quantity}
                                onChange={handleInputChange}
                                min="0"
                                max={editEntry?.manga?.volumes || 999}
                                required
                            />
                            {isEditing && editEntry.manga.volumes > 0 && (
                                <div className="quick-actions">
                                    <button
                                        type="button"
                                        className="quick-btn minus"
                                        onClick={() => setFormData(prev => ({
                                            ...prev,
                                            quantity: Math.max(0, parseInt(prev.quantity) - 1).toString()
                                        }))}
                                        disabled={parseInt(formData.quantity) <= 0}
                                    >
                                        -1
                                    </button>
                                    <button
                                        type="button"
                                        className="quick-btn plus"
                                        onClick={() => setFormData(prev => ({
                                            ...prev,
                                            quantity: Math.min(editEntry.manga.volumes, parseInt(prev.quantity) + 1).toString()
                                        }))}
                                        disabled={parseInt(formData.quantity) >= editEntry.manga.volumes}
                                    >
                                        +1
                                    </button>
                                </div>
                            )}
                        </div>
                        {editEntry?.manga?.volumes > 0 && (
                            <small>
                                {t('addEntry.volumesCount', { owned: formData.quantity, total: editEntry.manga.volumes })}{' '}
                                {t('addEntry.percentComplete', { percent: Math.round((formData.quantity / editEntry.manga.volumes) * 100) })}
                            </small>
                        )}
                    </div>

                    <div className="form-group">
                        <label htmlFor="pending">{t('addEntry.pendingLabel')}</label>
                        <input
                            type="text"
                            id="pending"
                            name="pending"
                            value={formData.pending}
                            onChange={handleInputChange}
                            placeholder={t('addEntry.pendingPlaceholder')}
                        />
                    </div>

                    <div className="form-group checkbox-group">
                        <label htmlFor="priority">
                            <input
                                type="checkbox"
                                id="priority"
                                name="priority"
                                checked={formData.priority}
                                onChange={handleInputChange}
                            />
                            {t('addEntry.priority')}
                        </label>
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="cancel-button">
                            {t('addEntry.cancel')}
                        </button>
                        <button type="submit" disabled={isSubmitting} className="submit-button">
                            {isSubmitting
                                ? t(isEditing ? 'addEntry.submittingUpdate' : 'addEntry.submittingCreate')
                                : t(isEditing ? 'addEntry.submitUpdate' : 'addEntry.submitCreate')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddEntryModal;