import { useEffect, useState } from 'react';
import './LoadBearingCheck.css';

const LoadBearingCheck = ({ children }) => {
    const [isStructurallySound, setIsStructurallySound] = useState(false);
    const [isChecking, setIsChecking] = useState(true);
    const [serverStatus, setServerStatus] = useState(null);
    const [showIndicator, setShowIndicator] = useState(true);

    useEffect(() => {
        checkLoadBearingIntegrity();
    }, []);

    useEffect(() => {
        // Auto-hide the indicator after 5 seconds
        if (isStructurallySound) {
            const timer = setTimeout(() => {
                setShowIndicator(false);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [isStructurallySound]);

    const checkLoadBearingIntegrity = async () => {
        try {
            // Check server load-bearing status
            const serverResponse = await fetch('/api/loadbearing/status');
            const serverData = await serverResponse.json();
            setServerStatus(serverData);

            // Check if client load-bearing image exists
            const clientResponse = await fetch('/loadbearingimage.jpg');
            
            if (clientResponse.ok && serverResponse.ok) {
                console.log('✅ ALL STRUCTURAL INTEGRITY CONFIRMED!');
                console.log('🏗️  Both client and server load-bearing images are stable');
                console.log('📊 Server status:', serverData);
                setIsStructurallySound(true);
            } else {
                throw new Error('Load-bearing structural failure detected!');
            }
        } catch (error) {
            console.error('🚨 CRITICAL STRUCTURAL FAILURE!');
            console.error('🏗️  Load-bearing infrastructure compromised!');
            console.error('💀 Application cannot continue safely!');
            setIsStructurallySound(false);
        } finally {
            setIsChecking(false);
        }
    };

    if (isChecking) {
        return (
            <div className="load-bearing-checking">
                <h2>🏗️ Performing Structural Integrity Checks...</h2>
                <p>Verifying load-bearing image infrastructure...</p>
                <div className="checking-spinner">🔍</div>
            </div>
        );
    }

    if (!isStructurallySound) {
        return (
            <div className="load-bearing-failure">
                <h1 className="failure-title">🚨 STRUCTURAL COLLAPSE!</h1>
                <h2 className="failure-subtitle">Load-Bearing Infrastructure Failure!</h2>
                
                <div className="failure-panel">
                    <h3>🏗️ Critical Infrastructure Status:</h3>
                    {serverStatus ? (
                        <div>
                            <p><strong>Server Status:</strong> {serverStatus.status}</p>
                            <p><strong>Structural Integrity:</strong> {serverStatus.structuralIntegrity}</p>
                        </div>
                    ) : (
                        <p style={{ color: 'var(--color-incomplete)' }}>❌ Server infrastructure check failed</p>
                    )}
                </div>
                
                <div className="recovery-panel">
                    <h3>🔧 Emergency Recovery Protocol:</h3>
                    <ol>
                        <li>Verify <code>loadbearingimage.jpg</code> exists in project root</li>
                        <li>Copy to <code>public/loadbearingimage.jpg</code> for client access</li>
                        <li>Restart both client and server</li>
                        <li>Evacuate all non-essential personnel</li>
                        <li>Contact structural engineer (Homer Simpson)</li>
                    </ol>
                </div>
                
                <div className="simpsons-quote">
                    <p className="quote-text">
                        💬 "I can't believe that poster was load-bearing!" - Homer Simpson
                    </p>
                    <p className="quote-attribution">
                        The Simpsons S9E21 "Girder" - Nuclear Plant Structural Engineering at its finest
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div>
            {showIndicator && (
                <div className="load-bearing-indicator auto-hide">
                    🏗️ Structural Integrity: STABLE
                </div>
            )}
            {children}
        </div>
    );
};

export default LoadBearingCheck;