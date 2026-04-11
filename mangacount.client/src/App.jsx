import { useState, useEffect, useRef } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import CollectionView from './components/CollectionView';   
import LoadBearingCheck from './components/LoadBearingCheck';
import LoadingSpinner from './components/LoadingSpinner';
import ProfileSelector from './components/ProfileSelector';
import RecommendationModal from './components/RecommendationModal';
import { ThemeProvider } from './contexts/ThemeContext';
import catalog from '@shared/recommendations/catalog.json';
import publisherCountries from '@shared/recommendations/publisher-countries.json';
import { recommendManga } from '@shared/recommendations/recommendationEngine.js';

function App() {
    const [entries, setEntries] = useState([]);
    const [mangas, setMangas] = useState([]);
    const [profiles, setProfiles] = useState([]);
    const [selectedProfile, setSelectedProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [appPhase, setAppPhase] = useState('loading');
    const [isChangingProfile, setIsChangingProfile] = useState(false);
    const [lastSelectedProfile, setLastSelectedProfile] = useState(null);
    const [showRecommendations, setShowRecommendations] = useState(false);
    const [recommendationsLoading, setRecommendationsLoading] = useState(false);
    const [recommendationData, setRecommendationData] = useState(null);
    const [recommendationError, setRecommendationError] = useState(null);
    const recommendationRequestRef = useRef({ controller: null, requestId: 0 });

    useEffect(() => {
        initializeApp();
    }, []);

    useEffect(() => {
        return () => {
            recommendationRequestRef.current.controller?.abort();
        };
    }, []);

    const abortRecommendationRequest = () => {
        recommendationRequestRef.current.controller?.abort();
        recommendationRequestRef.current.controller = null;
        recommendationRequestRef.current.requestId += 1;
    };

    const clearRecommendationState = () => {
        setShowRecommendations(false);
        setRecommendationsLoading(false);
        setRecommendationData(null);
        setRecommendationError(null);
    };

    const initializeApp = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const loadedProfiles = await loadProfiles();
            await loadMangas();
            
            if (loadedProfiles.length === 0) {
                setAppPhase('profile-selection');
            } else if (loadedProfiles.length === 1) {
                const singleProfile = loadedProfiles[0];
                setLastSelectedProfile(singleProfile);
                await handleProfileSelect(singleProfile, true);
            } else {
                const savedProfileId = localStorage.getItem('selectedProfileId');
                const savedProfile = loadedProfiles.find(p => p.id === parseInt(savedProfileId));
                
                if (savedProfile) {
                    setLastSelectedProfile(savedProfile);
                }
                
                setAppPhase('profile-selection');
            }
        } catch (err) {
            setError('Failed to initialize application');
            console.error('Error initializing app:', err);
            setAppPhase('error');
        } finally {
            setLoading(false);
        }
    };

    const loadProfiles = async () => {
        const response = await fetch('/api/profile');
        if (response.ok) {
            const data = await response.json();
            setProfiles(data);
            return data;
        } else {
            throw new Error('Failed to fetch profiles');
        }
    };

    const loadData = async (isRefresh = false) => {
        if (!selectedProfile) return;
        
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            setError(null);
            
            // Load entries for the selected profile
            await loadEntries(selectedProfile.id);
            
            // Reload manga library
            await loadMangas();
        } catch (err) {
            setError('Failed to load data');
            console.error('Error loading data:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const loadEntries = async (profileId) => {
        const response = await fetch(`/api/entry?profileId=${profileId}`);
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

    const handleProfileSelect = async (profile, saveSelection = true) => {
        abortRecommendationRequest();
        clearRecommendationState();
        setSelectedProfile(profile);
        setLastSelectedProfile(profile);
        setIsChangingProfile(false);
        
        try {
            await loadEntries(profile.id);
            
            if (saveSelection) {
                localStorage.setItem('selectedProfileId', profile.id.toString());
            }
            
            setAppPhase('main-app');
        } catch (err) {
            setError('Failed to load profile data');
            console.error('Error loading profile data:', err);
        }
    };

    const handleBackToProfileSelection = () => {
        abortRecommendationRequest();
        clearRecommendationState();
        setIsChangingProfile(true);
        setSelectedProfile(null);
        setEntries([]);
        setAppPhase('profile-selection');
        loadProfiles();
    };

    const handleBackToCollection = () => {
        if (lastSelectedProfile) {
            handleProfileSelect(lastSelectedProfile, false);
        } else {
            setIsChangingProfile(false);
        }
    };

    const handleImportSuccess = () => {
        loadData(true);
    };

    const handleRecommendationClose = () => {
        abortRecommendationRequest();
        clearRecommendationState();
    };

    const handleRecommend = async () => {
        if (!selectedProfile || entries.length === 0) {
            return;
        }

        const activeProfileId = selectedProfile.id;
        const fallbackEntries = entries;

        abortRecommendationRequest();
        recommendationRequestRef.current.controller = new AbortController();
        const { controller, requestId } = {
            controller: recommendationRequestRef.current.controller,
            requestId: recommendationRequestRef.current.requestId,
        };

        setShowRecommendations(true);
        setRecommendationsLoading(true);
        setRecommendationData(null);
        setRecommendationError(null);

        try {
            const response = await fetch(`/api/recommendation?profileId=${activeProfileId}&limit=10`, {
                signal: controller.signal,
            });

            if (!response.ok) {
                throw new Error('Recommendation service unavailable');
            }

            const data = await response.json();

            if (recommendationRequestRef.current.requestId !== requestId) {
                return;
            }

            setRecommendationData(data);

            if (!data?.isConfident) {
                setRecommendationError('Could not infer a country from the current collection.');
            }
        } catch (error) {
            if (controller.signal.aborted || error?.name === 'AbortError') {
                return;
            }

            if (recommendationRequestRef.current.requestId !== requestId) {
                return;
            }

            console.error('Error loading remote recommendations:', error);
            const fallbackData = recommendManga({
                entries: fallbackEntries,
                catalog,
                publisherCountries,
                limit: 10,
            });

            setRecommendationData(fallbackData);

            if (!fallbackData.isConfident) {
                setRecommendationError('Could not infer a country from the current collection.');
            }
        } finally {
            if (recommendationRequestRef.current.requestId === requestId) {
                recommendationRequestRef.current.controller = null;
                setRecommendationsLoading(false);
            }
        }
    };

    if (loading && appPhase === 'loading') {
        return (
            <ThemeProvider>
                <LoadingSpinner 
                    fullScreen 
                    size="large"
                    message="Initializing Manga Collection App..."
                />
            </ThemeProvider>
        );
    }

    if (error || appPhase === 'error') {
        return (
            <ThemeProvider>
                <div className="app-error">
                    <h2>Oops! Something went wrong</h2>
                    <p>{error}</p>
                    <button onClick={() => initializeApp()}>
                        Retry Loading
                    </button>
                </div>
            </ThemeProvider>
        );
    }

    if (appPhase === 'profile-selection') {
        return (
            <ThemeProvider>
                <LoadBearingCheck>
                    <div className="app">
                        <div className="profile-selection-container">
                            <ProfileSelector 
                                onProfileSelect={handleProfileSelect}
                                selectedProfileId={selectedProfile?.id}
                                isChangingProfile={isChangingProfile}
                                showBackButton={isChangingProfile && lastSelectedProfile}
                                onBackToMain={handleBackToCollection}
                                lastSelectedProfile={lastSelectedProfile}
                            />
                        </div>
                    </div>
                </LoadBearingCheck>
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
                            entries={entries}
                            selectedProfile={selectedProfile}
                            onImportSuccess={handleImportSuccess}
                            onBackToProfiles={handleBackToProfileSelection}
                            onRecommend={handleRecommend}
                            recommendationsLoading={recommendationsLoading}
                            refreshing={refreshing}
                        />
                        <main className="main-content">
                            <CollectionView 
                                entries={entries} 
                                mangas={mangas}
                                selectedProfile={selectedProfile}
                                loading={refreshing}
                                onRefresh={() => loadData(true)}
                            />
                        </main>
                        <RecommendationModal
                            isOpen={showRecommendations}
                            isLoading={recommendationsLoading}
                            error={recommendationError}
                            recommendations={recommendationData}
                            onClose={handleRecommendationClose}
                        />
                    </div>
                </div>
            </LoadBearingCheck>
        </ThemeProvider>
    );
}

export default App;