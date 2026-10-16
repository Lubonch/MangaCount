import { useState } from 'react';
import './Sidebar.css';
import AddEntryModal from './AddEntryModal';
import AddMangaModal from './AddMangaModal';
import ThemeToggle from './ThemeToggle';

const Sidebar = ({
    mangas,
    entries = [],
    selectedProfile,
    onImportSuccess,
    onBackToProfiles,
    onRecommend = () => {},
    onOpenSettings = () => {},
    recommendationsLoading = false,
    refreshing = false
}) => {
    const [showAddEntry, setShowAddEntry] = useState(false);
    const [showAddManga, setShowAddManga] = useState(false);
    const [showEditManga, setShowEditManga] = useState(false);
    const [editingManga, setEditingManga] = useState(null);

    const handleAddSuccess = () => {
        onImportSuccess();
        setShowAddEntry(false);
        setShowAddManga(false);
        setShowEditManga(false);
        setEditingManga(null);
    };

    const handleEditManga = (manga) => {
        setEditingManga(manga);
        setShowEditManga(true);
    };

    return (
        <>
            <aside className="sidebar">
                <div className="sidebar-header">
                    <h2>🏗️ Manga Count</h2>

                    {/* Profile Info Section */}
                    {selectedProfile && (
                        <div className="current-profile-info">
                            <div className="profile-display">
                                <div className="profile-avatar-small">
                                    {selectedProfile.profilePicture ? (
                                        <img
                                            src={selectedProfile.profilePicture}
                                            alt={selectedProfile.name}
                                            className="profile-image-small"
                                        />
                                    ) : (
                                        <div className="profile-placeholder-small">
                                            {selectedProfile.name.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="profile-text">
                                    <span className="profile-name-small">{selectedProfile.name}</span>
                                    <span className="profile-subtitle">Collection</span>
                                </div>
                            </div>
                            <button
                                className="change-profile-btn"
                                onClick={onBackToProfiles}
                                title="Change profile"
                            >
                                👥
                            </button>
                        </div>
                    )}
                </div>

                <div className="sidebar-section">
                    <h3>Theme</h3>
                    <ThemeToggle />
                </div>

                <div className="sidebar-section">
                    <h3>Quick Actions</h3>
                    <div className="quick-actions">
                        <button
                            className="action-button add-entry"
                            onClick={() => setShowAddEntry(true)}
                            disabled={!selectedProfile}
                        >
                            + Add Entry
                        </button>
                        <button
                            className="action-button add-manga"
                            onClick={() => setShowAddManga(true)}
                        >
                            + Add Manga
                        </button>
                        <button
                            className="action-button recommend"
                            onClick={onRecommend}
                            disabled={!selectedProfile || entries.length === 0 || recommendationsLoading}
                        >
                            {recommendationsLoading ? 'Thinking...' : 'Recommendations'}
                        </button>
                    </div>
                </div>

                <div className="sidebar-section">
                    <h3>Manga Library ({mangas.length})</h3>
                    <div className="manga-list">
                        {mangas.length === 0 ? (
                            <p className="empty-message">No manga in library</p>
                        ) : (
                            mangas.map(manga => (
                                <div key={manga.id} className="manga-item">
                                    <div className="manga-info">
                                        <div className="manga-name">{manga.name}</div>
                                        {manga.volumes && (
                                            <div className="manga-volumes">{manga.volumes} volumes</div>
                                        )}
                                    </div>
                                    <button
                                        className="edit-manga-btn-sidebar"
                                        onClick={() => handleEditManga(manga)}
                                        title="Edit manga info"
                                    >
                                        ✏️
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Acceso a Settings (antes acá estaba la Danger Zone, ahora dentro de Settings) */}
                <div className="sidebar-section sidebar-settings">
                    <button
                        className="action-button settings-open-button"
                        onClick={onOpenSettings}
                        title="Settings"
                        aria-label="Settings"
                    >
                        ⚙️ Settings
                    </button>
                </div>
            </aside>

            <AddEntryModal
                isOpen={showAddEntry}
                onClose={() => setShowAddEntry(false)}
                mangas={mangas}
                selectedProfile={selectedProfile}
                onSuccess={handleAddSuccess}
            />

            <AddMangaModal
                isOpen={showAddManga}
                onClose={() => setShowAddManga(false)}
                onSuccess={handleAddSuccess}
            />

            <AddMangaModal
                isOpen={showEditManga}
                onClose={() => {
                    setShowEditManga(false);
                    setEditingManga(null);
                }}
                onSuccess={handleAddSuccess}
                editManga={editingManga}
            />
        </>
    );
};

export default Sidebar;