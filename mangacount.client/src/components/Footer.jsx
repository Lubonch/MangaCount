import './Footer.css';

// Footer con la versión actual y, si hay una nueva, un enlace al release.
const Footer = ({ version, update }) => (
  <footer className="app-footer">
    <span className="footer-version">
      MangaCount v{version ?? '—'}
      {update?.hasUpdate && update?.url && (
        <>
          {' → '}
          <a
            className="footer-update"
            href={update.url}
            target="_blank"
            rel="noreferrer"
            title="Abrir la página de la nueva versión"
          >
            v{update.latest} (click)
          </a>
        </>
      )}
    </span>
  </footer>
);

export default Footer;
