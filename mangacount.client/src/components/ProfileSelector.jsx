import { useState, useEffect } from 'react';
import AddProfileModal from './AddProfileModal';
import './ProfileSelector.css';

const ProfileSelector = ({ 
    onProfileSelect, 
    selectedProfileId, 
    isChangingProfile = false, 
    showBackButton = false,
    onBackToMain,
    lastSelectedProfile = null
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
                console.log('🔍 Raw profiles data from API:', data);
                
                // Debug each profile's image data
                data.forEach(profile => {
                    console.log(`🖼️ Profile "${profile.name}":`, {
                        id: profile.id,
                        profilePicture: profile.profilePicture,
                        hasImage: !!profile.profilePicture
                    });
                });
                
                setProfiles(data);
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
        e.stopPropagation();
        setEditingProfile(profile);
        setShowEditProfile(true);
    };

    const handleProfileUpdated = () => {
        loadProfiles();
        setShowEditProfile(false);
        setEditingProfile(null);
    };

    const handleDeleteProfile = async (e, profileId) => {
        e.stopPropagation();
        
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

    // Helper function to handle image loading errors
    const handleImageError = (e) => {
        console.error('❌ Failed to load profile image:', {
            src: e.target.src,
            naturalWidth: e.target.naturalWidth,
            naturalHeight: e.target.naturalHeight
        });
        e.target.style.display = 'none';
    };

    // ENHANCED: Helper function to check if image URL is valid with better debugging
    const getImageUrl = (profilePicture) => {
        console.log('🔧 Processing profilePicture:', profilePicture);
        
        if (!profilePicture) {
            console.log('❌ No profilePicture provided');
            return null;
        }
        
        let finalUrl;
        
        // If it's already a full URL, use it
        if (profilePicture.startsWith('http')) {
            finalUrl = profilePicture;
            console.log('🌐 Using full URL:', finalUrl);
        }
        // If it starts with /, it's a relative path from the server
        else if (profilePicture.startsWith('/')) {
            finalUrl = profilePicture;
            console.log('📁 Using relative path:', finalUrl);
        }
        // Otherwise, assume it needs to be prefixed
        else {
            finalUrl = `/profiles/${profilePicture}`;
            console.log('🔧 Generated path:', finalUrl);
        }
        
        // Test if the URL is accessible
        const testUrl = window.location.origin + finalUrl;
        console.log('🧪 Testing full URL:', testUrl);
        
        return finalUrl;
    };

    if (loading) {
        return (
            <div className="profile-selector-fullscreen">
                <div className="profile-selector-content">
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p>Loading profiles...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="profile-selector-fullscreen">
                <div className="profile-selector-content">
                    <div className="error-container">
                        <h2>⚠️ Error Loading Profiles</h2>
                        <p>{error}</p>
                        <button onClick={loadProfiles} className="retry-btn">
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="profile-selector-fullscreen">
            {/* Debug panel - remove this later */}
            <div style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'rgba(0,0,0,0.8)',
                color: 'white',
                padding: '10px',
                borderRadius: '4px',
                fontSize: '12px',
                maxWidth: '300px',
                zIndex: 9999
            }}>
                <strong>🐛 Debug Info:</strong>
                <br />
                Profiles loaded: {profiles.length}
                <br />
                {profiles.map(p => (
                    <div key={p.id}>
                        {p.name}: {p.profilePicture || 'No image'}
                    </div>
                ))}
            </div>

            {/* Back button */}
            {showBackButton && lastSelectedProfile && (
                <button 
                    className="back-to-collection-btn"
                    onClick={onBackToMain}
                    title={`Back to ${lastSelectedProfile.name}'s collection`}
                >
                    ← Back to {lastSelectedProfile.name}'s Collection
                </button>
            )}

            <div className="profile-selector-content">
                <div className="profile-selector-header">
                    <h1 className="main-title">Choose whose manga collection to explore</h1>
                </div>

                <div className="profiles-container">
                    <div className="profiles-circle-grid">
                        {profiles.map(profile => {
                            const imageUrl = getImageUrl(profile.profilePicture);
                            console.log(`🎯 Final URL for ${profile.name}:`, imageUrl);
                            
                            return (
                                <div 
                                    key={profile.id} 
                                    className={`profile-circle ${selectedProfileId === profile.id ? 'selected' : ''}`}
                                >
                                    <div 
                                        className="profile-circle-avatar"
                                        onClick={() => handleProfileSelect(profile)}
                                    >
                                        {/* Always show placeholder */}
                                        <div className="profile-circle-placeholder">
                                            {profile.name.charAt(0).toUpperCase()}
                                        </div>
                                        
                                        {/* Show image on top if available */}
                                        {imageUrl && (
                                            <img 
                                                src={imageUrl} 
                                                alt={profile.name}
                                                className="profile-circle-image"
                                                onError={handleImageError}
                                                onLoad={(e) => {
                                                    console.log('✅ Image loaded successfully:', {
                                                        src: e.target.src,
                                                        naturalWidth: e.target.naturalWidth,
                                                        naturalHeight: e.target.naturalHeight
                                                    });
                                                    // Successfully loaded, hide placeholder
                                                    const placeholder = e.target.previousElementSibling;
                                                    if (placeholder) {
                                                        placeholder.style.opacity = '0';
                                                    }
                                                }}
                                            />
                                        )}
                                    </div>
                                    
                                    <span 
                                        className="profile-circle-name"
                                        onClick={() => handleProfileSelect(profile)}
                                    >
                                        {profile.name}
                                    </span>

                                    <div className="profile-action-buttons">
                                        <button
                                            className="profile-action-btn edit-btn"
                                            onClick={(e) => handleEditProfile(e, profile)}
                                            title="Edit profile"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M14.06 9.02l.92.92L5.92 19H5v-.92l9.06-9.06M17.66 3c-.25 0-.51.1-.7.29l-1.83 1.83 3.75 3.75 1.83-1.83c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.2-.2-.45-.29-.71-.29zm-3.6 3.19L3 17.25V21h3.75L17.81 9.94l-3.75-3.75z"/>
                                            </svg>
                                        </button>

                                        {profiles.length > 1 && (
                                            <button
                                                className="profile-action-btn delete-btn"
                                                onClick={(e) => handleDeleteProfile(e, profile.id)}
                                                title="Delete profile"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14M6 19a2 2 0 002 2h8a2 2 0 002-2V7H6v12z"/>
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Add New Profile Circle */}
                        <div 
                            className="profile-circle add-profile-circle"
                            onClick={() => setShowAddProfile(true)}
                        >
                            <div className="profile-circle-avatar">
                                <div className="add-circle-icon">+</div>
                            </div>
                            <span className="profile-circle-name">Add New</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <AddProfileModal 
                isOpen={showAddProfile}
                onClose={() => setShowAddProfile(false)}
                onSuccess={handleProfileCreated}
            />

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