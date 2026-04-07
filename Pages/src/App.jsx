import { useState } from 'react';
import './App.css';
import { ThemeProvider } from './contexts/ThemeContext';
import TSVLoader from './components/TSVLoader';
import Sidebar from './components/Sidebar';
import CollectionView from './components/CollectionView';

function App() {
    const [entries, setEntries] = useState(null);
    const [fileName, setFileName] = useState('');

    const handleLoaded = (parsed, name) => {
        setEntries(parsed);
        setFileName(name);
    };

    const handleUpdateEntry = (id, changes) => {
        setEntries(prev => prev.map(e =>
            e.id === id
                ? {
                    ...e,
                    ...changes,
                    // recalculate nothing special — CollectionView derives status from quantity/volumes
                  }
                : e
        ));
    };

    const handleLoadNew = () => {
        setEntries(null);
        setFileName('');
    };

    if (!entries) {
        return (
            <ThemeProvider>
                <div className="app">
                    <TSVLoader onLoaded={handleLoaded} />
                </div>
            </ThemeProvider>
        );
    }

    return (
        <ThemeProvider>
            <div className="app">
                <div className="app-container">
                    <Sidebar
                        entries={entries}
                        fileName={fileName}
                        onLoadNew={handleLoadNew}
                    />
                    <main className="main-content">
                        <CollectionView
                            entries={entries}
                            onUpdateEntry={handleUpdateEntry}
                        />
                    </main>
                </div>
            </div>
        </ThemeProvider>
    );
}

export default App;
