import { useState, useEffect } from 'react';
import './AddProfileModal.css';

const AddProfileModal = ({ 
    isOpen, 
    onClose, 
    onSuccess,
    editProfile = null 
}) => {
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

            // Create preview
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
            setError('Please enter a profile name');
            setIsSubmitting(false);
            return;
        }

        try {
            // First, create/update the profile
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
                // If there's a new image, upload it
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
                setError(`Failed to ${editProfile ? 'update' : 'create'} profile: ${error.message || 'Unknown error'}`);
            }
        } catch (err) {
            setError(`Error ${editProfile ? 'updating' : 'creating'} profile: ` + err.message);
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
                    <h2>{isEditing ? 'Edit Profile' : 'Create New Profile'}</h2>
                    <button className="close-button" onClick={onClose}>&times;</button>
                </div>
                
                <form onSubmit={handleSubmit} className="profile-form">
                    <div className="form-group profile-picture-group">
                        <label>Profile Picture (optional)</label>
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
                                    {previewImage ? 'Change Picture' : 'Upload Picture'}
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
                        <small>Recommended: Square image, at least 200x200 pixels</small>
                    </div>

                    <div className="form-group">
                        <label htmlFor="name">Profile Name *</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            placeholder="e.g., Your Name, Brother's Collection"
                            required
                        />
                        <small>This name will be displayed on the profile selector</small>
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="cancel-button">
                            Cancel
                        </button>
                        <button type="submit" disabled={isSubmitting} className="submit-button">
                            {isSubmitting ? 
                                (isEditing ? 'Updating...' : 'Creating...') : 
                                (isEditing ? 'Update Profile' : 'Create Profile')
                            }
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddProfileModal;