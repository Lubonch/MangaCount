## ADDED Requirements

### Requirement: Design system de la interfaz

The system SHALL definir la apariencia con una capa de **design tokens** (color —incluido un acento de
marca—, tipografía, espaciado, radios, sombras y motion) aplicada por variables CSS, con **temas claro
y oscuro** sobre los mismos tokens, y una tipografía consistente (Inter con fallback al sistema). Los
estilos de los componentes SHALL consumir los tokens en lugar de valores de color hardcodeados.

#### Scenario: Cambio de tema

- **WHEN** el usuario alterna entre tema claro y oscuro
- **THEN** la interfaz cambia usando los mismos tokens, sin colores hardcodeados

#### Scenario: Legibilidad

- **WHEN** se usa la app en cualquier tema
- **THEN** el texto y los controles cumplen contraste legible y foco visible

### Requirement: Identidad visual (logo)

The system SHALL usar un logo propio (monograma **`MC`**) en la aplicación: navegación/header, ícono de
la app, ícono de la bandeja (tray) y favicon, provisto en formato vectorial y en los tamaños/formatos
necesarios (PNG/ICO).

#### Scenario: Ícono de la aplicación

- **WHEN** la app se empaqueta y se instala
- **THEN** usa el logo nuevo como ícono de la app y en la bandeja

#### Scenario: Logo en la navegación

- **WHEN** el usuario abre la app
- **THEN** el logo aparece en la navegación lateral

### Requirement: Navegación lateral (sidebar) modernizada

The system SHALL organizar la navegación principal en una **sidebar agrupada y colapsable** con el logo,
manteniendo el acceso a la colección, recomendaciones, ajustes y estado del bot, y sin provocar scroll
horizontal de página.

#### Scenario: Colapsar y expandir

- **WHEN** el usuario colapsa o expande la sidebar
- **THEN** la navegación se adapta y el contenido ocupa el ancho disponible sin scroll horizontal

### Requirement: Animaciones de la interfaz

The system SHALL usar animaciones sutiles y consistentes (transición de tema, hover de tarjetas, cambio
de vista, apertura de modales, expandir/colapsar sidebar) con duraciones y easing uniformes, y SHALL
respetar `prefers-reduced-motion` desactivándolas cuando el usuario lo pida.

#### Scenario: Movimiento reducido

- **WHEN** el sistema operativo pide `prefers-reduced-motion`
- **THEN** la interfaz no reproduce animaciones (o las reduce al mínimo)
