## ADDED Requirements

### Requirement: Revisión de posibles duplicados antes de importar TSV

The system SHALL previsualizar una importación TSV sin escribir en la base y SHALL detectar posibles
duplicados comparando cada fila contra los mangas existentes y contra las filas anteriores del mismo
archivo. La detección SHALL ser offline y basarse en el título: coincidencia exacta normalizada (acentos,
mayúsculas, puntuación y espacios), contención de tokens significativos y similitud difusa para typos;
NO SHALL proponer como duplicados pares cuyos tokens numéricos difieran (por ejemplo `Parte 1` vs
`Parte 2`, `Another` vs `Another 0`, `Battle Royale` vs `Battle Royale 2`). La previsualización SHALL
exponer `entry:import-preview` y NO SHALL modificar mangas ni entries.

La importación SHALL aplicarse solo al confirmar decisiones para todas las filas candidatas. “Son lo
mismo” SHALL reutilizar el manga candidato (existente o de una fila anterior del lote) y actualizar la
entry del perfil; “No son lo mismo” SHALL crear un manga nuevo aunque el título normalizado coincida. El
commit SHALL ser atómico: si falta una decisión o es inválida, NO SHALL escribir ninguna fila. Las filas
sin candidato SHALL conservar el comportamiento previo (match exacto case-insensitive o alta). El canal
`entry:import` sin decisiones SHALL mantener el comportamiento legacy para compatibilidad.

#### Scenario: Previsualizar un TSV con un posible duplicado

- **WHEN** el usuario importa un TSV cuya fila `Kuuga` coincide por contención con el manga existente `Kamen Rider Kuuga`
- **THEN** el sistema devuelve un preview con el par y no escribe nada en la base

#### Scenario: Resolver “Son lo mismo”

- **WHEN** el usuario confirma que una fila del TSV y un manga existente son la misma serie
- **THEN** el commit reutiliza el manga existente y actualiza la entry del perfil, sin crear otro manga

#### Scenario: Resolver “No son lo mismo”

- **WHEN** el usuario confirma que una fila parecida y el manga candidato son series distintas
- **THEN** el commit crea un manga nuevo para esa fila

#### Scenario: Duplicado interno del archivo

- **WHEN** dos filas del mismo TSV son variantes de la misma serie y el usuario marca “Son lo mismo”
- **THEN** ambas filas resuelven al mismo manga y la entry del perfil queda con la última fila aplicada

#### Scenario: Falta una decisión

- **WHEN** se intenta confirmar la importación sin resolver todas las filas candidatas
- **THEN** el sistema rechaza la operación y no escribe ninguna fila

#### Scenario: Cancelar la revisión

- **WHEN** el usuario cancela la pantalla de duplicados
- **THEN** no se escribe nada y la colección queda como estaba

#### Scenario: Import legacy sin detección

- **WHEN** se invoca `entry:import` sin decisiones
- **THEN** el sistema conserva el comportamiento anterior de importación directa
