import './Footer.css';
import { useT } from '../contexts/I18nContext';

// Footer con la versión actual y el estado de actualización:
// - link: `vX → vY (click)` al release.
// - auto: Descargar → Descargando… X% → Reiniciar para actualizar.
const Footer = ({ version, update, onDownload = () => {}, onInstall = () => {} }) => {
  const t = useT();
  let extra = null;

  if (update?.status === 'downloaded') {
    extra = (
      <button type="button" className="footer-action" onClick={onInstall}>
        {t('footer.install')}
      </button>
    );
  } else if (update?.status === 'downloading') {
    extra = <span className="footer-update">{t('footer.downloading', { percent: update.percent })}</span>;
  } else if (update?.hasUpdate && update?.mode === 'auto') {
    extra = (
      <button type="button" className="footer-action" onClick={onDownload}>
        {t('footer.download', { version: update.latest })}
      </button>
    );
  } else if (update?.hasUpdate && update?.url) {
    extra = (
      <a className="footer-update" href={update.url} target="_blank" rel="noreferrer" title={t('footer.openRelease')}>
        {t('footer.updateLink', { version: update.latest })}
      </a>
    );
  }

  return (
    <footer className="app-footer">
      <span className="footer-version">
        MangaCount v{version ?? '—'}
        {extra && <> · {extra}</>}
      </span>
    </footer>
  );
};

export default Footer;
