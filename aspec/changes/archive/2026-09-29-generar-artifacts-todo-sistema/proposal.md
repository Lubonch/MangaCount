# Proposal: Generar artifacts de todo el sistema MangaCount

## Problem

El repositorio MangaCount implementa un gestor de colección de manga con cuatro superficies (API ASP.NET Core, frontend React, demo GitHub Pages, bot WhatsApp) más un motor de recomendaciones compartido, pero no existe ningún change aspec que describa ese comportamiento. Sin artifacts base no hay trazabilidad qué/cómo/pasos/requisitos, y cualquier cambio futuro parte sin especificación contra la cual verificar.

## Proposed change

Crear un change fundacional `generar-artifacts-todo-sistema` que documente el sistema completo tal como existe hoy: proposal, design, tasks por fases y delta specs por capacidad (perfiles, mangas, entries, formatos/editoriales, import/export TSV, recomendaciones, frontend web, demo Pages, bot WhatsApp, transversal logging/config/deploy). No se cambia código; se fija la línea base especificada para futuros changes.

## Scope

In scope:
- Relevamiento del comportamiento real verificado en `MangaCount.Server/Controllers`, `Services`, `Repositories`, `mangacount.client/src`, `Pages/src`, `WhatsappBot/src`, `shared/recommendations`.
- Delta specs por capacidad con requisitos y escenarios en formato aspec.
- Tasks faseadas para generar y validar los artifacts por capacidad.
- Design que fija arquitectura actual (capas Controllers → Services → Data con Dapper, PostgreSQL, React+Vite, Node bot con whatsapp-web.js, motor local con fallback obligatorio).

Out of scope:
- Cambios de código funcional, migraciones de BD o nuevas features (Jikan, dashboard, búsqueda avanzada del PLAN.md).
- Corrección de deuda o discrepancias README vs PLAN.md más allá de documentarlas como riesgos.
- Tests nuevos o CI/CD.

## Risks

Divergencia README vs PLAN.md vs código real: mitigación relevando solo comportamiento verificado en código y marcando aspiracional como fuera de alcance.
Alcance demasiado amplio que bloquee momentum: mitigación con tasks faseadas por capacidad independientemente verificables.
Specs inventadas sin evidencia: mitigación exigiendo cada Requirement con Scenario WHEN/THEN trazable a endpoint, componente o script real.
