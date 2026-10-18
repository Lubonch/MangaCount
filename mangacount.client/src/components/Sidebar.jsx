import { useEffect, useState } from 'react';
import './Sidebar.css';
import logo from '../assets/brand/logo.svg';
import AddEntryModal from './AddEntryModal';
import AddMangaModal from './AddMangaModal';
import LinkCoverModal from './LinkCoverModal';
import ThemeToggle from './ThemeToggle';
import { useT } from '../contexts/I18nContext';
import { botStatus as fetchBotStatus, isElectron, mangaDelete } from '../api/localAdapter.js';

const Sidebar = ({
    mangas,
    entries = [],
    selectedProfile,
    onImportSuccess,
    onBackToProfiles,
    onRecommend = () => {},
    onOpenSettings = () => {},
    recommendationsLoading = false,
    refreshing = false,
    showAdultCovers = false
}) => {
    const t = useT();
    const [showAddEntry, setShowAddEntry] = useState(false);
    const [showAddManga, setShowAddManga] = useState(false);
    const [showEditManga, setShowEditManga] = useState(false);
    const [editingManga, setEditingManga] = useState(null);
    const [collapsed, setCollapsed] = useState(false);
    const [botStatus, setBotStatus] = useState('apagado');
    const [coverTarget, setCoverTarget] = useState(null);
    const [mangaFilter, setMangaFilter] = useState('');

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

    const normalizedFilter = mangaFilter.trim().toLowerCase();
    const filteredMangas = normalizedFilter
        ? mangas.filter((manga) => manga.name.toLowerCase().includes(normalizedFilter))
        : mangas;

    const handleDeleteManga = async (manga) => {
        const ok = window.confirm(
            `¿Eliminar "${manga.name}"?\n\nSe borra el manga y sus entradas de la colección (todos los perfiles).`
        );
        if (!ok) return;
        try {
            await mangaDelete(manga.id);
            onImportSuccess?.();
        } catch (err) {
            console.error('Error deleting manga:', err);
        }
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
                            title={t(collapsed ? 'sidebar.expand' : 'sidebar.collapse')}
                            aria-label={t('sidebar.collapse')}
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
                                    <span className="profile-subtitle">{t('sidebar.collection')}</span>
                                </div>
                            </div>
                            <button
                                className="change-profile-btn"
                                onClick={onBackToProfiles}
                                title={t('sidebar.changeProfile')}
                            >
                                👥
                            </button>
                        </div>
                    )}
                </div>

                <nav className="sidebar-nav">
                    <div className="sidebar-group">
                        <span className="group-label">{t('sidebar.groupCollection')}</span>
                        <div className="quick-actions">
                            <button
                                className="action-button add-entry"
                                onClick={() => setShowAddEntry(true)}
                                disabled={!selectedProfile}
                            >
                                {t('sidebar.addEntry')}
                            </button>
                            <button
                                className="action-button add-manga"
                                onClick={() => setShowAddManga(true)}
                            >
                                {t('sidebar.addManga')}
                            </button>
                            <button
                                className="action-button recommend"
                                onClick={onRecommend}
                                disabled={!selectedProfile || entries.length === 0 || recommendationsLoading}
                            >
                                {t(recommendationsLoading ? 'sidebar.thinking' : 'sidebar.recommendations')}
                            </button>
                        </div>
                    </div>

                    <div className="sidebar-group sidebar-library">
                        <span className="group-label">{t('sidebar.groupLibrary')}</span>
                        <h3 className="group-title">
                            {filteredMangas.length !== mangas.length
                                ? t('sidebar.libraryTitleFiltered', { shown: filteredMangas.length, total: mangas.length })
                                : t('sidebar.libraryTitle', { count: filteredMangas.length })}
                        </h3>
                        {mangas.length > 0 && (
                            <input
                                type="search"
                                className="manga-search"
                                placeholder={t('sidebar.searchPlaceholder')}
                                value={mangaFilter}
                                onChange={(e) => setMangaFilter(e.target.value)}
                                aria-label={t('sidebar.searchAria')}
                            />
                        )}
                        <div className="manga-list">
                            {mangas.length === 0 ? (
                                <p className="empty-message">{t('sidebar.noManga')}</p>
                            ) : filteredMangas.length === 0 ? (
                                <p className="empty-message">{t('sidebar.noMatches')}</p>
                            ) : (
                                filteredMangas.map((manga) => (
                                    <div key={manga.id} className="manga-item">
                                        <div className="manga-info">
                                            <div className="manga-name">{manga.name}</div>
                                            {manga.volumes && (
                                                <div className="manga-volumes">{t('sidebar.volumes', { count: manga.volumes })}</div>
                                            )}
                                        </div>
                                        <div className="manga-actions">
                                            <button
                                                className="edit-manga-btn-sidebar"
                                                onClick={() => setCoverTarget(manga)}
                                                title={t('sidebar.coverSearch')}
                                                aria-label={t('sidebar.coverSearchAria', { name: manga.name })}
                                            >
                                                🖼️
                                            </button>
                                            <button
                                                className="edit-manga-btn-sidebar"
                                                onClick={() => handleEditManga(manga)}
                                                title={t('sidebar.editManga')}
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                className="edit-manga-btn-sidebar delete-manga-btn-sidebar"
                                                onClick={() => handleDeleteManga(manga)}
                                                title={t('sidebar.deleteManga')}
                                                aria-label={`Eliminar ${manga.name}`}
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="sidebar-group sidebar-settings">
                        <span className="group-label">{t('sidebar.groupApp')}</span>
                        <ThemeToggle />
                        <div className="bot-status" title={t('sidebar.botTitle')}>
                            <span className={`bot-dot ${botStatus}`} />
                            {t('sidebar.botStatus', { status: botStatus })}
                        </div>
                        <button
                            className="action-button settings-open-button"
                            onClick={onOpenSettings}
                            title={t('sidebar.settings')}
                            aria-label={t('sidebar.settings')}
                        >
                            ⚙️ {t('sidebar.settings')}
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

            {coverTarget && (
                <LinkCoverModal
                    manga={coverTarget}
                    onClose={() => setCoverTarget(null)}
                    onLinked={() => onImportSuccess?.()}
                    showAdultCovers={showAdultCovers}
                />
            )}
        </>
    );
};

export default Sidebar;
