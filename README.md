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
