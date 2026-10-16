import { useEffect, useState } from 'react';
import './Sidebar.css';
import logo from '../assets/brand/logo.svg';
import AddEntryModal from './AddEntryModal';
import AddMangaModal from './AddMangaModal';
import ThemeToggle from './ThemeToggle';
import { botStatus as fetchBotStatus, isElectron } from '../api/localAdapter.js';

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
    const [collapsed, setCollapsed] = useState(false);
    const [botStatus, setBotStatus] = useState('apagado');

    useEffect(() => {
        if (!isElectron()) return undefined;
        let cancelled = false;
        fetchBotStatus()
            .then((res) => {
                if (!cancelled) setBotStatus(res?.status ?? 'apagado');
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, []);

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
            <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
                <div className="sidebar-header">
                    <div className="brand-row">
                        <img className="brand-logo" src={logo} alt="" />
                        <span className="brand-name">MangaCount</span>
                        <button
                            className="collapse-btn"
                            onClick={() => setCollapsed((c) => !c)}
                            title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
                            aria-label="Colapsar menú"
                        >
                            {collapsed ? '»' : '«'}
                        </button>
                    </div>

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

                <nav className="sidebar-nav">
                    <div className="sidebar-group">
                        <span className="group-label">Colección</span>
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

                    <div className="sidebar-group">
                        <span className="group-label">Biblioteca</span>
                        <h3 className="group-title">Manga Library ({mangas.length})</h3>
                        <div className="manga-list">
                            {mangas.length === 0 ? (
                                <p className="empty-message">No manga in library</p>
                            ) : (
                                mangas.map((manga) => (
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

                    <div className="sidebar-group sidebar-settings">
                        <span className="group-label">App</span>
                        <ThemeToggle />
                        <div className="bot-status" title="Estado del bot de Discord">
                            <span className={`bot-dot ${botStatus}`} />
                            Bot: {botStatus}
                        </div>
                        <button
                            className="action-button settings-open-button"
                            onClick={onOpenSettings}
                            title="Settings"
                            aria-label="Settings"
                        >
                            ⚙️ Settings
                        </button>
                    </div>
                </nav>
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
