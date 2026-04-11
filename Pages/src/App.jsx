import { useState } from 'react';
import './App.css';
import { ThemeProvider } from './contexts/ThemeContext';
import TSVLoader from './components/TSVLoader';
import Sidebar from './components/Sidebar';
import CollectionView from './components/CollectionView';
import RecommendationModal from './components/RecommendationModal';
import catalog from '@shared/recommendations/catalog.json';
import publisherCountries from '@shared/recommendations/publisher-countries.json';
import { recommendManga } from '@shared/recommendations/recommendationEngine.js';

function App() {
    const [entries, setEntries] = useState(null);
    const [fileName, setFileName] = useState('');
    const [showRecommendations, setShowRecommendations] = useState(false);
    const [recommendationsLoading, setRecommendationsLoading] = useState(false);
    const [recommendationData, setRecommendationData] = useState(null);
    const [recommendationError, setRecommendationError] = useState(null);

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
        setShowRecommendations(false);
        setRecommendationData(null);
        setRecommendationError(null);
    };

    const handleRecommend = () => {
        if (!entries || entries.length === 0) {
            return;
        }

        setShowRecommendations(true);
        setRecommendationsLoading(true);
        setRecommendationError(null);

        const localRecommendations = recommendManga({
            entries,
            catalog,
            publisherCountries,
            limit: 10,
        });

        setRecommendationData(localRecommendations);

        if (!localRecommendations.isConfident) {
            setRecommendationError('Could not infer a country from the current collection.');
        }

        setRecommendationsLoading(false);
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
                        onRecommend={handleRecommend}
                        recommendationsLoading={recommendationsLoading}
                    />
                    <main className="main-content">
                        <CollectionView
                            entries={entries}
                            onUpdateEntry={handleUpdateEntry}
                        />
                    </main>
                    <RecommendationModal
                        isOpen={showRecommendations}
                        isLoading={recommendationsLoading}
                        error={recommendationError}
                        recommendations={recommendationData}
                        onClose={() => setShowRecommendations(false)}
                    />
                </div>
            </div>
        </ThemeProvider>
    );
}

export default App;
