import { useState } from 'react';
import './Sidebar.css';
import AddEntryModal from './AddEntryModal';
import AddMangaModal from './AddMangaModal';
import ThemeToggle from './ThemeToggle';

const Sidebar = ({ mangas, onImportSuccess }) => {
    const [isImporting, setIsImporting] = useState(false);
    const [importMessage, setImportMessage] = useState('');
    const [showAddEntry, setShowAddEntry] = useState(false);
    const [showAddManga, setShowAddManga] = useState(false);
    const [showEditManga, setShowEditManga] = useState(false);
    const [editingManga, setEditingManga] = useState(null);

    const handleFileImport = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.name.endsWith('.tsv')) {
            setImportMessage('Please select a TSV file');
            return;
        }

        setIsImporting(true);
        setImportMessage('Importing file...');

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/entry/import', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const result = await response.json();
                setImportMessage('Import successful!');
                onImportSuccess();
                event.target.value = '';
                setTimeout(() => setImportMessage(''), 3000);
            } else {
                const error = await response.json();
                setImportMessage(`Import failed: ${error.message || 'Unknown error'}`);
            }
        } catch (error) {
            setImportMessage('Import failed: ' + error.message);
        } finally {
            setIsImporting(false);
        }
    };

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
                        >
                            + Add Entry
                        </button>
                        <button 
                            className="action-button add-manga"
                            onClick={() => setShowAddManga(true)}
                        >
                            + Add Manga
                        </button>
                    </div>
                </div>

                <div className="sidebar-section">
                    <h3>Import Collection</h3>
                    <div className="import-section">
                        <input
                            type="file"
                            accept=".tsv"
                            onChange={handleFileImport}
                            disabled={isImporting}
                            className="file-input"
                            id="tsv-import"
                        />
                        <label htmlFor="tsv-import" className="file-input-label">
                            {isImporting ? 'Importing...' : 'Choose TSV File'}
                        </label>
                        {importMessage && (
                            <p className={`import-message ${
                                importMessage.includes('failed') ? 'error' : 
                                importMessage.includes('successful') ? 'success' : ''
                            }`}>
                                {importMessage}
                            </p>
                        )}
                        <div className="import-help">
                            <small>
                                Upload a TSV file with columns:<br/>
                                Name | Quantity | Total Volumes | Pending | | Priority
                            </small>
                        </div>
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
            </aside>

            <AddEntryModal 
                isOpen={showAddEntry}
                onClose={() => setShowAddEntry(false)}
                mangas={mangas}
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