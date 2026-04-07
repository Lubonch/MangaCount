import { useRef, useState } from 'react';
import { parseTSV } from '../utils/tsv';
import './TSVLoader.css';

const TSVLoader = ({ onLoaded }) => {
    const inputRef = useRef();
    const [dragging, setDragging] = useState(false);
    const [error, setError] = useState('');

    const handleFile = (file) => {
        if (!file) return;
        if (!file.name.endsWith('.tsv') && file.type !== 'text/tab-separated-values') {
            setError('El archivo debe ser un TSV (.tsv)');
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const entries = parseTSV(e.target.result);
            if (entries.length === 0) {
                setError('El archivo está vacío o no tiene el formato correcto.');
                return;
            }
            setError('');
            onLoaded(entries, file.name);
        };
        reader.readAsText(file, 'UTF-8');
    };

    const onDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        handleFile(e.dataTransfer.files[0]);
    };

    return (
        <div className="tsv-loader-page">
            <div className="tsv-loader-card">
                <div className="tsv-loader-logo">📚</div>
                <h1 className="tsv-loader-title">MangaCount</h1>
                <p className="tsv-loader-subtitle">Demo · sin base de datos</p>

                <div
                    className={`drop-zone ${dragging ? 'dragging' : ''}`}
                    onDragEnter={() => setDragging(true)}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                    onClick={() => inputRef.current.click()}
                >
                    <span className="drop-icon">📂</span>
                    <p className="drop-text">
                        {dragging
                            ? 'Soltá el archivo acá'
                            : 'Arrastrá tu TSV o hacé click para elegir'}
                    </p>
                    <p className="drop-hint">Columnas: Titulo · Comprados · Total · Pendiente · Completa · Prioridad · Formato · Editorial</p>
                    <input
                        ref={inputRef}
                        type="file"
                        accept=".tsv"
                        style={{ display: 'none' }}
                        onChange={(e) => handleFile(e.target.files[0])}
                    />
                </div>

                {error && <p className="tsv-error">{error}</p>}

                <p className="tsv-loader-note">
                    Los cambios viven en memoria. Usá <strong>Exportar TSV</strong> para guardar.
                </p>
            </div>
        </div>
    );
};

export default TSVLoader;
