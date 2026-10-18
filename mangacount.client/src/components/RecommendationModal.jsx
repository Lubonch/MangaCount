import { useMemo, useState } from 'react';
import { useT } from '../contexts/I18nContext';
import {
    recommendationDismiss,
    recommendationOwn,
    recommendationGet,
    mangaList,
} from '../api/localAdapter';
import './RecommendationModal.css';

const keyOf = (item) => item.externalId ?? item.id;

const RecommendationModal = ({
    isOpen,
    isLoading = false,
    error = null,
    recommendations = null,
    profileId = null,
    onClose,
}) => {
    const t = useT();
    const [items, setItems] = useState(recommendations?.items || []);
    const [exhausted, setExhausted] = useState(recommendations?.exhausted === true);
    const [busy, setBusy] = useState(false);
    const [actionError, setActionError] = useState('');
    // Tarjeta en la que se está eligiendo "ya lo tengo" + colección del perfil.
    const [pickerItem, setPickerItem] = useState(null);
    const [pickerQuery, setPickerQuery] = useState('');
    const [mangas, setMangas] = useState([]);
    // Sincroniza la lista con cada respuesta nueva del padre (patrón de React para
    // "ajustar estado cuando cambia una prop", sin efecto).
    const [syncedFrom, setSyncedFrom] = useState(recommendations);
    if (recommendations !== syncedFrom) {
        setSyncedFrom(recommendations);
        setItems(recommendations?.items || []);
        setExhausted(recommendations?.exhausted === true);
    }

    const provider = recommendations?.provider || 'local';
    const limit = recommendations?.limit || 10;
    const inferredCountry = recommendations?.inferredCountry || 'Unknown';
    const blockedByImportCount = recommendations?.blockedByImportCount || 0;
    const showImportNote = !isLoading && !error && blockedByImportCount > 0 && items.length < limit;

    const filteredMangas = useMemo(() => {
        const query = pickerQuery.trim().toLowerCase();
        if (!query) return mangas;
        return mangas.filter((manga) => (manga.name || '').toLowerCase().includes(query));
    }, [mangas, pickerQuery]);

    if (!isOpen) {
        return null;
    }

    // Reemplaza la tarjeta accionada por la siguiente candidata (lista a `limit`).
    const fillOne = async () => {
        const res = await recommendationGet(profileId, 1);
        const extra = res?.items ?? [];
        if (extra.length > 0) setItems((prev) => [...prev, ...extra]);
        if (extra.length === 0 || res?.exhausted) setExhausted(true);
    };

    const dismiss = async (item) => {
        setActionError('');
        setBusy(true);
        try {
            await recommendationDismiss({ profileId, provider, externalId: item.externalId });
            setItems((prev) => prev.filter((candidate) => keyOf(candidate) !== keyOf(item)));
            await fillOne();
        } catch {
            setActionError(t('rec.dismissFailed'));
        } finally {
            setBusy(false);
        }
    };

    const refresh = async () => {
        setActionError('');
        setBusy(true);
        try {
            const res = await recommendationGet(profileId, limit);
            setItems(res?.items ?? []);
            setExhausted(res?.exhausted === true);
        } catch {
            setActionError(t('rec.dismissFailed'));
        } finally {
            setBusy(false);
        }
    };

    const openPicker = async (item) => {
        setActionError('');
        setPickerItem(item);
        setPickerQuery('');
        setMangas([]);
        try {
            const list = await mangaList();
            setMangas(Array.isArray(list) ? list : []);
        } catch {
            setMangas([]);
        }
    };

    const ownExisting = async (manga) => {
        setActionError('');
        setBusy(true);
        try {
            await recommendationOwn({ profileId, provider, externalId: pickerItem.externalId, mangaId: manga.id });
            setItems((prev) => prev.filter((candidate) => keyOf(candidate) !== keyOf(pickerItem)));
            setPickerItem(null);
            await fillOne();
        } catch {
            setActionError(t('rec.ownFailed'));
        } finally {
            setBusy(false);
        }
    };

    const ownNew = async () => {
        const title = pickerQuery.trim();
        if (!title) return;
        setActionError('');
        setBusy(true);
        try {
            await recommendationOwn({ profileId, provider, externalId: pickerItem.externalId, title });
            setItems((prev) => prev.filter((candidate) => keyOf(candidate) !== keyOf(pickerItem)));
            setPickerItem(null);
            await fillOne();
        } catch {
            setActionError(t('rec.ownFailed'));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="recommendation-overlay" role="presentation" onClick={onClose}>
            <div
                className="recommendation-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="recommendation-title"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="recommendation-header">
                    <div>
                        <h2 id="recommendation-title">{t('rec.title')}</h2>
                        <p className="recommendation-subtitle">
                            {t('rec.country', { country: inferredCountry })}
                        </p>
                        <p className="recommendation-provider">{t('rec.provider', { provider })}</p>
                        {showImportNote && (
                            <p className="recommendation-meta">
                                {t('rec.picks', { count: items.length, blocked: blockedByImportCount, word: t(blockedByImportCount === 1 ? 'rec.candidateWas' : 'rec.candidatesWere') })}
                            </p>
                        )}
                    </div>
                    <div className="recommendation-header-actions">
                        <button
                            type="button"
                            className="recommendation-refresh"
                            aria-label={t('rec.refreshAria')}
                            onClick={refresh}
                            disabled={busy || exhausted}
                        >
                            {t('rec.refresh')}
                        </button>
                        <button
                            type="button"
                            className="recommendation-close"
                            aria-label={t('rec.closeAria')}
                            onClick={onClose}
                        >
                            {t('rec.close')}
                        </button>
                    </div>
                </div>

                {isLoading && (
                    <div className="recommendation-state">
                        <p>{t('rec.building')}</p>
                    </div>
                )}

                {!isLoading && error && (
                    <div className="recommendation-state error">
                        <p>{error}</p>
                    </div>
                )}

                {!isLoading && !error && items.length === 0 && (
                    <div className="recommendation-state">
                        <p>{t('rec.none')}</p>
                    </div>
                )}

                {!isLoading && items.length > 0 && (
                    <ol className="recommendation-list">
                        {items.map((item, index) => (
                            <li key={keyOf(item)} className="recommendation-item">
                                <div className="recommendation-rank">#{index + 1}</div>
                                <div className="recommendation-content">
                                    <h3>{item.title}</h3>
                                    <p className="recommendation-meta">
                                        {item.publisher ? `${item.publisher} · ` : ''}{item.publisherCountry || item.genres?.join(', ') || ''}
                                        {item.format ? ` · ${item.format}` : ''}
                                    </p>
                                    {item.reason && (
                                        <p className="recommendation-reason">
                                            {provider === 'anilist'
                                                ? t('rec.reason', { seed: item.reason })
                                                : item.reason}
                                        </p>
                                    )}
                                    {item.externalId != null && (
                                        <div className="recommendation-actions">
                                            <button
                                                type="button"
                                                className="recommendation-own"
                                                onClick={() => openPicker(item)}
                                                disabled={busy}
                                            >
                                                {t('rec.own')}
                                            </button>
                                            <button
                                                type="button"
                                                className="recommendation-dismiss"
                                                aria-label={t('rec.dismissAria')}
                                                onClick={() => dismiss(item)}
                                                disabled={busy}
                                            >
                                                {t('rec.dismiss')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ol>
                )}

                {!isLoading && !error && exhausted && (
                    <p className="recommendation-exhausted">{t('rec.exhausted')}</p>
                )}

                {actionError && <p className="recommendation-action-error">{actionError}</p>}

                {pickerItem && (
                    <div className="recommendation-picker" role="dialog" aria-label={t('rec.pickerTitle')}>
                        <h3>{t('rec.pickerTitle')}</h3>
                        <input
                            type="text"
                            value={pickerQuery}
                            onChange={(event) => setPickerQuery(event.target.value)}
                            placeholder={t('rec.pickerSearch')}
                            aria-label={t('rec.pickerSearch')}
                        />
                        <ul className="recommendation-picker-list">
                            {filteredMangas.map((manga) => (
                                <li key={manga.id}>
                                    <button type="button" onClick={() => ownExisting(manga)} disabled={busy}>
                                        {manga.name}
                                    </button>
                                </li>
                            ))}
                        </ul>
                        {filteredMangas.length === 0 && <p>{t('rec.pickerEmpty')}</p>}
                        <div className="recommendation-picker-actions">
                            <button
                                type="button"
                                className="recommendation-picker-create"
                                onClick={ownNew}
                                disabled={busy || pickerQuery.trim() === ''}
                            >
                                {t('rec.pickerCreate')}
                            </button>
                            <button
                                type="button"
                                className="recommendation-picker-cancel"
                                onClick={() => setPickerItem(null)}
                                disabled={busy}
                            >
                                {t('rec.pickerCancel')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecommendationModal;
