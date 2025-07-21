import { useState, useEffect } from 'react';
import './NukeDataModal.css';

const NukeDataModal = ({ isOpen, onClose, onSuccess }) => {
    const [step, setStep] = useState(1);
    const [statistics, setStatistics] = useState(null);
    const [confirmationText, setConfirmationText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const REQUIRED_TEXT = "DELETE ALL DATA";
    const TOTAL_STEPS = 3;

    useEffect(() => {
        if (isOpen) {
            loadStatistics();
            setStep(1);
            setConfirmationText('');
            setError('');
        }
    }, [isOpen]);

    const loadStatistics = async () => {
        try {
            const response = await fetch('/api/database/statistics');
            if (response.ok) {
                const data = await response.json();
                setStatistics(data);
            }
        } catch (err) {
            console.error('Error loading statistics:', err);
        }
    };

    const handleNext = () => {
        if (step < TOTAL_STEPS) {
            setStep(step + 1);
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setStep(step - 1);
        }
    };

    const handleFinalNuke = async () => {
        if (confirmationText !== REQUIRED_TEXT) {
            setError('You must type exactly "DELETE ALL DATA" to proceed');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const response = await fetch('/api/database/nuke', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    isConfirmed: true,
                    confirmationText: confirmationText
                })
            });

            if (response.ok) {
                onSuccess();
                onClose();
            } else {
                const error = await response.json();
                setError(error.message || 'Failed to clear database');
            }
        } catch (err) {
            setError('Error clearing database: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay nuke-modal-overlay">
            <div className="modal-content nuke-modal-content">
                <div className="modal-header nuke-modal-header">
                    <h2>⚠️ Nuclear Option - Clear All Data</h2>
                    <button className="close-button" onClick={onClose}>&times;</button>
                </div>

                <div className="nuke-modal-body">
                    <div className="progress-indicator">
                        <div className="progress-steps">
                            {[1, 2, 3].map((stepNum) => (
                                <div 
                                    key={stepNum} 
                                    className={`progress-step ${step >= stepNum ? 'active' : ''} ${step > stepNum ? 'completed' : ''}`}
                                >
                                    {stepNum}
                                </div>
                            ))}
                        </div>
                        <div className="progress-bar">
                            <div 
                                className="progress-fill" 
                                style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
                            ></div>
                        </div>
                    </div>

                    {step === 1 && (
                        <div className="confirmation-step">
                            <h3>🚨 WARNING: This action cannot be undone!</h3>
                            <div className="warning-content">
                                <p>You are about to permanently delete ALL data from the database:</p>
                                {statistics && (
                                    <div className="data-summary">
                                        <div className="data-item">📚 <strong>{statistics.totalManga}</strong> manga entries</div>
                                        <div className="data-item">📖 <strong>{statistics.totalEntries}</strong> reading entries</div>
                                        <div className="data-item">👤 <strong>{statistics.totalProfiles}</strong> user profiles</div>
                                        <div className="data-item">📋 <strong>{statistics.totalFormats}</strong> formats</div>
                                        <div className="data-item">🏢 <strong>{statistics.totalPublishers}</strong> publishers</div>
                                    </div>
                                )}
                                <div className="consequences">
                                    <h4>Consequences:</h4>
                                    <ul>
                                        <li>All manga and reading progress will be lost</li>
                                        <li>All user profiles will be deactivated</li>
                                        <li>Custom formats and publishers will be removed (except defaults)</li>
                                        <li>You will need to re-import or recreate all data</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="confirmation-step">
                            <h3>🔥 Are you absolutely sure?</h3>
                            <div className="warning-content">
                                <p>This will <strong>permanently delete everything</strong> in your manga collection database.</p>
                                <div className="final-warning">
                                    <p>⚠️ <strong>There is NO way to recover this data once deleted!</strong></p>
                                    <p>Consider backing up your database before proceeding.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="confirmation-step">
                            <h3>💥 Final Confirmation</h3>
                            <div className="warning-content">
                                <p>Type <strong>{REQUIRED_TEXT}</strong> to confirm you want to delete all data:</p>
                                <input
                                    type="text"
                                    value={confirmationText}
                                    onChange={(e) => setConfirmationText(e.target.value)}
                                    placeholder={REQUIRED_TEXT}
                                    className={`confirmation-input ${confirmationText === REQUIRED_TEXT ? 'valid' : ''}`}
                                    autoFocus
                                />
                                <p className="type-hint">Type exactly: <code>{REQUIRED_TEXT}</code></p>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="error-message">{error}</div>
                    )}
                </div>

                <div className="modal-actions nuke-modal-actions">
                    <button type="button" onClick={onClose} className="cancel-button">
                        Cancel
                    </button>
                    
                    {step > 1 && step < TOTAL_STEPS && (
                        <button type="button" onClick={handleBack} className="back-button">
                            Back
                        </button>
                    )}
                    
                    {step < TOTAL_STEPS ? (
                        <button type="button" onClick={handleNext} className="next-button">
                            Continue
                        </button>
                    ) : (
                        <button 
                            type="button" 
                            onClick={handleFinalNuke}
                            disabled={confirmationText !== REQUIRED_TEXT || isLoading}
                            className="nuke-button"
                        >
                            {isLoading ? 'Deleting...' : '💥 NUKE DATABASE'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NukeDataModal;