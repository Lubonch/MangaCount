import './LoadingSpinner.css';

const LoadingSpinner = ({ 
    size = 'medium', 
    message = 'Loading...', 
    showMessage = true,
    className = '',
    fullScreen = false 
}) => {
    const sizeClass = {
        small: 'spinner-small',
        medium: 'spinner-medium',
        large: 'spinner-large'
    }[size];

    const content = (
        <div className={`loading-container ${className}`}>
            <div className={`loading-spinner ${sizeClass}`}>
                <div className="spinner-ring">
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                </div>
            </div>
            {showMessage && (
                <p className="loading-message">{message}</p>
            )}
        </div>
    );

    if (fullScreen) {
        return (
            <div className="loading-fullscreen">
                {content}
            </div>
        );
    }

    return content;
};

export default LoadingSpinner;