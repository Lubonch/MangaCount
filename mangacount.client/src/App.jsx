import { useState, useEffect } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import CollectionView from './components/CollectionView';   
import LoadBearingCheck from './components/LoadBearingCheck';
import LoadingSpinner from './components/LoadingSpinner';
import ProfileSelector from './components/ProfileSelector';
import { ThemeProvider } from './contexts/ThemeContext';

function App() {
    const [entries, setEntries] = useState([]);
    const [mangas, setMangas] = useState([]);
    const [profiles, setProfiles] = useState([]);
    const [selectedProfile, setSelectedProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [appPhase, setAppPhase] = useState('loading'); // loading, profile-selection, main-app
    const [isChangingProfile, setIsChangingProfile] = useState(false); // NEW: Track when user is changing profiles

    useEffect(() => {
        initializeApp();
    }, []);

    const initializeApp = async () => {
        try {
            setLoading(true);
            setError(null);
            
            // First, load profiles and check if any exist
            const loadedProfiles = await loadProfiles();
            
            // Load manga library (shared across profiles)
            await loadMangas();
            
            // Check if we have profiles
            if (loadedProfiles.length === 0) {
                // No profiles exist, force profile creation
                setAppPhase('profile-selection');
            } else {
                // Profiles exist, check if user had a previously selected profile
                const savedProfileId = localStorage.getItem('selectedProfileId');
                const savedProfile = loadedProfiles.find(p => p.id === parseInt(savedProfileId));
                
                if (savedProfile) {
                    // Auto-load the previously selected profile
                    await handleProfileSelect(savedProfile, false);
                } else {
                    // No saved profile, show selection
                    setAppPhase('profile-selection');
                }
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
        setSelectedProfile(profile);
        setIsChangingProfile(false);
        
        try {
            // Load entries for the selected profile
            await loadEntries(profile.id);
            
            // Save selection to localStorage for next session
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
        setIsChangingProfile(true); // Mark that user is actively changing profiles
        setSelectedProfile(null);
        setEntries([]);
        setAppPhase('profile-selection');
        // Reload profiles in case new ones were added
        loadProfiles();
    };

    const handleImportSuccess = () => {
        loadData(true); // Reload data after successful import (as refresh)
    };

    // Initial loading screen
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

    // Error screen
    if (error || appPhase === 'error') {
        return (
            <ThemeProvider>
                <div className="app-error">
                    <h2>🚨 Oops! Something went wrong</h2>
                    <p>{error}</p>
                    <button onClick={() => initializeApp()}>
                        Retry Loading
                    </button>
                </div>
            </ThemeProvider>
        );
    }

    // Profile selection screen
    if (appPhase === 'profile-selection') {
        return (
            <ThemeProvider>
                <LoadBearingCheck>
                    <div className="app">
                        <div className="profile-selection-container">
                            <ProfileSelector 
                                onProfileSelect={handleProfileSelect}
                                selectedProfileId={selectedProfile?.id}
                                isChangingProfile={isChangingProfile} // Pass this flag
                                showBackButton={isChangingProfile} // Show back button when changing
                                onBackToMain={() => {
                                    setIsChangingProfile(false);
                                    setAppPhase('main-app');
                                }}
                            />
                        </div>
                    </div>
                </LoadBearingCheck>
            </ThemeProvider>
        );
    }

    // Main application
    return (
        <ThemeProvider>
            <LoadBearingCheck>
                <div className="app">
                    <div className="app-container">
                        <Sidebar 
                            mangas={mangas} 
                            selectedProfile={selectedProfile}
                            onImportSuccess={handleImportSuccess}
                            onBackToProfiles={handleBackToProfileSelection}
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
                    </div>
                </div>
            </LoadBearingCheck>
        </ThemeProvider>
    );
}

export default App;