(() => {
  "use strict";
  const STORE = "club5am.v1";
  const SESSION = "club5am.session.v2";
  const CFG = window.CLUB5AM_SUPABASE || {};
  const supabaseReady = !!(window.supabase && CFG.url && CFG.anonKey && !CFG.url.includes("PEGAR_") && !CFG.anonKey.includes("PEGAR_"));
  const sb = supabaseReady ? window.supabase.createClient(CFG.url, CFG.anonKey, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}) : null;
  let currentUser = null, remoteLoading = false, saveTimer = null;
  const $ = (id) => document.getElementById(id);
  const todayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  };
  const dateObj = (key) => new Date(`${key}T12:00:00`);
  const dateLabel = (key) => dateObj(key).toLocaleDateString("es-CL",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  const timeLabel = (iso) => iso ? new Date(iso).toLocaleTimeString("es-CL",{hour:"2-digit",minute:"2-digit"}) : "—";
  const safeParse = (s, fallback) => { try { return s ? JSON.parse(s) : fallback; } catch { return fallback; } };
  const defaultData = () => ({
    version:2, settings:{startDate:"2026-10-13",targetDate:"2027-01-01",wakeGoal:"05:00",morningActivation:"Marcha en el sitio, movilidad de hombros, cadera y tobillos, sentadillas sin peso y bisagras de cadera. Aumente la intensidad gradualmente y mantenga la técnica.",meditationMinutes:10,readingMinutes:10},
    days:{}, weights:[], books:[
      {title:"Meditaciones",author:"Marco Aurelio"},
      {title:"Los 7 hábitos de la gente altamente efectiva",author:"Stephen R. Covey"},
      {title:"Hábitos atómicos",author:"James Clear"}
    ], plans:null, weeklyDefaults:{"1":"mon","2":"tue","4":"thu","5":"fri"}, schedule:{}
  });
  let data = safeParse(localStorage.getItem(STORE), null) || defaultData();
  if (data.settings && data.settings.startDate === "2026-10-12") data.settings.startDate = "2026-10-13";
  if (!data.books) data.books = defaultData().books;
  if (!data.weeklyDefaults) data.weeklyDefaults = {"1":"mon","2":"tue","4":"thu","5":"fri"};
  if (!data.schedule) data.schedule = {};
  let currentKey = todayKey();
  let passwordChangeMode = false;

  const baseWorkouts = {
    1:{title:"Lunes — Torso A",intro:"Empuje y espalda. Descanse 60–90 s entre series; use una carga que permita técnica limpia.",exercises:[
      ["Press de banca con mancuernas","2×10–12 (sem. 1–2); luego 3×8–12","Pecho"],
      ["Remo con mancuernas apoyado en banco","2×10–12; luego 3×10–12","Espalda"],
      ["Press militar sentado","2×10; luego 2–3×10–12","Hombros"],
      ["Aperturas con mancuernas","1×12; luego 2×12–15","Pecho"],
      ["Extensión de tríceps por encima de la cabeza","1×12; luego 2×12–15","Tríceps"]
    ]},
    2:{title:"Martes — Piernas A",intro:"Piernas y abdomen. Empiece con un rango cómodo y priorice equilibrio y control.",exercises:[
      ["Sentadilla goblet","2×10; luego 3×10–12","Cuádriceps/glúteos"],
      ["Peso muerto rumano con mancuernas","2×10; luego 3×10–12","Isquiotibiales/glúteos"],
      ["Zancada estática","1×8 por pierna; luego 2–3×10–12","Piernas"],
      ["Elevación de talones de pie","2×15; luego 3×15–20","Pantorrillas"],
      ["Elevaciones de rodillas tumbado","2×10; luego 2–3×12–15","Abdomen"]
    ]},
    4:{title:"Jueves — Torso B",intro:"Tracción, pecho y brazos. Mantenga el movimiento controlado, sin balanceos.",exercises:[
      ["Remo con mancuerna a una mano","2×10 por lado; luego 3×8–12","Espalda"],
      ["Press inclinado con mancuernas","2×10; luego 3×10–12","Pecho superior"],
      ["Elevaciones laterales","1×12; luego 2–3×12–15","Hombros"],
      ["Pájaros con mancuernas","1×12; luego 2×12–15","Hombro posterior"],
      ["Curl de bíceps alterno","1×12; luego 2–3×10–12","Bíceps"]
    ]},
    5:{title:"Viernes — Piernas B",intro:"Piernas y estabilidad del tronco. En la sentadilla búlgara, comience sin peso y use apoyo si lo necesita.",exercises:[
      ["Sentadilla búlgara","1×8 por pierna sin peso; luego 2–3×8–10","Cuádriceps/glúteos"],
      ["Puente de glúteos en banco","2×12; luego 2–3×12–15","Glúteos"],
      ["Sentadilla sumo con mancuerna","1×10; luego 2–3×10–12","Piernas"],
      ["Elevación de talones sentado","2×12–15; luego 3×15","Pantorrillas"],
      ["Plancha abdominal","2×15–25 s; luego 2–3×30–45 s","Abdomen"]
    ]}
  };
  const planLabels = {mon:"Lunes",tue:"Martes",wed:"Miércoles",thu:"Jueves",fri:"Viernes",sat:"Sábado",sun:"Domingo"};
  function getPlans() {
    if (!data.plans) {
      data.plans = {};
      Object.entries(baseWorkouts).forEach(([day, plan]) => {
        const id = "base-" + day;
        data.plans[id] = {id, name:plan.title, exercises:plan.exercises.map(x=>({name:x[0],prescription:x[1],muscle:x[2]}))};
        if (!data.weeklyDefaults) data.weeklyDefaults = {};
        const existing = data.weeklyDefaults[day];
        if (!existing || existing === ({1:"mon",2:"tue",4:"thu",5:"fri"}[day]) || !data.plans[existing]) data.weeklyDefaults[day] = id;
      });
    }
    return data.plans;
  }
  function workoutFor(key) {
    const explicit = data.schedule && data.schedule[key];
    const day = weekday(key);
    const defaultId = data.weeklyDefaults && data.weeklyDefaults[String(day)];
    const id = explicit === "__rest__" ? null : (explicit || defaultId);
    if (!id) return null;
    const plan = getPlans()[id];
    return plan ? {id:plan.id,title:plan.name,intro:"Siga la rutina configurada. Descanse 60–90 segundos cuando corresponda y priorice técnica, control y recuperación.",exercises:plan.exercises.map(x=>[x.name,x.prescription,x.muscle])} : null;
  }
  const weekday = (key) => dateObj(key).getDay();
  const dayTemplate = (key) => ({
    date:key,wakeAt:null,morning:{activation:false,meditation:false,reading:false,victoryAt:null,book:"Meditaciones — Marco Aurelio",readingNotes:""},
    workout:{tasks:[],logs:{},notes:"",energy:"",duration:"",savedAt:null},closedAt:null,weight:null
  });
  const getDay = (key=currentKey) => { if(!data.days[key]) data.days[key]=dayTemplate(key); return data.days[key]; };
  const persist = () => {
    localStorage.setItem(STORE, JSON.stringify(data));
    if (!sb || !currentUser || remoteLoading) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      const {error} = await sb.from("user_state").upsert({user_id:currentUser.id,payload:data,updated_at:new Date().toISOString()},{onConflict:"user_id"});
      if(error) toast("Guardado localmente, pero falló la sincronización con Supabase.");
    }, 500);
  };
  const toast = (msg) => { const el=$("toast"); el.textContent=msg; el.classList.add("show"); setTimeout(()=>el.classList.remove("show"),2600); };
  const escapeHtml = (s) => String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  async function loadRemoteData() {
    if (!sb || !currentUser) return;
    remoteLoading = true;
    const {data: row,error} = await sb.from("user_state").select("payload").eq("user_id",currentUser.id).maybeSingle();
    if(error){remoteLoading=false;toast("No se pudieron cargar los datos remotos; revise la conexión.");return;}
    if(row && row.payload){data=row.payload; if(!data.books)data.books=defaultData().books;if(!data.schedule)data.schedule={};if(!data.weights)data.weights=[];}
    else {
      const local=safeParse(localStorage.getItem(STORE),null); if(local && Object.keys(local.days||{}).length)data=local;
      const {error:saveError}=await sb.from("user_state").upsert({user_id:currentUser.id,payload:data,updated_at:new Date().toISOString()},{onConflict:"user_id"});
      if(saveError)toast("Sesión iniciada, pero no se pudo crear el registro inicial.");
    }
    localStorage.setItem(STORE,JSON.stringify(data)); remoteLoading=false;
  }
  function setupAuth() {
    $("lockTitle").textContent="Bienvenido al Club, Vicente.";
    $("lockCopy").textContent=supabaseReady?"Inicie sesión con su cuenta privada.":"Configure la URL y la clave pública de Supabase en supabase-config.js.";
    $("passwordLabel").textContent="Contraseña"; $("passwordSubmit").textContent="Iniciar sesión";
    $("usernameInput").value=""; $("passwordInput").placeholder="Contraseña";
    $("passwordError").textContent="";
    $("passwordForm").onsubmit=async(e)=>{
      e.preventDefault(); if(!supabaseReady){$("passwordError").textContent="Supabase no está configurado. Consulte README.md.";return;}
      const btn=$("passwordSubmit");btn.disabled=true;btn.textContent="Conectando…";
      const {data:authData,error}=await sb.auth.signInWithPassword({email:$("usernameInput").value.trim(),password:$("passwordInput").value});
      btn.disabled=false;btn.textContent="Iniciar sesión";
      if(error){$("passwordError").textContent="No se pudo iniciar sesión. Verifique sus credenciales.";return;}
      currentUser=authData.user;sessionStorage.setItem(SESSION,"yes");await loadRemoteData();$("passwordInput").value="";showApp();
    };
  }
  function showApp() {
    $("lockScreen").classList.add("hidden");$("dashboard").classList.remove("hidden");$("lockBtn").classList.remove("hidden");
    rollover();getPlans();renderToday();renderProgress();renderHistory();fillSettings();renderSchedule();renderPlanEditor();renderBooks();
  }
  async function logout() {
    if(sb) await sb.auth.signOut(); currentUser=null;sessionStorage.removeItem(SESSION);
    $("dashboard").classList.add("hidden");$("lockScreen").classList.remove("hidden");$("lockBtn").classList.add("hidden");setupAuth();toast("Sesión cerrada.");
  }
  function rollover() {
    const now=todayKey();
    // Fill in missed days between the last known record and today without overwriting saved data.
    const keys=Object.keys(data.days).sort();
    if(keys.length){
      const last=keys[keys.length-1];
      let cursor=dateObj(last);const end=dateObj(now);
      while(cursor<end){cursor.setDate(cursor.getDate()+1);const k=`${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,"0")}-${String(cursor.getDate()).padStart(2,"0")}`;if(k<now && !data.days[k]){data.days[k]=dayTemplate(k);data.days[k].closedAt=new Date(`${k}T23:59:59`).toISOString();}}
    }
    currentKey=now;getDay();persist();
  }
  function renderToday() {
    currentKey=todayKey();const day=getDay();const d=dateObj(currentKey);const w=workoutFor(currentKey);
    $("dateLine").textContent=d.toLocaleDateString("es-CL",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
    const h=new Date().getHours();$("greeting").textContent=h<12?"Buenos días.":h<19?"Buenas tardes.":"Buenas noches.";
    $("wakePanel").classList.toggle("hidden",!!day.wakeAt);
    $("wakeStatus").textContent=day.wakeAt?`Despertar registrado a las ${timeLabel(day.wakeAt)}.`:"Aún no ha registrado su despertar de hoy.";
    $("morningSection").classList.toggle("hidden",!day.wakeAt);
    $("morningTasks").innerHTML=[
      ["activation","Activación física","5–10 min · movilidad y ejercicios suaves al principio"],
      ["meditation","Meditación","10 min · respiración, atención y serenidad"],
      ["reading","Lectura consciente",`${Number(data.settings.readingMinutes)||10} min · lea sin distracciones`]
    ].map(([id,title,desc])=>`<label class="task ${day.morning[id]?"done":""}"><input type="checkbox" data-morning="${id}" ${day.morning[id]?"checked":""}><span><strong>${title}</strong><small>${id==="activation"?escapeHtml(data.settings.morningActivation):desc}</small></span></label>`).join("");
    $("morningProgress").textContent=`${["activation","meditation","reading"].filter(k=>day.morning[k]).length}/3 completados`;
    const currentBook = day.morning.book || (data.books[0] ? `${data.books[0].title}${data.books[0].author ? " — "+data.books[0].author : ""}` : "");
    $("bookSelect").innerHTML = data.books.map(b=>{const label=`${b.title}${b.author ? " — "+b.author : ""}`;return `<option value="${escapeHtml(label)}">${escapeHtml(label)}</option>`;}).join("") + `<option value="Otro libro">Otro libro</option>`;
    $("bookSelect").value = [...$("bookSelect").options].some(o=>o.value===currentBook) ? currentBook : (data.books[0] ? `${data.books[0].title}${data.books[0].author ? " — "+data.books[0].author : ""}` : "Otro libro");
    $("customBook").classList.toggle("hidden", $("bookSelect").value!=="Otro libro");
    $("customBook").value=day.morning.customBook||"";
    $("readingNotes").value=day.morning.readingNotes||"";
    $("victoryBtn").disabled=!!day.morning.victoryAt;
    $("victoryBtn").textContent=day.morning.victoryAt?`Hora de la Victoria registrada · ${timeLabel(day.morning.victoryAt)}`:"Registrar Hora de la Victoria";
    $("morningHint").textContent=day.morning.victoryAt?"La victoria de hoy quedó registrada. Siga con su día.":"Complete las tres tareas y registre su Hora de la Victoria.";
    $("afternoonSection").classList.remove("hidden");
    $("workoutTitle").textContent=w?w.title:(weekday(currentKey)===3?"Miércoles — Recuperación activa":weekday(currentKey)===6?"Sábado — Recuperación activa":"Domingo — Descanso y revisión");
    $("workoutDayType").textContent=w?"Fuerza":weekday(currentKey)===0?"Descanso":"Recuperación";
    $("workoutIntro").textContent=w?w.intro:weekday(currentKey)===0?"Descanso. Puede realizar movilidad ligera y revisar la semana, sin obligación de entrenar.":"Caminata suave opcional de 15–30 minutos y movilidad ligera. Mantenga la recuperación como prioridad.";
    const tasks=w?w.exercises.map((ex,i)=>({id:"ex"+i,title:ex[0],desc:`${ex[1]} · ${ex[2]}`})):[{id:"walk",title:"Caminata o paseo suave (opcional)",desc:"15–30 min a un ritmo cómodo."},{id:"mobility",title:"Movilidad ligera (opcional)",desc:"5–10 min sin dolor ni fatiga."}];
    $("workoutTasks").innerHTML=tasks.map(t=>`<label class="task ${day.workout.tasks.includes(t.id)?"done":""}"><input type="checkbox" data-workout-task="${t.id}" ${day.workout.tasks.includes(t.id)?"checked":""}><span><strong>${escapeHtml(t.title)}</strong><small>${escapeHtml(t.desc)}</small></span></label>`).join("");
    $("exerciseLog").innerHTML=w?w.exercises.map((ex,i)=>{const log=day.workout.logs["ex"+i]||{};return `<div class="exercise-row"><div><strong>${escapeHtml(ex[0])}</strong><br><span>${escapeHtml(ex[1])}</span></div><div><label for="weight${i}">Peso (kg)</label><input id="weight${i}" data-log="ex${i}" data-field="weight" type="number" min="0" step="0.5" value="${escapeHtml(log.weight||"")}" placeholder="kg"></div><div><label for="reps${i}">Reps / series</label><input id="reps${i}" data-log="ex${i}" data-field="reps" value="${escapeHtml(log.reps||"")}" placeholder="Ej. 12, 12, 10"></div></div>`;}).join(""):`<p class="muted small">Hoy no hay sesión de fuerza programada. Use este espacio para registrar notas si lo desea.</p>`;
    $("sessionNotes").value=day.workout.notes||"";$("energyRating").value=day.workout.energy||"";$("sessionDuration").value=day.workout.duration||"";
    $("closeDayStatus").textContent=day.closedAt?`Día cerrado: ${timeLabel(day.closedAt)}.`:"";
    $("streakCount").textContent=calculateStreak();
    bindTodayEvents();persist();
  }
  function bindTodayEvents(){
    document.querySelectorAll("[data-morning]").forEach(el=>el.onchange=()=>{const d=getDay();d.morning[el.dataset.morning]=el.checked;persist();renderToday();});
    document.querySelectorAll("[data-workout-task]").forEach(el=>el.onchange=()=>{const d=getDay(),id=el.dataset.workoutTask;d.workout.tasks=el.checked?[...new Set([...d.workout.tasks,id])]:d.workout.tasks.filter(x=>x!==id);persist();renderToday();});
    document.querySelectorAll("[data-log]").forEach(el=>el.onchange=()=>{const d=getDay();d.workout.logs[el.dataset.log]=d.workout.logs[el.dataset.log]||{};d.workout.logs[el.dataset.log][el.dataset.field]=el.value;persist();});
  }
  function calculateStreak(){
    let n=0,cursor=dateObj(todayKey());
    while(true){const k=`${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,"0")}-${String(cursor.getDate()).padStart(2,"0")}`;const d=data.days[k];if(!d||!(d.morning.victoryAt||d.workout.savedAt||d.closedAt))break;n++;cursor.setDate(cursor.getDate()-1);if(n>1000)break;}
    return n;
  }
  function saveWorkoutFields(){
    const d=getDay();
    document.querySelectorAll("[data-log]").forEach(el=>{d.workout.logs[el.dataset.log]=d.workout.logs[el.dataset.log]||{};d.workout.logs[el.dataset.log][el.dataset.field]=el.value;});
    d.workout.notes=$("sessionNotes").value;d.workout.energy=$("energyRating").value;d.workout.duration=$("sessionDuration").value;
  }
  function renderProgress(){
    const range=$("progressRange").value;const all=Object.keys(data.days).sort();let keys=all;
    if(range!=="all"){const cutoff=dateObj(todayKey());cutoff.setDate(cutoff.getDate()-Number(range)+1);const min=`${cutoff.getFullYear()}-${String(cutoff.getMonth()+1).padStart(2,"0")}-${String(cutoff.getDate()).padStart(2,"0")}`;keys=all.filter(k=>k>=min&&k<=todayKey());}
    const days=keys.map(k=>data.days[k]);const recorded=days.filter(d=>d.wakeAt||d.morning.victoryAt||d.workout.savedAt||d.closedAt);
    const victories=recorded.filter(d=>d.morning.victoryAt).length;const workouts=recorded.filter(d=>d.workout.savedAt&&workoutFor(d.date)).length;
    const wake=recorded.filter(d=>d.wakeAt).map(d=>new Date(d.wakeAt).getHours()*60+new Date(d.wakeAt).getMinutes());
    $("statDays").textContent=recorded.length;$("statWake").textContent=wake.length?`${String(Math.floor(wake.reduce((a,b)=>a+b,0)/wake.length/60)).padStart(2,"0")}:${String(Math.round(wake.reduce((a,b)=>a+b,0)/wake.length)%60).padStart(2,"0")}`:"—";
    $("statVictory").textContent=recorded.length?`${Math.round(victories/recorded.length*100)}%`:"0%";$("statWorkouts").textContent=workouts;
    const chartKeys=keys.slice(-14);$("consistencyChart").innerHTML=chartKeys.length?chartKeys.map(k=>{const d=data.days[k],total=3+(workoutFor(k)?workoutFor(k).exercises.length:2),done=["activation","meditation","reading"].filter(x=>d.morning[x]).length+(d.workout.tasks||[]).length;const pct=Math.round(done/total*100);return `<div class="bar-col" title="${escapeHtml(dateLabel(k))}: ${pct}%"><div class="bar" style="height:${Math.max(3,pct)}px"></div><small>${k.slice(8)}</small></div>`;}).join(""):`<p class="muted small">Aún no hay datos. Registre su primera jornada para iniciar las estadísticas.</p>`;
    const misses={activation:0,meditation:0,reading:0,wake:0,workout:0};recorded.forEach(d=>{if(!d.morning.activation)misses.activation++;if(!d.morning.meditation)misses.meditation++;if(!d.morning.reading)misses.reading++;if(!d.wakeAt)misses.wake++;if(workoutFor(d.date)&&!d.workout.savedAt)misses.workout++;});
    const names={activation:"Activación matutina",meditation:"Meditación",reading:"Lectura",wake:"Despertar registrado",workout:"Registro de fuerza"};
    const top=Object.entries(misses).sort((a,b)=>b[1]-a[1]).slice(0,3);
    $("improvementList").innerHTML=recorded.length?top.map(([k,v])=>`<div class="insight"><strong>${names[k]}</strong><br>${v===0?"Sin omisiones en los días registrados.":`Pendiente en ${v} de ${recorded.length} jornadas registradas. Elija una acción pequeña para mejorar esta semana.`}</div>`).join(""):`<p class="muted small">Cuando registre días, aquí aparecerán los hábitos que más conviene reforzar.</p>`;
    $("progressInsight").textContent=recorded.length?`Ha registrado ${recorded.length} jornadas. Su objetivo no es una racha perfecta, sino mejorar la consistencia y retomar rápido después de una omisión. La comparación más útil es con su propia semana anterior.`:"El progreso empieza con el primer registro. La constancia se mide con datos, no con impresiones.";
    $("weightHistory").innerHTML=data.weights.slice().reverse().slice(0,8).map(x=>`<div class="history-item"><span>${escapeHtml(x.date)}</span><strong>${escapeHtml(x.weight)} kg</strong></div>`).join("");
  }
  function renderHistory(){
    const keys=Object.keys(data.days).sort().reverse();
    $("historyList").innerHTML=keys.length?keys.map(k=>{const d=data.days[k];const count=["activation","meditation","reading"].filter(x=>d.morning[x]).length;const workout=!!d.workout.savedAt;return `<div class="history-item"><div><strong>${escapeHtml(dateLabel(k))}</strong><small>Despertar: ${timeLabel(d.wakeAt)} · Victoria: ${timeLabel(d.morning.victoryAt)}</small><br><small>Mañana: ${count}/3 · Entrenamiento: ${workout?"registrado":"sin registrar"}${d.closedAt?" · día cerrado":""}</small></div><button class="secondary" data-open-day="${k}" type="button">Ver</button></div>`;}).join(""):`<p class="muted">Todavía no hay historial. Registre su primera jornada.</p>`;
    document.querySelectorAll("[data-open-day]").forEach(b=>b.onclick=()=>{if(b.dataset.openDay!==todayKey()){toast("El historial es de consulta; el día actual se muestra en Hoy.");return;}switchView("todayView");});
  }
  function renderSchedule() {
    getPlans();
    const date = $("scheduleDate").value || todayKey();
    $("scheduleWorkout").innerHTML = `<option value="__rest__">Descanso / sin entrenamiento</option>` + Object.values(data.plans).map(p=>`<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`).join("");
    $("scheduleWorkout").value = data.schedule[date] || data.weeklyDefaults[String(weekday(date))] || "__rest__";
    const start = dateObj(todayKey()); const mondayOffset = (start.getDay()+6)%7; start.setDate(start.getDate()-mondayOffset);
    const keys=[]; for(let i=0;i<7;i++){const d=new Date(start);d.setDate(start.getDate()+i);keys.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`);}
    $("weekSchedule").innerHTML = keys.map(k=>{const plan=workoutFor(k);return `<div class="week-row"><div><strong>${escapeHtml(dateObj(k).toLocaleDateString("es-CL",{weekday:"long"}))}</strong><small>${escapeHtml(k)}</small></div><div><span class="week-plan">${escapeHtml(plan?plan.title:"Descanso")}</span>${data.schedule[k]?'<small>Personalizado</small>':'<small>Plan base</small>'}</div><button class="secondary" data-edit-date="${k}" type="button">Cambiar</button></div>`;}).join("");
    $("weeklyDefaults").innerHTML = [1,2,3,4,5,6,0].map(day=>{const key=String(day),label=["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"][day],val=data.weeklyDefaults[key]||"__rest__";return `<div class="weekly-default-row"><label for="default-${key}">${label}</label><select id="default-${key}" data-weekday="${key}"><option value="__rest__">Descanso</option>${Object.values(data.plans).map(p=>`<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`).join("")}</select></div>`;}).join("");
    document.querySelectorAll("[data-weekday]").forEach(s=>s.value=data.weeklyDefaults[s.dataset.weekday]||"__rest__");
    document.querySelectorAll("[data-edit-date]").forEach(b=>b.onclick=()=>{$("scheduleDate").value=b.dataset.editDate;renderSchedule();});
  }
  function renderPlanEditor() {
    getPlans();
    const selected=$("planEditorSelect").value || Object.keys(data.plans)[0];
    $("planEditorSelect").innerHTML=Object.values(data.plans).map(p=>`<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`).join("");
    $("planEditorSelect").value=data.plans[selected]?selected:Object.keys(data.plans)[0];
    const plan=data.plans[$("planEditorSelect").value]; if(!plan)return;
    $("planName").value=plan.name;
    $("planExercises").innerHTML=plan.exercises.map((e,i)=>`<div class="plan-exercise-row"><div><strong>${escapeHtml(e.name)}</strong><small>${escapeHtml(e.prescription)} · ${escapeHtml(e.muscle||"Sin grupo definido")}</small></div><button class="danger" data-remove-exercise="${i}" type="button">Quitar</button></div>`).join("") || `<p class="muted small">Esta rutina aún no tiene ejercicios.</p>`;
    document.querySelectorAll("[data-remove-exercise]").forEach(b=>b.onclick=()=>{const p=data.plans[$("planEditorSelect").value];p.exercises.splice(Number(b.dataset.removeExercise),1);persist();renderPlanEditor();toast("Ejercicio quitado de la rutina.");});
  }
  function renderBooks() {
    $("bookLibrary").innerHTML=data.books.map((b,i)=>`<div class="book-row"><div><strong>${escapeHtml(b.title)}</strong><small>${escapeHtml(b.author||"Autor no indicado")}</small></div><button class="danger" data-remove-book="${i}" type="button">Quitar</button></div>`).join("") || `<p class="muted small">Todavía no hay libros. Agregue uno para usarlo en la lectura matutina.</p>`;
    document.querySelectorAll("[data-remove-book]").forEach(b=>b.onclick=()=>{if(data.books.length<=1){toast("Mantenga al menos un libro en la biblioteca.");return;}data.books.splice(Number(b.dataset.removeBook),1);persist();renderBooks();renderToday();});
  }
  function fillSettings(){for(const k of ["startDate","targetDate","wakeGoal","morningActivation","meditationMinutes","readingMinutes"])$(k).value=data.settings[k]??"";}
  function switchView(id){document.querySelectorAll(".view").forEach(v=>v.classList.toggle("hidden",v.id!==id));document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active",t.dataset.view===id));if(id==="progressView")renderProgress();if(id==="historyView")renderHistory();if(id==="scheduleView")renderSchedule();if(id==="plansView")renderPlanEditor();if(id==="settingsView")renderBooks();}
  $("wakeBtn").onclick=()=>{const d=getDay();if(!d.wakeAt){d.wakeAt=new Date().toISOString();persist();renderToday();toast(`Despertar registrado: ${timeLabel(d.wakeAt)}.`);}};
  $("victoryBtn").onclick=()=>{const d=getDay();if(!["activation","meditation","reading"].every(k=>d.morning[k])){toast("Complete activación, meditación y lectura antes de registrar la victoria.");return;}d.morning.victoryAt=new Date().toISOString();d.morning.book=$("bookSelect").value==="Otro libro"?($("customBook").value.trim()||"Otro libro"):$("bookSelect").value;d.morning.customBook=$("customBook").value;d.morning.readingNotes=$("readingNotes").value;persist();renderToday();renderProgress();toast("Hora de la Victoria registrada.");};
  $("bookSelect").onchange=()=>{$("customBook").classList.toggle("hidden",$("bookSelect").value!=="Otro libro");};
  $("saveDayBtn").onclick=()=>{const d=getDay();saveWorkoutFields();d.workout.savedAt=new Date().toISOString();persist();renderProgress();renderHistory();toast("Registro del día guardado.");};
  $("closeDayBtn").onclick=()=>{const d=getDay();saveWorkoutFields();d.closedAt=new Date().toISOString();persist();renderToday();renderProgress();renderHistory();toast("Día cerrado y guardado.");};
  $("progressRange").onchange=renderProgress;
  $("saveWeightBtn").onclick=()=>{const weight=Number($("bodyWeight").value),date=$("bodyMeasureDate").value||todayKey();if(!weight||weight<20||weight>300){toast("Ingrese un peso válido.");return;}data.weights=data.weights.filter(x=>x.date!==date);data.weights.push({date,weight});data.weights.sort((a,b)=>a.date.localeCompare(b.date));persist();renderProgress();toast("Medición guardada.");};
  $("exportBtn").onclick=()=>{const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`club-5am-respaldo-${todayKey()}.json`;a.click();URL.revokeObjectURL(url);};
  $("importBtn").onclick=async()=>{const file=$("importFile").files[0];if(!file){toast("Seleccione un archivo JSON.");return;}if(!sb||!currentUser){toast("Inicie sesión primero.");return;}if(!confirm("¿Reemplazar los datos de su cuenta por este respaldo? Exporte primero una copia."))return;try{const x=JSON.parse(await file.text());if(!x||!x.days||!x.settings)throw Error("invalid");data=x;if(!data.books)data.books=defaultData().books;if(!data.schedule)data.schedule={};if(!data.weights)data.weights=[];const {error}=await sb.from("user_state").upsert({user_id:currentUser.id,payload:data,updated_at:new Date().toISOString()},{onConflict:"user_id"});if(error)throw error;localStorage.setItem(STORE,JSON.stringify(data));renderToday();renderProgress();renderHistory();renderSchedule();renderPlanEditor();renderBooks();toast("Respaldo importado y sincronizado.");}catch(e){toast("No se pudo importar. Verifique que sea un respaldo JSON válido.");}};
  $("scheduleDate").value=todayKey();
  $("scheduleDate").onchange=renderSchedule;
  $("assignWorkoutBtn").onclick=()=>{const date=$("scheduleDate").value;if(!date){toast("Seleccione una fecha.");return;}const id=$("scheduleWorkout").value;if(id==="__rest__")data.schedule[date]="__rest__";else data.schedule[date]=id;persist();renderSchedule();if(date===todayKey())renderToday();renderProgress();toast("Planificación actualizada.");};
  $("clearScheduleBtn").onclick=()=>{const date=$("scheduleDate").value;if(date){delete data.schedule[date];persist();renderSchedule();if(date===todayKey())renderToday();toast("Se restauró el plan base para esa fecha.");}};
  $("resetWeekBtn").onclick=()=>{const start=dateObj(todayKey());start.setDate(start.getDate()-((start.getDay()+6)%7));for(let i=0;i<7;i++){const d=new Date(start);d.setDate(start.getDate()+i);const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;delete data.schedule[k];}persist();renderSchedule();renderToday();toast("Semana restablecida al plan base.");};
  $("saveWeeklyDefaultsBtn").onclick=()=>{document.querySelectorAll("[data-weekday]").forEach(s=>{if(s.value==="__rest__")delete data.weeklyDefaults[s.dataset.weekday];else data.weeklyDefaults[s.dataset.weekday]=s.value;});persist();renderSchedule();renderToday();toast("Plan semanal guardado.");};
  $("planEditorSelect").onchange=renderPlanEditor;
  $("addExerciseBtn").onclick=()=>{const name=$("newExerciseName").value.trim();if(!name){toast("Escriba el nombre del ejercicio.");return;}const plan=data.plans[$("planEditorSelect").value];plan.exercises.push({name,prescription:$("newExercisePrescription").value.trim()||"2×10–12",muscle:$("newExerciseMuscle").value.trim()||"Por definir"});$("newExerciseName").value="";$("newExercisePrescription").value="";$("newExerciseMuscle").value="";persist();renderPlanEditor();toast("Ejercicio agregado.");};
  $("savePlanBtn").onclick=()=>{const p=data.plans[$("planEditorSelect").value];const name=$("planName").value.trim();if(!name){toast("La rutina necesita un nombre.");return;}p.name=name;persist();renderPlanEditor();renderSchedule();renderToday();toast("Rutina guardada.");};
  $("createPlanBtn").onclick=()=>{const name=$("newPlanName").value.trim();if(!name){toast("Escriba un nombre para la rutina.");return;}const id="custom-"+Date.now();data.plans[id]={id,name,exercises:[]};$("newPlanName").value="";persist();renderPlanEditor();renderSchedule();$("planEditorSelect").value=id;renderPlanEditor();toast("Rutina nueva creada. Agregue ejercicios desde el editor.");};
  $("addBookBtn").onclick=()=>{const title=$("newBookTitle").value.trim();const author=$("newBookAuthor").value.trim();if(!title){toast("Escriba el título del libro.");return;}if(data.books.some(b=>b.title.toLowerCase()===title.toLowerCase()&&(b.author||"").toLowerCase()===author.toLowerCase())){toast("Ese libro ya está en la biblioteca.");return;}data.books.push({title,author});$("newBookTitle").value="";$("newBookAuthor").value="";persist();renderBooks();renderToday();toast("Libro agregado a la biblioteca.");};
  $("saveSettingsBtn").onclick=()=>{for(const k of ["startDate","targetDate","wakeGoal","morningActivation"])data.settings[k]=$(k).value;data.settings.meditationMinutes=Number($("meditationMinutes").value)||10;data.settings.readingMinutes=Number($("readingMinutes").value)||10;persist();renderToday();toast("Ajustes guardados.");};
  $("changePasswordBtn").onclick=()=>{toast("Use la recuperación de contraseña de Supabase Auth o administre la cuenta desde el panel Supabase.");};
  $("clearDataBtn").onclick=()=>{if(confirm("¿Eliminar todos los entrenamientos, estadísticas y mediciones guardadas en este navegador? Esta acción no se puede deshacer.")){data=defaultData();persist();renderToday();renderProgress();renderHistory();fillSettings();toast("Registros eliminados.");}};
  $("lockBtn").onclick=logout;
  document.querySelectorAll(".tab").forEach(t=>t.onclick=()=>switchView(t.dataset.view));
  // The page checks the date on every load. For a static site, it cannot run while the browser is closed;
  // missed calendar days are marked on the next visit, without inventing workout completions.
  setupAuth();
  if(sb) sb.auth.getSession().then(async({data:sd})=>{if(sd.session){currentUser=sd.session.user;await loadRemoteData();showApp();}});
})();