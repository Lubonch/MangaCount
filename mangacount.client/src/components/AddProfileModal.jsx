import { useState, useEffect } from 'react';
import './AddProfileModal.css';
import { useT } from '../contexts/I18nContext';

const AddProfileModal = ({ 
    isOpen, 
    onClose, 
    onSuccess,
    editProfile = null 
}) => {
    const t = useT();
    const [formData, setFormData] = useState({
        name: '',
        profilePicture: null
    });
    const [previewImage, setPreviewImage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (editProfile) {
            setFormData({
                name: editProfile.name,
                profilePicture: null
            });
            setPreviewImage(editProfile.profilePicture || '');
        } else {
            setFormData({
                name: '',
                profilePicture: null
            });
            setPreviewImage('');
        }
        setError('');
    }, [editProfile, isOpen]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({
                ...prev,
                profilePicture: file
            }));

            const reader = new FileReader();
            reader.onload = (e) => setPreviewImage(e.target.result);
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        if (!formData.name.trim()) {
            setError(t('addProfile.errName'));
            setIsSubmitting(false);
            return;
        }

        try {
            const profileData = {
                id: editProfile ? editProfile.id : 0,
                name: formData.name.trim(),
                profilePicture: editProfile ? editProfile.profilePicture : null,
                createdDate: editProfile ? editProfile.createdDate : new Date().toISOString(),
                isActive: true
            };

            const response = await fetch('/api/profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(profileData)
            });

            if (response.ok) {
                if (formData.profilePicture) {
                    const profileId = editProfile ? editProfile.id : await getLatestProfileId();
                    await uploadProfilePicture(profileId, formData.profilePicture);
                }

                onSuccess();
                if (!editProfile) {
                    setFormData({ name: '', profilePicture: null });
                    setPreviewImage('');
                }
            } else {
                const error = await response.json();
                setError(t(editProfile ? 'addProfile.errUpdate' : 'addProfile.errCreate', { message: error.message || t('addProfile.unknownError') }));
            }
        } catch (err) {
            setError(t(editProfile ? 'addProfile.errNetUpdate' : 'addProfile.errNetCreate', { message: err.message }));
        } finally {
            setIsSubmitting(false);
        }
    };

    const getLatestProfileId = async () => {
        try {
            const response = await fetch('/api/profile');
            if (response.ok) {
                const profiles = await response.json();
                return profiles[profiles.length - 1]?.id || 1;
            }
        } catch (error) {
            console.error('Error getting latest profile ID:', error);
        }
        return 1;
    };

    const uploadProfilePicture = async (profileId, file) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`/api/profile/upload-picture/${profileId}`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Failed to upload profile picture');
        }
    };

    if (!isOpen) return null;

    const isEditing = !!editProfile;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>{t(isEditing ? 'addProfile.titleEdit' : 'addProfile.titleCreate')}</h2>
                    <button className="close-button" onClick={onClose}>&times;</button>
                </div>
                
                <form onSubmit={handleSubmit} className="profile-form">
                    <div className="form-group profile-picture-group">
                        <label>{t('addProfile.pictureLabel')}</label>
                        <div className="picture-input-container">
                            <div className="picture-preview">
                                {previewImage ? (
                                    <img src={previewImage} alt="Preview" className="preview-image" />
                                ) : (
                                    <div className="preview-placeholder">
                                        {formData.name ? formData.name.charAt(0).toUpperCase() : '?'}
                                    </div>
                                )}
                            </div>
                            <div className="picture-input-controls">
                                <input
                                    type="file"
                                    id="profilePicture"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="file-input"
                                />
                                <label htmlFor="profilePicture" className="file-input-label">
                                    {t(previewImage ? 'addProfile.changePicture' : 'addProfile.uploadPicture')}
                                </label>
                                {previewImage && (
                                    <button
                                        type="button"
                                        className="remove-picture-btn"
                                        onClick={() => {
                                            setPreviewImage('');
                                            setFormData(prev => ({ ...prev, profilePicture: null }));
                                        }}
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                        </div>
                        <small>{t('addProfile.pictureHint')}</small>
                    </div>

                    <div className="form-group">
                        <label htmlFor="name">{t('addProfile.nameLabel')}</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            placeholder={t('addProfile.namePlaceholder')}
                            required
                        />
                        <small>{t('addProfile.nameHint')}</small>
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="cancel-button">
                            {t('addProfile.cancel')}
                        </button>
                        <button type="submit" disabled={isSubmitting} className="submit-button">
                            {isSubmitting
                                ? t(isEditing ? 'addProfile.submittingUpdate' : 'addProfile.submittingCreate')
                                : t(isEditing ? 'addProfile.submitUpdate' : 'addProfile.submitCreate')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddProfileModal;