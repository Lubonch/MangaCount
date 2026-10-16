# Tasks: El workflow de release publica los metadatos de auto-update (`latest.yml`)

- [x] `.github/workflows/release.yml`: agregar `release/latest-linux.yml` (ubuntu) y `release/latest.yml`
      (windows) a la lista `artifacts` de la matriz
- [x] Push con scope `workflow` (desde una cuenta/credencial con permiso)
- [ ] Verificar en la próxima release que `latest.yml` y `latest-linux.yml` quedan publicados
- [x] Verificación cruzada contra el proposal
