import './Footer.css';

// Footer con la versión actual y el estado de actualización:
// - link: `vX → vY (click)` al release.
// - auto: Descargar → Descargando… X% → Reiniciar para actualizar.
const Footer = ({ version, update, onDownload = () => {}, onInstall = () => {} }) => {
  let extra = null;

  if (update?.status === 'downloaded') {
    extra = (
      <button type="button" className="footer-action" onClick={onInstall}>
        Reiniciar para actualizar
      </button>
    );
  } else if (update?.status === 'downloading') {
    extra = <span className="footer-update">Descargando… {update.percent}%</span>;
  } else if (update?.hasUpdate && update?.mode === 'auto') {
    extra = (
      <button type="button" className="footer-action" onClick={onDownload}>
        Descargar v{update.latest}
      </button>
    );
  } else if (update?.hasUpdate && update?.url) {
    extra = (
      <a className="footer-update" href={update.url} target="_blank" rel="noreferrer" title="Abrir la página de la nueva versión">
        v{update.latest} (click)
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
