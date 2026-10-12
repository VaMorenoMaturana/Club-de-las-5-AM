# Club de las 5 AM — Hora de la Victoria

Web estática para registrar despertar, activación, meditación, lectura, entrenamiento, mediciones y progreso personal durante el ciclo del 13 de octubre de 2026 al 1 de enero de 2027.

## Nombre propuesto
**Club de las 5 AM**  
Subtítulo: **Hora de la Victoria**  
Dominio sugerido (verifique disponibilidad): `clubdelas5am` o `horadelavictoria`.

## Archivos
- `index.html`: estructura y vistas.
- `styles.css`: diseño adaptable para móvil y escritorio.
- `app.js`: rutinas, registro diario, progreso y almacenamiento local.

## Publicar en Render Static Site
1. Cree un repositorio GitHub, por ejemplo `club-5am`.
2. Suba estos tres archivos a la raíz del repositorio.
3. En Render, cree un **Static Site** conectado al repositorio.
4. Build Command: déjelo vacío.
5. Publish Directory: `.` (raíz).
6. Despliegue.

No necesita servidor ni base de datos para esta versión local.

## Persistencia y límites importantes
- Los datos se guardan en `localStorage` del navegador. Persisten en el mismo navegador/dispositivo incluso después de cerrar la página.
- La opción “Mantener la sesión” permite omitir el ingreso de la contraseña en ese dispositivo.
- **La contraseña de esta versión es una barrera visual local, no seguridad real.** Está guardada en el navegador como texto y alguien con acceso técnico al dispositivo puede verla; los archivos públicos de un Static Site también pueden inspeccionarse. No use esta versión para información sensible ni la considere una web privada protegida.
- No hay sincronización entre dispositivos. Exportar JSON crea una copia de respaldo manual.
- El sitio no puede ejecutar tareas a medianoche si el navegador está cerrado. Cuando vuelva a abrirlo, reconoce la fecha actual y crea registros vacíos para días omitidos; no inventa tareas completadas.
- El historial se conserva localmente. Borrar los datos del navegador puede eliminarlo.

## Cómo convertirlo en una aplicación privada y escalable
Para protección real, múltiples dispositivos y datos persistentes:
1. Mantener este frontend como base.
2. Añadir autenticación real con Supabase Auth (correo/contraseña o magic link).
3. Guardar registros en PostgreSQL/Supabase, con Row Level Security para que cada usuario solo pueda leer y modificar sus datos.
4. No poner claves `service_role`, contraseñas ni secretos en JavaScript público.
5. Migrar el registro local existente mediante el botón Exportar y un flujo de importación autenticado.
6. Añadir recordatorios, objetivos por fase, ejercicios configurables, fotografías opcionales y reportes semanales.

## Comportamiento
- El botón “Estoy despierto” registra fecha y hora exactas del dispositivo.
- Tras despertar, se habilita la rutina de la mañana: activación, meditación y lectura.
- Al completar las tres tareas se puede registrar la Hora de la Victoria.
- La rutina de tarde se muestra según el día de la semana.
- “Guardar registro del día” registra entrenamiento y notas. “Cerrar y registrar el día” guarda la jornada.
- Las estadísticas muestran registros, hora media de despertar, porcentaje de victorias, entrenamientos y hábitos que conviene reforzar.
- El día se determina usando la fecha local del dispositivo.

## Nota de entrenamiento
La rutina está pensada como plantilla progresiva para retomar actividad tras un periodo sin entrenar. Ajuste cargas a su capacidad actual, no entrene con dolor y priorice técnica y recuperación.


## Perfil inicial
- Usuario: `Vicente Moreno`
- Contraseña: `Qwerty1234*`
- Inicio del programa: 13 de octubre de 2026.

**Advertencia de seguridad:** al ser un sitio estático, las credenciales configuradas en `app.js` son inspeccionables por cualquier persona que acceda al código publicado. La pantalla de login sirve para un prototipo personal, pero no protege datos de forma robusta. Antes de considerar el sitio privado, implemente autenticación de servidor (por ejemplo, Supabase Auth) y reglas de acceso a la base de datos. Como la contraseña fue incluida en el código cliente, cámbiela si alguna vez la reutiliza en otro servicio.


## Funciones añadidas en la versión de planificación
- Pestaña **Calendario**: asignar una rutina a una fecha específica, mover una sesión a otro día o dejar ese día como descanso.
- Plan semanal base configurable para todos los días de la semana, incluyendo miércoles, sábado y domingo.
- Pestaña **Rutinas**: editar el nombre, agregar/quitar ejercicios, definir prescripción y crear rutinas nuevas.
- **Biblioteca de lectura** en Ajustes: agregar título y autor; aparecerá en el selector de lectura matutina.
- Los cambios de planificación afectan el calendario futuro; los registros históricos guardados se conservan.


## Supabase (autenticación real y sincronización)
1. Cree un proyecto Supabase independiente para Club de las 5 AM.
2. En Authentication, habilite Email y cree su usuario desde Authentication > Users. El inicio de sesión usa correo electrónico y contraseña; “Vicente Moreno” es el nombre visible del perfil.
3. En Project Settings > API copie Project URL y la publishable key (o anon key legacy). Pegue ambos valores en `supabase-config.js`. No use nunca la `service_role` key en frontend.
4. En SQL Editor ejecute `supabase-schema.sql`. La tabla `user_state` usa JSONB para persistir el estado del usuario y RLS limita el acceso a `auth.uid()`.
5. Despliegue los archivos en Render Static Site (Publish Directory `.`; sin build command).
6. Para migrar, en la versión antigua exporte Mi avance > Exportar mis datos (JSON). Inicie sesión en la nueva versión, seleccione ese archivo en Mi avance y pulse Importar respaldo JSON. La importación reemplaza el estado remoto: haga un respaldo previo.
7. Pruebe guardar un registro, recargar la página e iniciar sesión desde otro navegador.

La contraseña ya no está codificada en `app.js`; la administra Supabase Auth. El frontend solo contiene la URL y la clave pública, que deben estar protegidas por las políticas RLS. Esta primera versión almacena el estado como un JSONB por usuario; en una fase posterior se pueden normalizar días, ejercicios, rutinas y mediciones en tablas relacionales.
