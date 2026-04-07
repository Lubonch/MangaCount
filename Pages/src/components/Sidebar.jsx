import ThemeToggle from './ThemeToggle';
import { serializeTSV } from '../utils/tsv';
import './Sidebar.css';

const Sidebar = ({ entries, fileName, onLoadNew }) => {
    const complete   = entries.filter(e => e.manga.volumes && e.quantity >= e.manga.volumes).length;
    const incomplete = entries.filter(e => !e.manga.volumes || e.quantity < e.manga.volumes).length;
    const priority   = entries.filter(e => e.priority).length;
    const totalVols  = entries.reduce((s, e) => s + e.quantity, 0);

    const handleExport = () => {
        const blob = new Blob([serializeTSV(entries)], { type: 'text/tab-separated-values' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url;
        a.download = fileName || 'Inventario.tsv';
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <h2>🏗️ Manga Count</h2>
                {fileName && (
                    <p className="sidebar-filename">📄 {fileName}</p>
                )}
            </div>

            <div className="sidebar-section">
                <h3>Estadísticas</h3>
                <div className="stats-list">
                    <div className="stat-item">
                        <span className="stat-label">Series totales</span>
                        <span className="stat-value">{entries.length}</span>
                    </div>
                    <div className="stat-item complete">
                        <span className="stat-label">✅ Completas</span>
                        <span className="stat-value">{complete}</span>
                    </div>
                    <div className="stat-item incomplete">
                        <span className="stat-label">❌ Incompletas</span>
                        <span className="stat-value">{incomplete}</span>
                    </div>
                    <div className="stat-item priority">
                        <span className="stat-label">⚡ Prioridad</span>
                        <span className="stat-value">{priority}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">📦 Volúmenes</span>
                        <span className="stat-value">{totalVols}</span>
                    </div>
                </div>
            </div>

            <div className="sidebar-section">
                <h3>Acciones</h3>
                <div className="quick-actions">
                    <button className="action-button export-btn" onClick={handleExport}>
                        ⬇ Exportar TSV
                    </button>
                    <button className="action-button load-btn" onClick={onLoadNew}>
                        📂 Cargar otro TSV
                    </button>
                </div>
            </div>

            <div className="sidebar-section">
                <h3>Tema</h3>
                <ThemeToggle />
            </div>

            <div className="sidebar-section sidebar-demo-note">
                <p>
                    Esta es una demo estática de MangaCount. Los cambios viven en memoria.
                    Exportá el TSV para guardar.
                </p>
                <a
                    href="https://github.com/Lubonch/MangaCount"
                    target="_blank"
                    rel="noreferrer"
                    className="github-link"
                >
                    ⭐ Ver en GitHub
                </a>
            </div>
        </aside>
    );
};

export default Sidebar;
