import type { IconName } from "@/components/admin/icons";

/**
 * Contenido de la Ayuda del panel, filtrado por rol. Escrito en lenguaje
 * simple, con pasos numerados que usan los nombres exactos de los botones.
 * En los textos, **así** marca negritas.
 */

export type RolAyuda = "superadmin" | "admin_liga" | "admin_equipo" | "arbitro";

export interface Bloque {
  tipo: "p" | "pasos" | "lista" | "tip" | "ojo";
  texto?: string; // p, tip, ojo
  items?: string[]; // pasos (numerados), lista (viñetas)
}

export interface Tema {
  id: string;
  titulo: string;
  bloques: Bloque[];
}

export interface Seccion {
  id: string;
  titulo: string;
  icono: IconName;
  descripcion: string;
  roles: RolAyuda[];
  temas: Tema[];
}

const TODOS: RolAyuda[] = ["superadmin", "admin_liga", "admin_equipo", "arbitro"];
const LIGA: RolAyuda[] = ["superadmin", "admin_liga"];

export const SECCIONES: Seccion[] = [
  // ── Primeros pasos ────────────────────────────────────────────────────────
  {
    id: "primeros-pasos",
    titulo: "Primeros pasos",
    icono: "dashboard",
    descripcion: "Qué es la plataforma, cómo entrar y lo básico de tu cuenta.",
    roles: TODOS,
    temas: [
      {
        id: "que-es",
        titulo: "¿Qué es esta plataforma?",
        bloques: [
          {
            tipo: "p",
            texto:
              "Aquí vive todo lo que pasa en tu liga de fútbol: los equipos, los jugadores, el " +
              "calendario de partidos, los resultados, la tabla de posiciones y los pagos. " +
              "Además, cada liga tiene su **página pública** (la que ve cualquier persona sin " +
              "contraseña) y, si la cancha tiene cámaras DE/SPORTS, cada partido queda **grabado " +
              "en video**.",
          },
          {
            tipo: "p",
            texto:
              "Hay cuatro tipos de usuario, y cada uno ve solo lo suyo: **DE/SPORTS** (el " +
              "superadministrador, que ve todas las ligas), el **Administrador de liga** (el " +
              "organizador), el **Admin de equipo o capitán** (encargado de un equipo) y el " +
              "**Árbitro** (captura las fichas de sus partidos). Esta Ayuda solo te muestra las " +
              "secciones que le tocan a tu usuario.",
          },
          {
            tipo: "tip",
            texto:
              "Las cuentas no se crean solas: el administrador de la liga crea los usuarios de " +
              "capitanes y árbitros, y DE/SPORTS crea los de administradores de liga. Si " +
              "necesitas una cuenta o olvidaste tu contraseña, pide ayuda a tu liga.",
          },
        ],
      },
      {
        id: "entrar",
        titulo: "Entrar al panel",
        bloques: [
          {
            tipo: "pasos",
            items: [
              "Abre en tu navegador la dirección del panel: termina en **/admin**.",
              "Escribe tu **usuario** y tu **contraseña**.",
              "Presiona **Entrar**. Listo, ya estás dentro.",
            ],
          },
          {
            tipo: "ojo",
            texto:
              "Si el sistema dice que tu cuenta está desactivada, no es un error tuyo: la liga " +
              "la apagó. Contacta a tu administrador para que la reactive.",
          },
        ],
      },
      {
        id: "mi-cuenta",
        titulo: "Tu foto y tu contraseña",
        bloques: [
          {
            tipo: "pasos",
            items: [
              "Haz clic en **tu nombre**, arriba a la derecha.",
              "Entra a **Mi cuenta**.",
              "Ahí puedes subir tu **foto de perfil** y **cambiar tu contraseña**.",
            ],
          },
          {
            tipo: "tip",
            texto:
              "Cuando cambias tu contraseña, tus sesiones abiertas en otros teléfonos o " +
              "computadoras se cierran solas, por seguridad.",
          },
        ],
      },
      {
        id: "campana",
        titulo: "La campana de avisos",
        bloques: [
          {
            tipo: "p",
            texto:
              "La **campana** de arriba te avisa cuando algo necesita tu atención: un jugador " +
              "por aprobar, una foto nueva, cambios propuestos, un reclamo o una respuesta. Si " +
              "tiene un numerito, hay avisos sin leer. Haz clic en un aviso y te lleva directo " +
              "a donde debes actuar.",
          },
        ],
      },
    ],
  },

  // ── Superadmin: Ligas ─────────────────────────────────────────────────────
  {
    id: "ligas",
    titulo: "Ligas (DE/SPORTS)",
    icono: "ligas",
    descripcion: "Crear ligas, cambiar de liga activa y conectar los videos.",
    roles: ["superadmin"],
    temas: [
      {
        id: "liga-activa",
        titulo: "La liga activa",
        bloques: [
          {
            tipo: "p",
            texto:
              "Como superadministrador puedes trabajar con todas las ligas, pero el panel " +
              "siempre muestra **una liga a la vez**: la “liga activa”. Todo lo que " +
              "hagas (equipos, torneos, pagos…) se guarda en esa liga.",
          },
          {
            tipo: "pasos",
            items: [
              "Arriba del panel está el **selector de liga**.",
              "Elige la liga con la que quieres trabajar.",
              "Verifica el nombre antes de capturar: es fácil editar la liga equivocada.",
            ],
          },
        ],
      },
      {
        id: "crear-liga",
        titulo: "Crear una liga nueva",
        bloques: [
          {
            tipo: "pasos",
            items: [
              "Entra a **Ligas** en el menú.",
              "Presiona **Nueva liga**.",
              "Escribe el **nombre** y el **slug** (la palabra que va en la dirección web de la liga, por ejemplo “soccer-stadium”: solo minúsculas, números y guiones).",
              "Llena dirección, teléfono y correo si los tienes.",
              "Guarda. La liga ya existe y puedes activarla para configurarla.",
            ],
          },
          {
            tipo: "tip",
            texto:
              "El slug se vuelve la dirección pública: si el slug es “mi-liga”, la " +
              "página de la liga queda en /mi-liga. Elígelo bien desde el inicio.",
          },
        ],
      },
      {
        id: "conectar-desports",
        titulo: "Conectar la liga con los videos DE/SPORTS",
        bloques: [
          {
            tipo: "p",
            texto:
              "Si la liga juega en canchas con cámaras DE/SPORTS, conecta la liga para que los " +
              "torneos usen los horarios de las cámaras y cada resultado enlace a su video.",
          },
          {
            tipo: "pasos",
            items: [
              "Consigue el **ID de la liga** en la plataforma de videos (es un código de 24 letras y números).",
              "En **Ligas** (o en **Configuración** con la liga activa), pega el ID en el campo **ID de liga DE/SPORTS**.",
              "Presiona **Comprobar**. Si todo está bien verás “✓ Liga encontrada en DE/SPORTS” con los días y horarios de cámara, y las canchas que se crearán.",
              "Guarda los cambios.",
            ],
          },
          {
            tipo: "ojo",
            texto:
              "Con la liga conectada, los días y horarios de los torneos ya no son libres: solo " +
              "se pueden elegir las franjas en que graban las cámaras. Así ningún partido se " +
              "queda sin video.",
          },
        ],
      },
    ],
  },

  // ── Liga: Configuración y usuarios ────────────────────────────────────────
  {
    id: "configuracion",
    titulo: "Configuración y usuarios",
    icono: "configuracion",
    descripcion: "Los datos de tu liga y las cuentas de tu gente.",
    roles: LIGA,
    temas: [
      {
        id: "datos-liga",
        titulo: "Los datos de tu liga",
        bloques: [
          {
            tipo: "p",
            texto:
              "En **Configuración** están el nombre, dirección, teléfono y correo de tu liga, " +
              "y la conexión con la plataforma de videos DE/SPORTS. Estos datos aparecen en tu " +
              "página pública, así que manténlos al día.",
          },
        ],
      },
      {
        id: "usuarios",
        titulo: "Crear cuentas para capitanes y árbitros",
        bloques: [
          {
            tipo: "p",
            texto:
              "Tú creas las cuentas de tu gente. Cada capitán queda **ligado a su equipo** y " +
              "cada árbitro a su ficha de árbitro: por eso primero da de alta el equipo o el " +
              "árbitro, y después su usuario.",
          },
          {
            tipo: "pasos",
            items: [
              "Entra a **Configuración** y baja a la sección de **Usuarios**.",
              "Presiona **Nuevo usuario**.",
              "Escribe su **nombre**, elige un **usuario** (con ese entrará) y una **contraseña**.",
              "Elige el **rol**: Admin de equipo o Árbitro (o Admin de liga si es otro organizador).",
              "Si es capitán, selecciona **su equipo**; si es árbitro, selecciona **su ficha de árbitro**.",
              "Guarda y entrégale su usuario y contraseña en persona o por mensaje.",
            ],
          },
          {
            tipo: "tip",
            texto:
              "¿Un capitán olvidó su contraseña? Edita su usuario y ponle una nueva. ¿El equipo " +
              "cambió de capitán? Desactiva el usuario viejo y crea uno nuevo ligado al mismo " +
              "equipo.",
          },
        ],
      },
    ],
  },

  // ── Liga: Equipos ─────────────────────────────────────────────────────────
  {
    id: "equipos",
    titulo: "Equipos",
    icono: "equipos",
    descripcion: "Altas, colores, horario fijo pagado y por qué no se borran.",
    roles: LIGA,
    temas: [
      {
        id: "crear-equipo",
        titulo: "Dar de alta un equipo",
        bloques: [
          {
            tipo: "pasos",
            items: [
              "Entra a **Equipos** y presiona **Nuevo equipo**.",
              "Escribe el **nombre** (no puede repetirse en tu liga) y sube su **logo** si lo tienes.",
              "Elige el **color local** y el **color visitante**: con ellos se pinta su escudo cuando no hay logo.",
              "Elige la **rama** (varonil, femenil o mixto) y la **categoría** (libre o por año de nacimiento).",
              "Anota entrenador, teléfono y correo si los tienes.",
              "Presiona **Crear equipo**.",
            ],
          },
        ],
      },
      {
        id: "horario-fijo",
        titulo: "Horario fijo pagado",
        bloques: [
          {
            tipo: "p",
            texto:
              "Algunos equipos pagan por jugar **siempre a la misma hora** (por ejemplo, todos " +
              "sus partidos a las 20:00). La plataforma lo respeta automáticamente al armar el " +
              "calendario.",
          },
          {
            tipo: "p",
            texto:
              "La hora fija **no se escribe a mano**: se elige de los horarios reales de los " +
              "torneos donde el equipo está inscrito. Como el equipo suele crearse antes que el " +
              "torneo, el flujo es en dos tiempos: primero el monto, después la hora.",
          },
          {
            tipo: "pasos",
            items: [
              "Al crear el equipo, marca la casilla **“El equipo paga por jugar siempre a la misma hora”** y escribe el **monto**. La hora queda **“Por definir”** — es normal.",
              "Crea el torneo e **inscribe al equipo** (al inscribirlo se genera solo su pago pendiente de tipo “Horario fijo”).",
              "Regresa a **Equipos**, selecciona el equipo y da clic en **Editar**.",
              "En **Hora fija** ahora sí aparece el combo con los horarios del torneo: elige una.",
              "Guarda y **genera el calendario** del torneo. Sus partidos caerán en esa hora.",
            ],
          },
          {
            tipo: "tip",
            texto:
              "Si intentas generar el calendario y algún equipo pagado sigue sin hora, el " +
              "sistema te lo advierte en ese momento con estos mismos pasos.",
          },
          {
            tipo: "ojo",
            texto:
              "Si dos equipos con horas fijas **distintas** se enfrentan, el partido se pone a " +
              "la hora del equipo local. Y si mueves a mano la hora de un partido con equipo de " +
              "horario fijo, el sistema te lo recuerda con un aviso amarillo (puedes moverlo de " +
              "todas formas).",
          },
        ],
      },
      {
        id: "no-se-borran",
        titulo: "Los equipos no se eliminan",
        bloques: [
          {
            tipo: "p",
            texto:
              "El historial de un equipo (sus partidos, goles y tarjetas) pertenece a la liga. " +
              "Por eso los equipos **no se borran**: si un equipo deja la liga, edítalo y quita " +
              "la casilla **Equipo activo**. Deja de aparecer en la página pública, pero su " +
              "historia se conserva.",
          },
          {
            tipo: "tip",
            texto:
              "¿El equipo se salió a media temporada? Eso no se hace aquí, sino en los " +
              "**Ajustes del torneo** (mira la sección “Bajas de equipo y ajustes del " +
              "torneo” de esta Ayuda).",
          },
        ],
      },
    ],
  },

  // ── Liga: Jugadores ───────────────────────────────────────────────────────
  {
    id: "jugadores",
    titulo: "Jugadores y aprobaciones",
    icono: "jugadores",
    descripcion: "Altas, fotos y cambios propuestos por los capitanes.",
    roles: LIGA,
    temas: [
      {
        id: "alta-jugador",
        titulo: "Dar de alta un jugador",
        bloques: [
          {
            tipo: "pasos",
            items: [
              "Entra a **Jugadores** y presiona **Nuevo jugador**.",
              "Elige su **equipo** y sube su **foto** (opcional, pero se ve mucho mejor).",
              "Llena nombre, apellidos, fecha de nacimiento, **número**, posición, estatura, peso y sexo.",
              "Presiona **Crear jugador**. Como lo creaste tú (la liga), queda aprobado de inmediato.",
            ],
          },
          {
            tipo: "p",
            texto:
              "Los capitanes también pueden dar de alta jugadores de su equipo, pero esas altas " +
              "llegan a ti **pendientes de aprobación**: nada aparece en público hasta que tú " +
              "digas que sí.",
          },
        ],
      },
      {
        id: "aprobar",
        titulo: "Aprobar altas, fotos y cambios",
        bloques: [
          {
            tipo: "p",
            texto:
              "Todo lo que proponen los capitanes pasa por ti. La campana te avisa y en " +
              "**Jugadores** aparece un recuadro amarillo con el total de pendientes; el botón " +
              "**Ver pendientes** filtra la lista para que solo veas lo que espera revisión.",
          },
          {
            tipo: "lista",
            items: [
              "**Alta nueva** (etiqueta “Pendiente”): revisa los datos y presiona **Aprobar** para publicarlo, o **Rechazar** para descartarlo. Al rechazar, el alta se borra y el capitán recibe el aviso.",
              "**Foto por aprobar**: junto al jugador verás la miniatura de la foto propuesta. **Aprobar foto** la vuelve oficial; **Rechazar foto** la descarta y se queda la anterior.",
              "**Cambios por aprobar**: el capitán propuso corregir datos (número, nombre, posición…). Presiona **Revisar cambios** y verás una tabla con dos columnas: lo **Actual** y lo **Propuesto**, solo de los campos que cambian. **Aprobar cambios** aplica todo; **Rechazar** lo descarta. En ambos casos el capitán recibe aviso.",
            ],
          },
          {
            tipo: "tip",
            texto:
              "El capitán no puede tocar los datos oficiales directamente: todo lo que edite " +
              "llega como propuesta. Tú siempre tienes la última palabra.",
          },
        ],
      },
      {
        id: "baja-jugador",
        titulo: "Bajas y reactivaciones de jugadores",
        bloques: [
          {
            tipo: "p",
            texto:
              "Un jugador con goles o tarjetas capturadas **no se puede eliminar** (romperías " +
              "los marcadores de partidos ya jugados). Lo correcto es **desactivarlo**: edítalo " +
              "y quita la casilla **Jugador activo**. Conserva su historial pero ya no aparece " +
              "en público ni se puede alinear en fichas.",
          },
          {
            tipo: "p",
            texto:
              "Los capitanes también pueden **dar de baja** a sus propios jugadores (tú recibes " +
              "un aviso “Baja de jugador”). Para **reactivar** a un jugador dado de " +
              "baja, solo tú puedes: edítalo y vuelve a marcar **Jugador activo**.",
          },
        ],
      },
    ],
  },

  // ── Liga: Árbitros y canchas ──────────────────────────────────────────────
  {
    id: "arbitros-canchas",
    titulo: "Árbitros y canchas",
    icono: "arbitros",
    descripcion: "El catálogo de tu liga para armar torneos.",
    roles: LIGA,
    temas: [
      {
        id: "arbitros",
        titulo: "Árbitros",
        bloques: [
          {
            tipo: "pasos",
            items: [
              "Entra a **Árbitros** y presiona **Nuevo árbitro**.",
              "Llena su nombre, datos de contacto y foto.",
              "Guarda. Ya lo puedes asignar a torneos y partidos.",
              "Si el árbitro va a capturar sus propias fichas desde su teléfono, créale además un **usuario** con rol Árbitro en Configuración, ligado a esta ficha.",
            ],
          },
        ],
      },
      {
        id: "canchas",
        titulo: "Canchas",
        bloques: [
          {
            tipo: "pasos",
            items: [
              "Entra a **Canchas** y presiona **Nueva cancha**.",
              "Escribe su nombre, dirección, tipo (fútbol 11, 7, rápido…) y si tiene iluminación.",
              "Guarda. El calendario usará tus canchas para repartir los partidos sin encimarlos.",
            ],
          },
          {
            tipo: "tip",
            texto:
              "Si tu liga está conectada a los videos DE/SPORTS, cada cancha tiene el campo " +
              "**Cancha en DE/SPORTS**: es el nombre con el que la conocen las cámaras. Con ese " +
              "nombre bien puesto, cada partido enlaza solo a su video. Al comprobar el ID de la " +
              "liga, estas canchas se pueden crear automáticamente.",
          },
        ],
      },
    ],
  },

  // ── Liga: Torneos ─────────────────────────────────────────────────────────
  {
    id: "torneos",
    titulo: "Torneos y calendario automático",
    icono: "torneos",
    descripcion: "Crear el torneo, fechas garantizadas y generar el rol.",
    roles: LIGA,
    temas: [
      {
        id: "crear-torneo",
        titulo: "Crear un torneo, paso a paso",
        bloques: [
          {
            tipo: "pasos",
            items: [
              "Entra a **Torneos** y presiona **Nuevo torneo**.",
              "Ponle **nombre** (por ejemplo “Apertura 2026”), elige **rama**, **tipo de fútbol** y **categoría**, y la **fecha de inicio**.",
              "Marca primero las **canchas a jugar** (de las canchas cargadas en tu liga).",
              "Marca los **días de juego**.",
              "Elige los **horarios de cada cancha en cada día**: aparece un bloque por combinación (por ejemplo “Sáb · Cancha 1”), porque el viernes puede jugarse a las 20:00 y el sábado a las 09:00 y 11:00. Con la liga conectada a DE/SPORTS, cada bloque muestra solo las franjas en que graban las cámaras ese día.",
              "Los horarios **tachados o deshabilitados ya están reservados por otro torneo** en esa misma cancha y día — el mismo horario en OTRA cancha sí se puede elegir. Así dos torneos nunca se enciman.",
              "Marca los **equipos participantes**. Al marcarlos aparece el campo **Partidos por equipo (fechas garantizadas)** — se llena solo, abajo te lo explico.",
              "Define **duración del partido** y **descanso entre partidos**, marca los **árbitros**, y anota el **costo de inscripción** y el de **arbitraje**.",
              "Presiona **Crear torneo**. Nace en estado “Configuración”: todavía no es público.",
            ],
          },
        ],
      },
      {
        id: "fechas-garantizadas",
        titulo: "Fechas garantizadas (partidos por equipo)",
        bloques: [
          {
            tipo: "p",
            texto:
              "Este número dice **cuántos partidos jugará cada equipo** en el torneo. Aparece " +
              "después de marcar los equipos y se llena solo con el “todos contra " +
              "todos”: si son 8 equipos, marca 7 (cada uno juega contra los otros 7 una " +
              "vez). **Ese es también el mínimo permitido** — no puedes poner menos de 7 con 8 " +
              "equipos, solo igual o más.",
          },
          {
            tipo: "p",
            texto:
              "¿Quieres un torneo más largo? **Súbele el número.** Con 8 equipos y 10 fechas, " +
              "cada equipo juega 10 partidos: los 7 de la primera vuelta y 3 repetidos. El " +
              "sistema reparte los repetidos parejo, y **ningún par de equipos se enfrenta más " +
              "veces de las necesarias**: hasta 14 fechas, máximo 2 veces el mismo cruce; de 15 " +
              "a 21, máximo 3; y así.",
          },
          {
            tipo: "tip",
            texto:
              "¿Equipos nones (7, 9…)? No te preocupes: el sistema acomoda descansos y jornadas " +
              "de alcance para que **todos terminen con sus fechas garantizadas**. Si los " +
              "números no cierran exactos, a lo mucho un equipo juega un partido de más — nunca " +
              "de menos.",
          },
        ],
      },
      {
        id: "generar-calendario",
        titulo: "Generar el calendario",
        bloques: [
          {
            tipo: "pasos",
            items: [
              "En la tarjeta del torneo, presiona **Generar calendario**.",
              "Lee el resumen: cuántos equipos, cuántas fechas por equipo y desde qué día. Si algún equipo **pagó horario fijo y no tiene su hora elegida**, aquí sale la advertencia con los pasos para establecerla antes de generar.",
              "Presiona **Generar**. El sistema arma todas las jornadas: reparte días, horarios, canchas y árbitros sin encimar a nadie — revisa incluso que un árbitro no esté ya asignado a esa misma hora **en otro torneo** de tu liga — y respeta los **horarios fijos pagados**.",
              "Si a alguna hora ya no queda ningún árbitro libre, ese partido se genera **sin árbitro** y en Calendario aparece con la etiqueta **“⚠ Sin árbitro”**: ábrelo con **Editar** y asígnale uno a mano.",
              "El torneo pasa a **En curso** y aparece en la página pública de tu liga.",
            ],
          },
          {
            tipo: "ojo",
            texto:
              "Regenerar el calendario **borra los partidos programados y los rehace**. Si el " +
              "torneo ya tiene resultados capturados o partidos en curso, el sistema se niega, " +
              "para proteger la tabla. En ese caso ajusta partido por partido en **Calendario**, " +
              "o usa **Ajustes** del torneo.",
          },
          {
            tipo: "tip",
            texto:
              "Si el sistema dice que “la jornada no cabe”, es matemática simple: " +
              "faltan canchas, horarios o días para tantos partidos. Agrega alguno de los tres " +
              "y vuelve a intentar.",
          },
        ],
      },
    ],
  },

  // ── Liga: Calendario ──────────────────────────────────────────────────────
  {
    id: "calendario",
    titulo: "Calendario: editar partidos",
    icono: "calendario",
    descripcion: "Reprogramar, cambiar equipos, estados y video manual.",
    roles: LIGA,
    temas: [
      {
        id: "editar-partido",
        titulo: "Editar un partido completo",
        bloques: [
          {
            tipo: "pasos",
            items: [
              "Entra a **Calendario** y elige el torneo (arriba a la derecha).",
              "Usa los botones **J1, J2, J3…** para moverte entre jornadas.",
              "En el partido que quieras mover, presiona **Editar**.",
              "Puedes cambiar **todo**: los dos equipos, la jornada, la fecha, la hora, la cancha, el árbitro y el estado.",
              "Presiona **Guardar**.",
            ],
          },
          {
            tipo: "p",
            texto:
              "Al elegir los equipos, si esos dos **ya se enfrentaron** en el torneo, aparece " +
              "un aviso amarillo con las jornadas de sus cruces (“⚠ ya tienen 1 cruce " +
              "(J4)”). Es solo un recordatorio: **puedes guardar de todas formas**. También " +
              "te avisa si alguno de los equipos tiene **horario fijo pagado** y estás moviendo " +
              "la hora.",
          },
          {
            tipo: "ojo",
            texto:
              "Si el partido ya tiene ficha, goles o tarjetas capturadas, los equipos **ya no " +
              "se pueden cambiar** (la tabla depende de ellos). Lo demás — fecha, hora, cancha, " +
              "árbitro y video — sí se puede corregir siempre.",
          },
        ],
      },
      {
        id: "estados-partido",
        titulo: "Los estados de un partido",
        bloques: [
          {
            tipo: "lista",
            items: [
              "**Programado**: todavía no se juega. Es el estado normal.",
              "**En vivo**: lo marcas a mano si quieres avisar que se está jugando. Es informativo.",
              "**Suspendido**: se interrumpió (lluvia, pleito…). Se reanuda reprogramándolo.",
              "**Cancelado**: no se jugará. No cuenta para la tabla.",
              "**Finalizado**: no lo pongas a mano — un partido se finaliza **capturando su Ficha Arbitral**, y su marcador solo se corrige desde la ficha.",
            ],
          },
        ],
      },
      {
        id: "video-manual",
        titulo: "El video del partido",
        bloques: [
          {
            tipo: "p",
            texto:
              "Con la liga conectada a DE/SPORTS, cada partido enlaza **solo** a su video, " +
              "usando el día, la cancha y la hora. Si algún partido necesita otro enlace (se " +
              "grabó en otra cámara, por ejemplo), edita el partido y pega la dirección en **URL " +
              "del video**. Si la dejas vacía, vuelve el enlace automático.",
          },
        ],
      },
    ],
  },

  // ── Liga: Ajustes del torneo (bajas) ──────────────────────────────────────
  {
    id: "ajustes-torneo",
    titulo: "Bajas de equipo y ajustes del torneo",
    icono: "torneos",
    descripcion: "Qué hacer cuando un equipo se sale a media temporada.",
    roles: LIGA,
    temas: [
      {
        id: "que-es-ajustes",
        titulo: "La pantalla de Ajustes",
        bloques: [
          {
            tipo: "p",
            texto:
              "Cuando un torneo ya está en marcha y algo cambia — un equipo se sale, o unos " +
              "equipos llevan más juegos que otros — se arregla en **Ajustes**: entra a " +
              "**Torneos** y presiona **Ajustes** en la tarjeta del torneo.",
          },
          {
            tipo: "p",
            texto:
              "Ahí ves una tabla con cada equipo: cuántos partidos lleva **jugados**, cuántos " +
              "tiene **programados** y su total contra la **meta** (las fechas garantizadas del " +
              "torneo). Si un equipo va abajo de la meta, su número sale en amarillo.",
          },
        ],
      },
      {
        id: "baja-equipo",
        titulo: "Dar de baja un equipo del torneo",
        bloques: [
          {
            tipo: "p",
            texto:
              "Regla de oro: el equipo que se va **no se borra y no pierde nada de lo jugado**. " +
              "Sus rivales conservan los puntos y goles de los partidos que ya le jugaron, y el " +
              "equipo aparece en la tabla marcado **(baja)**, hasta abajo.",
          },
          {
            tipo: "pasos",
            items: [
              "En **Ajustes**, busca el equipo y presiona **Dar de baja**.",
              "Elige **desde qué jornada** se retira (el sistema propone su siguiente jornada pendiente).",
              "Lee el aviso: te dice cuántos partidos programados se ven afectados.",
              "Elige qué hacer con esos partidos: **Regenerar automáticamente** o **Ajustar manualmente** (abajo te explico cada una).",
              "Presiona **Dar de baja**.",
            ],
          },
          {
            tipo: "tip",
            texto:
              "¿Te equivocaste? Mientras no regeneres el calendario, presiona **Reactivar** en " +
              "la misma tabla y el equipo vuelve a estar activo como si nada.",
          },
        ],
      },
      {
        id: "regenerar",
        titulo: "Opción A: regenerar automáticamente",
        bloques: [
          {
            tipo: "p",
            texto:
              "El sistema rehace todas las jornadas pendientes **de todos los equipos** para " +
              "que cada uno cierre el torneo con sus fechas garantizadas, aunque el que se fue " +
              "deje un hueco. Reparte los cruces repetidos lo más parejo posible y respeta los " +
              "horarios fijos. Lo ya jugado, en curso o suspendido **no se toca**.",
          },
          {
            tipo: "ojo",
            texto:
              "Al regenerar se pierden las reprogramaciones manuales de los partidos que aún no " +
              "se jugaban (fechas, árbitros y URLs de video que hayas puesto a mano). El botón " +
              "**Regenerar pendientes** de arriba hace esto mismo en cualquier momento — también " +
              "sirve sin bajas, para **emparejar** equipos con juegos desiguales.",
          },
        ],
      },
      {
        id: "ajuste-manual",
        titulo: "Opción B: ajustar manualmente",
        bloques: [
          {
            tipo: "p",
            texto:
              "Si prefieres decidir tú, los partidos del equipo que se fue quedan **pendientes " +
              "de asignar**: siguen en el calendario, pero con el equipo retirado tachado, " +
              "esperando a que elijas quién toma su lugar.",
          },
          {
            tipo: "pasos",
            items: [
              "En **Ajustes**, baja a **Partidos pendientes de asignar**.",
              "En cada partido, abre la lista **Elegir equipo sustituto…** y elige quién jugará contra el rival.",
              "Fíjate en los avisos amarillos: te dicen si esos dos **ya se enfrentaron** y si el sustituto **ya juega esa jornada** (quedaría en jornada doble). Son avisos, no bloqueos.",
              "Presiona **Asignar**. El partido queda normal, con el sustituto en lugar del equipo retirado.",
              "Repite con cada pendiente. Usa la tabla de arriba para ver quién va rezagado y necesita más juegos.",
            ],
          },
          {
            tipo: "tip",
            texto:
              "Mientras haya partidos sin asignar, tu **Dashboard** te lo recuerda con un aviso " +
              "amarillo: “Tienes N partidos pendientes de asignar”, con un enlace " +
              "directo a esta pantalla. Desaparece cuando terminas.",
          },
        ],
      },
    ],
  },

  // ── Ficha arbitral (liga + árbitro) ───────────────────────────────────────
  {
    id: "ficha",
    titulo: "Ficha arbitral",
    icono: "ficha",
    descripcion: "Capturar el resultado de un partido, gol por gol.",
    roles: ["superadmin", "admin_liga", "arbitro"],
    temas: [
      {
        id: "capturar-ficha",
        titulo: "Capturar una ficha, paso a paso",
        bloques: [
          {
            tipo: "p",
            texto:
              "La ficha arbitral es el acta del partido: quién metió gol y en qué minuto, las " +
              "tarjetas y las observaciones. **Al guardarla, el partido queda finalizado** y la " +
              "tabla de posiciones y el goleo se actualizan solos.",
          },
          {
            tipo: "pasos",
            items: [
              "Entra a **Ficha Arbitral** en el menú.",
              "Elige el torneo y busca el partido. Si eres árbitro, solo ves **tus partidos asignados**.",
              "Captura los **goles**: un renglón por goleador — elige el **equipo**, el **jugador que anotó** y escribe el **número de goles** que metió. El marcador se suma solo.",
              "Captura las **tarjetas**: equipo, jugador amonestado, tipo (amarilla o roja) y minuto.",
              "Escribe **observaciones** si pasó algo que la liga deba saber (pleitos, alineación indebida, W.O.…).",
              "Revisa que el marcador final sea correcto y presiona **Guardar ficha**.",
            ],
          },
          {
            tipo: "tip",
            texto:
              "Solo puedes alinear jugadores **activos y aprobados** por la liga. Si un jugador " +
              "no aparece en la lista, su alta sigue pendiente o está dado de baja.",
          },
          {
            tipo: "ojo",
            texto:
              "¿El rival no se presentó o se retiró? Marca **“Partido ganado por " +
              "default”** y elige al ganador: el marcador queda **2-0 por regla**, y los 2 " +
              "goles **sí se capturan** con goleador — del mismo jugador o de dos distintos " +
              "(cuentan para la tabla de goleo). No se capturan tarjetas.",
          },
        ],
      },
      {
        id: "editar-ficha",
        titulo: "Corregir una ficha ya guardada",
        bloques: [
          {
            tipo: "p",
            texto:
              "¿Hubo un error? Las fichas **se pueden editar** después de guardadas, tanto las " +
              "de la jornada actual como las de jornadas anteriores: abre el partido en Ficha " +
              "Arbitral, corrige goles, tarjetas u observaciones y vuelve a guardar. La tabla y " +
              "el goleo se recalculan al momento.",
          },
          {
            tipo: "ojo",
            texto:
              "El marcador de un partido finalizado **solo** se corrige desde su ficha — no " +
              "desde Calendario. Así los goles con nombre siempre cuadran con el marcador.",
          },
        ],
      },
    ],
  },

  // ── Liga: Pagos ───────────────────────────────────────────────────────────
  {
    id: "pagos",
    titulo: "Pagos",
    icono: "pagos",
    descripcion: "Inscripciones, arbitrajes, multas y horarios fijos.",
    roles: LIGA,
    temas: [
      {
        id: "registrar-pagos",
        titulo: "Llevar el control de pagos",
        bloques: [
          {
            tipo: "pasos",
            items: [
              "Entra a **Pagos** y presiona **Nuevo pago**.",
              "Elige el **torneo**, el **equipo** y el **tipo**: Inscripción, Arbitraje, Multa, Horario fijo u Otro.",
              "Escribe el **monto** (y la jornada, si aplica, por ejemplo en arbitrajes).",
              "Guarda. El pago nace **Pendiente**.",
              "Cuando el equipo pague, edítalo y márcalo **Pagado** con su fecha.",
            ],
          },
          {
            tipo: "tip",
            texto:
              "Dos pagos se crean solos: al inscribir a un torneo un equipo con **horario fijo " +
              "pagado**, aparece su pago pendiente por el monto que capturaste en el equipo. " +
              "Los capitanes ven los pagos de su equipo desde su propio panel, así que mantenlos " +
              "al día.",
          },
        ],
      },
    ],
  },

  // ── Liga: Reclamos ────────────────────────────────────────────────────────
  {
    id: "reclamos",
    titulo: "Reclamos",
    icono: "reclamos",
    descripcion: "Protestas, apelaciones y quejas de los equipos.",
    roles: LIGA,
    temas: [
      {
        id: "atender-reclamos",
        titulo: "Atender un reclamo",
        bloques: [
          {
            tipo: "p",
            texto:
              "Los capitanes levantan reclamos desde su panel (una protesta por un partido, una " +
              "apelación de tarjeta, una queja). Te llegan con aviso en la campana.",
          },
          {
            tipo: "pasos",
            items: [
              "Entra a **Reclamos**. Los nuevos están en estado **Pendiente**.",
              "Ábrelo y ponlo **En revisión** mientras lo investigas (el equipo lo ve).",
              "Escribe tu **respuesta** y marca el reclamo **Resuelto** o **Rechazado**.",
              "El capitán recibe el aviso con tu respuesta.",
            ],
          },
        ],
      },
    ],
  },

  // ── Liga: Personalización ─────────────────────────────────────────────────
  {
    id: "personalizacion",
    titulo: "Personalización",
    icono: "personalizacion",
    descripcion: "Tu página pública con tus colores y tu logo.",
    roles: LIGA,
    temas: [
      {
        id: "marca",
        titulo: "Ponle tu marca a la liga",
        bloques: [
          {
            tipo: "pasos",
            items: [
              "Entra a **Personalización**.",
              "Sube el **logo** de tu liga.",
              "Elige tus tres colores: **primario**, **secundario** y **acento**. Con ellos se pinta toda tu página pública.",
              "Sube el **fondo del rol de juegos** (para la imagen del rol que se comparte) y el **fondo para compartir** (la imagen que aparece cuando alguien manda el enlace de tu liga por WhatsApp o Facebook).",
              "Guarda y abre tu página pública para ver cómo quedó.",
            ],
          },
        ],
      },
    ],
  },

  // ── Estadísticas (todos) ──────────────────────────────────────────────────
  {
    id: "estadisticas",
    titulo: "Estadísticas",
    icono: "estadisticas",
    descripcion: "Tabla de posiciones, goleo y tarjetas del torneo.",
    roles: TODOS,
    temas: [
      {
        id: "leer-tablas",
        titulo: "Leer las tablas",
        bloques: [
          {
            tipo: "p",
            texto:
              "En **Estadísticas** eliges el torneo y ves su **tabla de posiciones** (puntos, " +
              "juegos, goles a favor y en contra), la **tabla de goleo** y las **tarjetas**. " +
              "Todo se calcula solo con las fichas arbitrales: si una ficha se corrige, las " +
              "tablas cambian al instante.",
          },
          {
            tipo: "tip",
            texto:
              "Si un equipo aparece con **(baja)** hasta abajo de la tabla, es que se retiró " +
              "del torneo: conserva sus números, pero ya no juega las siguientes jornadas.",
          },
        ],
      },
    ],
  },

  // ── Capitán ───────────────────────────────────────────────────────────────
  {
    id: "capitan",
    titulo: "Guía del capitán",
    icono: "equipos",
    descripcion: "Tu equipo, tus jugadores, tus pagos y tus reclamos.",
    roles: ["admin_equipo"],
    temas: [
      {
        id: "capitan-panorama",
        titulo: "Qué puedes hacer tú",
        bloques: [
          {
            tipo: "p",
            texto:
              "Tu cuenta está ligada a **tu equipo**. Puedes ver los torneos, el calendario y " +
              "las estadísticas de la liga, y administrar lo tuyo: dar de alta jugadores, " +
              "proponer cambios y fotos, dar de baja jugadores, ver los pagos de tu equipo y " +
              "levantar reclamos.",
          },
          {
            tipo: "p",
            texto:
              "Una regla lo explica casi todo: **lo que tú capturas es una propuesta**. La liga " +
              "la revisa y la aprueba (o no). Así nadie mete datos a la página pública sin que " +
              "la liga lo vea primero.",
          },
        ],
      },
      {
        id: "capitan-alta",
        titulo: "Dar de alta un jugador",
        bloques: [
          {
            tipo: "pasos",
            items: [
              "Entra a **Jugadores** y presiona **Nuevo jugador**.",
              "Sube su **foto** y llena sus datos: nombre, apellidos, fecha de nacimiento, **número**, posición, estatura, peso y sexo.",
              "Presiona **Crear jugador**.",
              "Tu jugador queda **Pendiente**: la liga lo revisa y lo aprueba. Te llega un aviso a la campana cuando diga que sí (o que no).",
              "Hasta que lo aprueben, no aparece en la página pública ni puede jugar en fichas.",
            ],
          },
          {
            tipo: "tip",
            texto:
              "¿Te equivocaste en un alta que sigue pendiente? Puedes **eliminarla** tú mismo y " +
              "volverla a capturar bien.",
          },
        ],
      },
      {
        id: "capitan-editar",
        titulo: "Corregir los datos de un jugador",
        bloques: [
          {
            tipo: "p",
            texto:
              "Puedes proponer cambios de **todos los campos** de **todos tus jugadores**, las " +
              "veces que haga falta: número nuevo, apellido mal escrito, posición, foto…",
          },
          {
            tipo: "pasos",
            items: [
              "En **Jugadores**, presiona **Editar** en el jugador.",
              "Corrige lo que necesites (y sube foto nueva si quieres).",
              "Presiona **Enviar cambios**.",
              "El jugador queda con la etiqueta **“Cambios enviados”**. La liga verá una tabla con lo actual y lo propuesto, y aprobará o rechazará.",
              "Te llega el aviso con la decisión. Mientras tanto, los datos oficiales no cambian.",
            ],
          },
          {
            tipo: "ojo",
            texto:
              "Si envías cambios otra vez antes de que revisen los primeros, **la propuesta " +
              "nueva reemplaza a la anterior**. La foto propuesta también espera aprobación: " +
              "mientras tanto se sigue mostrando la foto oficial.",
          },
        ],
      },
      {
        id: "capitan-baja",
        titulo: "Dar de baja un jugador",
        bloques: [
          {
            tipo: "p",
            texto:
              "Si alguien deja tu equipo, dale de baja: **no se borra nada**. Sus goles y " +
              "tarjetas se quedan en la historia del equipo, pero ya no aparece en público ni " +
              "puede alinearse.",
          },
          {
            tipo: "pasos",
            items: [
              "En **Jugadores**, presiona **Dar de baja** en el jugador.",
              "Confirma en la ventana. El jugador pasa a **Inactivo** y la liga recibe el aviso.",
              "Si algún día regresa, pide a la liga que lo **reactive** — eso solo lo puede hacer la liga.",
            ],
          },
        ],
      },
      {
        id: "capitan-pagos-reclamos",
        titulo: "Tus pagos y tus reclamos",
        bloques: [
          {
            tipo: "p",
            texto:
              "En **Pagos** ves lo que tu equipo debe y lo que ya pagó: inscripciones, " +
              "arbitrajes, multas y, si tu equipo paga **horario fijo**, ese cargo también. Los " +
              "pagos los marca como pagados la liga cuando recibe el dinero.",
          },
          {
            tipo: "pasos",
            items: [
              "Para inconformarte por algo, entra a **Reclamos** y presiona **Nuevo reclamo**.",
              "Elige el **tipo** (protesta, apelación o queja), el torneo y el partido si aplica.",
              "Cuenta qué pasó, con detalle, y envíalo.",
              "Sigue su estado ahí mismo: **Pendiente → En revisión → Resuelto o Rechazado**. La respuesta de la liga te llega con aviso.",
            ],
          },
        ],
      },
      {
        id: "capitan-calendario",
        titulo: "Cuándo y dónde juega tu equipo",
        bloques: [
          {
            tipo: "p",
            texto:
              "Tu **Dashboard** te muestra los próximos partidos de tu equipo. En " +
              "**Calendario** ves todas las jornadas del torneo con fecha, hora y cancha, y en " +
              "**Estadísticas** la tabla, el goleo y las tarjetas. Después de cada partido, " +
              "búscalo en la página pública de tu liga y dale a **Revive tu partido** para ver " +
              "el video.",
          },
        ],
      },
    ],
  },

  // ── Árbitro ───────────────────────────────────────────────────────────────
  {
    id: "arbitro",
    titulo: "Guía del árbitro",
    icono: "arbitros",
    descripcion: "Tus partidos asignados y cómo capturar tus fichas.",
    roles: ["arbitro"],
    temas: [
      {
        id: "arbitro-dia",
        titulo: "Tu día de trabajo en el panel",
        bloques: [
          {
            tipo: "pasos",
            items: [
              "Entra al panel con tu usuario. Tu **Dashboard** te muestra tus **fichas por capturar**: los partidos que te asignaron y que ya se jugaron (o se juegan hoy).",
              "En **Calendario** puedes ver todas las jornadas del torneo, con fecha, hora y cancha, para saber dónde te toca.",
              "Después de cada partido, captura su **Ficha Arbitral** (la sección “Ficha arbitral” de esta Ayuda te lleva paso a paso).",
              "Si te equivocaste en algo, puedes abrir la ficha y **corregirla**: la tabla se recalcula sola.",
            ],
          },
          {
            tipo: "tip",
            texto:
              "Solo ves y capturas **tus** partidos asignados. Si un partido que arbitraste no " +
              "te aparece, avisa a la liga para que te lo asigne en el calendario.",
          },
        ],
      },
    ],
  },

  // ── Página pública (todos) ────────────────────────────────────────────────
  {
    id: "publico",
    titulo: "La página pública y los videos",
    icono: "canchas",
    descripcion: "Lo que ve cualquier persona, sin contraseña.",
    roles: TODOS,
    temas: [
      {
        id: "pagina-liga",
        titulo: "La página de la liga",
        bloques: [
          {
            tipo: "p",
            texto:
              "Cada liga tiene su página pública con sus colores y su logo. Cualquier persona " +
              "— jugadores, familias, aficionados — puede ver ahí los **resultados**, la " +
              "**tabla de posiciones**, la **tabla de goleo**, el **rol de juegos** y los " +
              "**equipos con sus plantillas**. No se necesita cuenta ni contraseña.",
          },
        ],
      },
      {
        id: "revive",
        titulo: "Revive tu partido (el video)",
        bloques: [
          {
            tipo: "pasos",
            items: [
              "Entra a la página pública de la liga y busca el partido en resultados o en el rol de juegos.",
              "Si la cancha tiene cámaras DE/SPORTS, el partido trae el botón **▶ Revive tu partido**.",
              "Tócalo y te lleva al video del día, cancha y horario en que se jugó.",
            ],
          },
          {
            tipo: "ojo",
            texto:
              "El video está disponible **durante la semana** siguiente al partido. Si quieres " +
              "conservar tus jugadas, descárgalas a tiempo desde la plataforma de videos.",
          },
        ],
      },
      {
        id: "compartir",
        titulo: "Compartir tablas y resultados",
        bloques: [
          {
            tipo: "p",
            texto:
              "La página pública genera **imágenes listas para compartir** (la tabla, los " +
              "resultados de la jornada, el rol) con el diseño de la liga. Búscalas en la misma " +
              "página y mándalas por WhatsApp o súbelas a redes; además, al compartir el enlace " +
              "de la liga, la vista previa sale con la imagen de la tabla al día.",
          },
        ],
      },
    ],
  },

  // ── FAQ (todos) ───────────────────────────────────────────────────────────
  {
    id: "faq",
    titulo: "Dudas comunes",
    icono: "ayuda",
    descripcion: "Respuestas rápidas a lo que más se pregunta.",
    roles: TODOS,
    temas: [
      {
        id: "faq-lista",
        titulo: "Preguntas y respuestas",
        bloques: [
          {
            tipo: "lista",
            items: [
              "**Olvidé mi contraseña.** Pídele a tu administrador de liga que te ponga una nueva (Configuración → Usuarios → Editar). Si eres admin de liga, pídelo a DE/SPORTS.",
              "**Di de alta un jugador y no aparece en la página pública.** Está pendiente de aprobación por la liga, o está dado de baja. En Jugadores se ve su etiqueta de estado.",
              "**El botón “Revive tu partido” no sale.** El partido debe estar en una cancha con cámaras, con el día y la hora dentro de las franjas de grabación, y el video dura publicado una semana. Si debería estar y no está, la liga puede pegar la URL manual en el partido.",
              "**¿Puedo borrar un equipo o un jugador que ya jugó?** No, y es a propósito: el historial de la liga se protege. Se dan de baja (se desactivan) y conservan su historia.",
              "**La tabla está mal.** La tabla se calcula con las fichas arbitrales. Busca el partido con el marcador incorrecto y corrige su ficha; la tabla se arregla sola.",
              "**Quiero más fechas en mi torneo.** Edita el torneo y sube el número de “Partidos por equipo” antes de generar el calendario. El sistema reparte los cruces repetidos parejo.",
              "**Un equipo se salió del torneo.** No lo quites de la lista de equipos: usa Torneos → Ajustes → Dar de baja, y elige regenerar el calendario o asignar sustitutos a mano.",
              "**¿Puedo usar el panel desde el celular?** Sí, todo el panel funciona en el teléfono — la ficha arbitral está pensada para capturarse desde la cancha.",
            ],
          },
        ],
      },
    ],
  },
];

/** Secciones visibles para un rol, en el orden del manual. */
export function seccionesParaRol(rol: RolAyuda): Seccion[] {
  return SECCIONES.filter((s) => s.roles.includes(rol));
}
