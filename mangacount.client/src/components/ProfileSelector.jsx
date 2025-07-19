import { useState, useEffect } from 'react';
import AddProfileModal from './AddProfileModal';
import './ProfileSelector.css';

const ProfileSelector = ({ 
    onProfileSelect, 
    selectedProfileId, 
    isChangingProfile = false, 
    showBackButton = false,
    onBackToMain 
}) => {
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddProfile, setShowAddProfile] = useState(false);
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [editingProfile, setEditingProfile] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadProfiles();
    }, []);

    const loadProfiles = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/profile');
            if (response.ok) {
                const data = await response.json();
                setProfiles(data);
                
                // FIXED: Only auto-select if NOT changing profiles and no profile is selected
                if (data.length > 0 && !selectedProfileId && !isChangingProfile) {
                    onProfileSelect(data[0]);
                }
            } else {
                throw new Error('Failed to fetch profiles');
            }
        } catch (err) {
            setError('Failed to load profiles');
            console.error('Error loading profiles:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleProfileSelect = (profile) => {
        onProfileSelect(profile);
    };

    const handleProfileCreated = () => {
        loadProfiles();
        setShowAddProfile(false);
    };

    const handleEditProfile = (e, profile) => {
        e.stopPropagation(); // Prevent profile selection when clicking edit
        setEditingProfile(profile);
        setShowEditProfile(true);
    };

    const handleProfileUpdated = () => {
        loadProfiles();
        setShowEditProfile(false);
        setEditingProfile(null);
    };

    const handleDeleteProfile = async (e, profileId) => {
        e.stopPropagation(); // Prevent profile selection when clicking delete
        
        if (profiles.length <= 1) {
            alert('Cannot delete the last profile. You must have at least one profile.');
            return;
        }

        if (window.confirm('Are you sure you want to delete this profile? This action cannot be undone.')) {
            try {
                const response = await fetch(`/api/profile/${profileId}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    loadProfiles();
                } else {
                    alert('Failed to delete profile');
                }
            } catch (error) {
                console.error('Error deleting profile:', error);
                alert('Error deleting profile');
            }
        }
    };

    if (loading) {
        return (
            <div className="profile-selector">
                <div className="profile-selector-header">
                    <h2>👥 Select Profile</h2>
                </div>
                <div className="profiles-loading">
                    <p>Loading profiles...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="profile-selector">
                <div className="profile-selector-header">
                    <h2>👥 Select Profile</h2>
                </div>
                <div className="profiles-error">
                    <p>{error}</p>
                    <button onClick={loadProfiles} className="retry-btn">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="profile-selector">
            <div className="profile-selector-header">
                <div className="header-content">
                    <div className="header-text">
                        <h2>👥 Select Profile</h2>
                        <p>
                            {isChangingProfile 
                                ? 'Switch to a different manga collection' 
                                : 'Choose whose manga collection to manage'
                            }
                        </p>
                    </div>
                    {showBackButton && (
                        <button 
                            className="back-to-main-btn"
                            onClick={onBackToMain}
                            title="Back to collection"
                        >
                            ← Back to Collection
                        </button>
                    )}
                </div>
            </div>

            <div className="profiles-grid">
                {profiles.map(profile => (
                    <div 
                        key={profile.id} 
                        className={`profile-card ${selectedProfileId === profile.id ? 'selected' : ''}`}
                        onClick={() => handleProfileSelect(profile)}
                    >
                        <div className="profile-avatar">
                            {profile.profilePicture ? (
                                <img 
                                    src={profile.profilePicture} 
                                    alt={profile.name}
                                    className="profile-image"
                                />
                            ) : (
                                <div className="profile-placeholder">
                                    {profile.name.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                        <div className="profile-info">
                            <h3 className="profile-name">{profile.name}</h3>
                            <p className="profile-created">
                                Created {new Date(profile.createdDate).toLocaleDateString()}
                            </p>
                        </div>
                        
                        {/* Profile Actions */}
                        <div className="profile-actions">
                            <button
                                className="profile-action-btn edit-btn"
                                onClick={(e) => handleEditProfile(e, profile)}
                                title="Edit profile"
                            >
                                ✏️
                            </button>
                            {profiles.length > 1 && (
                                <button
                                    className="profile-action-btn delete-btn"
                                    onClick={(e) => handleDeleteProfile(e, profile.id)}
                                    title="Delete profile"
                                >
                                    🗑️
                                </button>
                            )}
                        </div>

                        {selectedProfileId === profile.id && (
                            <div className="selected-indicator">✓</div>
                        )}
                    </div>
                ))}

                {/* Add New Profile Card */}
                <div 
                    className="profile-card add-profile-card"
                    onClick={() => setShowAddProfile(true)}
                >
                    <div className="profile-avatar">
                        <div className="add-profile-icon">+</div>
                    </div>
                    <div className="profile-info">
                        <h3 className="profile-name">Add Profile</h3>
                        <p className="profile-created">Create new profile</p>
                    </div>
                </div>
            </div>

            {/* Add Profile Modal */}
            <AddProfileModal 
                isOpen={showAddProfile}
                onClose={() => setShowAddProfile(false)}
                onSuccess={handleProfileCreated}
            />

            {/* Edit Profile Modal */}
            <AddProfileModal 
                isOpen={showEditProfile}
                onClose={() => {
                    setShowEditProfile(false);
                    setEditingProfile(null);
                }}
                onSuccess={handleProfileUpdated}
                editProfile={editingProfile}
            />
        </div>
    );
};

export default ProfileSelector;