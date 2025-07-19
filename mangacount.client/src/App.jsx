import { useState, useEffect } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import CollectionView from './components/CollectionView';
import LoadBearingCheck from './components/LoadBearingCheck';
import LoadingSpinner from './components/LoadingSpinner';
import { ThemeProvider } from './contexts/ThemeContext';

function App() {
    const [entries, setEntries] = useState([]);
    const [mangas, setMangas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            setError(null);
            
            await Promise.all([
                loadEntries(),
                loadMangas()
            ]);
        } catch (err) {
            setError('Failed to load data');
            console.error('Error loading data:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const loadEntries = async () => {
        const response = await fetch('/api/entry');
        if (response.ok) {
            const data = await response.json();
            setEntries(data);
        } else {
            throw new Error('Failed to fetch entries');
        }
    };

    const loadMangas = async () => {
        const response = await fetch('/api/manga');
        if (response.ok) {
            const data = await response.json();
            setMangas(data);
        } else {
            throw new Error('Failed to fetch mangas');
        }
    };

    const handleImportSuccess = () => {
        loadData(true); // Reload data after successful import (as refresh)
    };

    // Initial loading screen
    if (loading) {
        return (
            <ThemeProvider>
                <LoadingSpinner 
                    fullScreen 
                    size="large"
                    message="Loading your manga collection..."
                />
            </ThemeProvider>
        );
    }

    // Error screen
    if (error) {
        return (
            <ThemeProvider>
                <div className="app-error">
                    <h2>🚨 Oops! Something went wrong</h2>
                    <p>{error}</p>
                    <button onClick={() => loadData()}>
                        Retry Loading
                    </button>
                </div>
            </ThemeProvider>
        );
    }

    return (
        <ThemeProvider>
            <LoadBearingCheck>
                <div className="app">
                    <div className="app-container">
                        <Sidebar 
                            mangas={mangas} 
                            onImportSuccess={handleImportSuccess}
                            refreshing={refreshing}
                        />
                        <main className="main-content">
                            <CollectionView 
                                entries={entries} 
                                mangas={mangas}
                                loading={refreshing}
                                onRefresh={() => loadData(true)}
                            />
                        </main>
                    </div>
                </div>
            </LoadBearingCheck>
        </ThemeProvider>
    );
}

export default App;