(function () {
  "use strict";

  function safe(fn, nombre) { try { fn(); } catch (e) { if (window.console) console.warn("[" + nombre + "]", e); } }
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reducido = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var tieneIO = "IntersectionObserver" in window;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  /* ---------- números que cuentan (de un valor a otro) ---------- */
  function formatoCuenta(el, v) {
    var d = parseInt(el.getAttribute("data-dec") || "0", 10);
    return (el.getAttribute("data-pre") || "") + v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function animarCuenta(el, desde) {
    var fin = parseFloat(el.getAttribute("data-cuenta")), ini = desde || 0, t0 = performance.now(), dur = 1200;
    if (reducido) { el.textContent = formatoCuenta(el, fin); return; }
    clearTimeout(el._ct);
    (function paso() {
      var p = clamp((performance.now() - t0) / dur, 0, 1), e = 1 - Math.pow(1 - p, 4);
      el.textContent = formatoCuenta(el, ini + (fin - ini) * e);
      if (p < 1) el._ct = setTimeout(paso, 16); else el.textContent = formatoCuenta(el, fin);
    })();
    clearTimeout(el._cf);
    el._cf = setTimeout(function () { el.textContent = formatoCuenta(el, fin); }, dur + 300);
  }

  /* ---------- barra ---------- */
  function initBarra() {
    var barra = $("#barra");
    function f() { barra.classList.toggle("corta", window.scrollY > 8); }
    window.addEventListener("scroll", f, { passive: true });
    f();
  }

  /* ---------- portada: titular palabra por palabra ---------- */
  function initPortada() {
    var txt = $(".portada-txt");
    $$(".p", txt).forEach(function (p, i) { p.style.setProperty("--k", i); });
    requestAnimationFrame(function () { setTimeout(function () { txt.classList.add("listo"); }, 120); });
  }

  /* ---------- títulos de sección: palabra por palabra al entrar ---------- */
  function initTitulos() {
    var hs = $$("h2");
    function dividir(n, k) {
      Array.prototype.slice.call(n.childNodes).forEach(function (c) {
        if (c.nodeType === 3) {
          var frag = document.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach(function (t) {
            if (!t) return;
            if (/^\s+$/.test(t)) { frag.appendChild(document.createTextNode(t)); return; }
            var w = document.createElement("span"), i = document.createElement("span");
            w.className = "w"; i.textContent = t; i.style.setProperty("--k", k.n++);
            w.appendChild(i); frag.appendChild(w);
          });
          c.parentNode.replaceChild(frag, c);
        } else if (c.nodeType === 1 && c.tagName.toLowerCase() !== "svg" && !c.classList.contains("w")) { dividir(c, k); }
      });
    }
    hs.forEach(function (h) { dividir(h, { n: 0 }); });
    function ver(h) { h.classList.add("vh"); }
    if (!tieneIO) { hs.forEach(ver); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { ver(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.2 });
    hs.forEach(function (h) { io.observe(h); });
    setTimeout(function () { hs.forEach(ver); }, 6000);
  }

  /* ---------- revelar al bajar (el contenido es visible si falla el JS) ---------- */
  function initRevelar() {
    var els = $$("[data-r], .co-barras");
    els.forEach(function (el) {
      if (el.getAttribute("data-r") === "cascada") {
        Array.prototype.forEach.call(el.children, function (h, i) { h.style.setProperty("--i", i); });
      }
    });
    $$(".co-barras i").forEach(function (i, n) { i.style.setProperty("--i", n); });
    function ver(el) { el.classList.add("ver"); }
    if (!tieneIO) { els.forEach(ver); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { ver(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.01, rootMargin: "0px 0px -6% 0px" });
    els.forEach(function (el) { io.observe(el); });
    setTimeout(function () { els.forEach(ver); }, 6000);
  }

  /* ---------- contadores al entrar en pantalla ---------- */
  function initContar() {
    if (reducido || !tieneIO) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { animarCuenta(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.6 });
    $$("[data-cuenta]").forEach(function (el) { io.observe(el); });
  }

  /* ---------- libreta de la portada: los pendientes se van tachando ---------- */
  function initLibreta() {
    var lib = $("#libreta");
    if (!lib || reducido) return;
    var items = $$("li", lib), visible = false, timer = null, i = 0;
    function reiniciar() { items.forEach(function (li) { li.classList.remove("hecho"); }); lib.classList.remove("completo"); i = 0; }
    function paso() {
      timer = null;
      if (!visible || document.hidden) return;
      if (i < items.length) { items[i].classList.add("hecho"); i++; timer = setTimeout(paso, 1150); }
      else if (!lib.classList.contains("completo")) { lib.classList.add("completo"); timer = setTimeout(paso, 4800); }
      else { reiniciar(); timer = setTimeout(paso, 1000); }
    }
    function arrancar() { if (!timer && visible && !document.hidden) timer = setTimeout(paso, 900); }
    reiniciar();
    if (tieneIO) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; arrancar(); }, { threshold: 0.2 }).observe(lib);
    } else { visible = true; arrancar(); }
    document.addEventListener("visibilitychange", arrancar);

    var portada = $("#inicio");
    if (window.matchMedia("(hover:hover) and (pointer:fine)").matches) {
      var pend = false, px = 0, py = 0;
      portada.addEventListener("pointermove", function (e) {
        var r = lib.getBoundingClientRect();
        px = clamp((e.clientX - (r.left + r.width / 2)) / 700, -1, 1);
        py = clamp((e.clientY - (r.top + r.height / 2)) / 700, -1, 1);
        if (!pend) { pend = true; requestAnimationFrame(function () { pend = false; lib.style.setProperty("--ry", (px * 5).toFixed(2) + "deg"); lib.style.setProperty("--rx", (-py * 4).toFixed(2) + "deg"); }); }
      });
      portada.addEventListener("pointerleave", function () { lib.style.setProperty("--ry", "0deg"); lib.style.setProperty("--rx", "0deg"); });
    }
  }

  /* ---------- scroll: parallax y pantallas con inercia, línea de pasos, progreso y menú activo ---------- */
  function initScroll() {
    var items = [];
    if (!reducido) {
      $$("[data-par]").forEach(function (el) { items.push({ el: el, f: parseFloat(el.getAttribute("data-par")) || 0, tipo: "par", t: null, c: null }); });
    }
    $$("[data-pant]").forEach(function (el) { items.push({ el: el, img: $("img", el), tipo: "pant", t: null, c: null }); });
    var pasos = $("#pasos"), lis = pasos ? $$("li", pasos) : [];
    var prog = $("#progreso");
    var ids = ["trabajos", "ejemplos", "automatizaciones", "proceso", "precios", "hablemos"];
    var secs = ids.map(function (id) { return document.getElementById(id); });
    var enlaces = $$(".enlaces a");
    var vis = new Set(), pendiente = false, animando = false;

    function aplicar(it) {
      var v = "translate3d(0," + it.c.toFixed(2) + "px,0)";
      if (it.tipo === "pant") { if (it.img) it.img.style.transform = v; } else { it.el.style.transform = v; }
    }
    function tick() {
      var mueve = false;
      items.forEach(function (it) {
        if (it.t === null || it.c === null) return;
        var d = it.t - it.c;
        if (Math.abs(d) > 0.25) { it.c += d * 0.11; mueve = true; aplicar(it); }
        else if (it.c !== it.t) { it.c = it.t; aplicar(it); }
      });
      if (mueve && !document.hidden) requestAnimationFrame(tick); else animando = false;
    }
    function arrancar() { if (!animando) { animando = true; requestAnimationFrame(tick); } }

    function medir() {
      pendiente = false;
      var vh = window.innerHeight, y = window.scrollY;
      items.forEach(function (it) {
        if (!vis.has(it.el)) return;
        var r = it.el.getBoundingClientRect(), t;
        if (it.tipo === "par") {
          t = -(r.top + r.height / 2 - vh / 2) * it.f;
        } else {
          if (!it.img) return;
          var prog2 = clamp((vh * 0.95 - (r.top + r.height / 2)) / (vh * 0.9), 0, 1);
          var mt = parseFloat(getComputedStyle(it.img).marginTop) || 0;
          var max = Math.max(0, it.img.offsetHeight + mt - it.el.clientHeight);
          t = -max * prog2;
        }
        it.t = t;
        if (it.c === null || reducido) { it.c = t; aplicar(it); }
      });
      arrancar();
      if (prog) {
        var tot = document.documentElement.scrollHeight - vh;
        prog.style.setProperty("--sp", tot > 0 ? clamp(y / tot, 0, 1).toFixed(4) : 0);
      }
      if (pasos && vis.has(pasos)) {
        var r2 = pasos.getBoundingClientRect();
        pasos.style.setProperty("--p", clamp((vh * 0.62 - r2.top) / r2.height, 0, 1).toFixed(3));
        lis.forEach(function (li) { li.classList.toggle("act", li.getBoundingClientRect().top < vh * 0.62); });
      }
      var actual = -1;
      secs.forEach(function (s, i) { if (s && s.getBoundingClientRect().top <= vh * 0.4) actual = i; });
      var idAct = actual >= 0 ? ids[actual] : "";
      enlaces.forEach(function (a) { a.classList.toggle("act", a.getAttribute("href") === "#" + idAct); });
    }
    function pedir() { if (!pendiente) { pendiente = true; requestAnimationFrame(medir); } }

    var objetivos = items.map(function (it) { return it.el; });
    if (pasos) objetivos.push(pasos);
    if (tieneIO) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) vis.add(e.target); else vis.delete(e.target); });
        pedir();
      }, { rootMargin: "25% 0px 25% 0px" });
      objetivos.forEach(function (el) { io.observe(el); });
    } else { objetivos.forEach(function (el) { vis.add(el); }); }
    window.addEventListener("scroll", pedir, { passive: true });
    window.addEventListener("resize", pedir);
    items.forEach(function (it) { if (it.img && !it.img.complete) it.img.addEventListener("load", pedir); });
    pedir();
  }

  /* ---------- chat de ejemplo que se escribe solo (los mensajes anteriores suben con suavidad) ---------- */
  function initChat() {
    var caja = $("#chat-msgs");
    if (!caja || reducido || !tieneIO) return;
    var msgs = $$(".m", caja), hecho = false;
    function visibles() { return $$(".m", caja).filter(function (m) { return !m.classList.contains("off"); }); }
    function cambiar(fn) {
      var antes = visibles().map(function (el) { return { el: el, top: el.getBoundingClientRect().top }; });
      fn();
      antes.forEach(function (o) {
        if (!o.el.parentNode) return;
        var dy = o.top - o.el.getBoundingClientRect().top;
        if (Math.abs(dy) < 1) return;
        o.el.style.transition = "none"; o.el.style.transform = "translateY(" + dy + "px)";
        void o.el.offsetWidth;
        o.el.style.transition = "transform .65s cubic-bezier(.16,1,.3,1)"; o.el.style.transform = "";
      });
    }
    function mostrar(m) { cambiar(function () { m.classList.remove("off"); m.classList.add("nuevo"); }); }
    function correr() {
      hecho = true;
      msgs.forEach(function (m) { m.classList.add("off"); });
      var i = 0;
      (function siguiente() {
        if (i >= msgs.length) return;
        var m = msgs[i++];
        if (m.classList.contains("el")) {
          var t = document.createElement("p");
          t.className = "m el tipeo nuevo"; t.setAttribute("aria-hidden", "true"); t.innerHTML = "<i></i><i></i><i></i>";
          cambiar(function () { caja.appendChild(t); });
          setTimeout(function () {
            cambiar(function () { t.parentNode && t.parentNode.removeChild(t); m.classList.remove("off"); m.classList.add("nuevo"); });
            setTimeout(siguiente, 1300);
          }, 1050);
        } else {
          setTimeout(function () { mostrar(m); setTimeout(siguiente, 700); }, 750);
        }
      })();
    }
    new IntersectionObserver(function (es, io) {
      if (es[0].isIntersecting && !hecho) { correr(); io.disconnect(); }
    }, { threshold: 0.45 }).observe($("#chat"));
  }

  /* ---------- pestañas de automatizaciones (con resaltado que se desliza) ---------- */
  function initTabs() {
    var lista = $("#tabs .tab-lista"), tabs = $$("[role=tab]", lista), ind = $(".tab-ind", lista);
    if (!tabs.length) return;
    function pos(t, sinAnim) {
      if (!ind) return;
      if (sinAnim) ind.style.transition = "none";
      ind.style.setProperty("--y", t.offsetTop + "px");
      ind.style.setProperty("--h", t.offsetHeight + "px");
      if (sinAnim) { void ind.offsetWidth; ind.style.transition = ""; }
    }
    function actual() { return tabs.filter(function (t) { return t.getAttribute("aria-selected") === "true"; })[0]; }
    function elegir(t, enfocar) {
      tabs.forEach(function (x) {
        var sel = x === t;
        x.setAttribute("aria-selected", sel ? "true" : "false");
        x.tabIndex = sel ? 0 : -1;
        var p = document.getElementById(x.getAttribute("aria-controls"));
        if (sel) { p.hidden = false; p.classList.remove("entra"); void p.offsetWidth; p.classList.add("entra"); } else { p.hidden = true; }
      });
      pos(t);
      document.dispatchEvent(new CustomEvent("panelcambio"));
      if (enfocar) t.focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { elegir(t); });
      t.addEventListener("keydown", function (e) {
        var k = e.key, n = null;
        if (k === "ArrowRight" || k === "ArrowDown") n = tabs[(i + 1) % tabs.length];
        else if (k === "ArrowLeft" || k === "ArrowUp") n = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (k === "Home") n = tabs[0]; else if (k === "End") n = tabs[tabs.length - 1];
        if (n) { e.preventDefault(); elegir(n, true); }
      });
    });
    pos(actual(), true);
    window.addEventListener("resize", function () { pos(actual(), true); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { pos(actual(), true); });
  }

  /* ---------- hojas de la hoja de control: Resumen, Ventas, Inventario, Cobros ---------- */
  function initHoja() {
    var cont = $("#hc-hojas"); if (!cont) return;
    var tabs = $$("[data-hoja]", cont), vistas = $$(".hc-vista"), ind = $(".hc-ind", cont);
    vistas.forEach(function (v) {
      $$("tbody tr, .cb-lista li", v).forEach(function (r, i) { r.style.setProperty("--i", i); });
      if (!v.classList.contains("on")) v.setAttribute("inert", "");
    });
    var caja = $("#hc-vistas");
    function ajustar(sinAnim) {
      var v = vistas.filter(function (x) { return x.classList.contains("on"); })[0];
      if (!v || !caja || !v.offsetHeight) return;
      if (sinAnim) caja.style.transition = "none";
      caja.style.height = v.offsetHeight + "px";
      if (sinAnim) { void caja.offsetWidth; caja.style.transition = ""; }
    }
    function posicion(t, sinAnim) {
      if (sinAnim) ind.style.transition = "none";
      ind.style.setProperty("--x", t.offsetLeft + "px");
      ind.style.setProperty("--w", t.offsetWidth);
      if (sinAnim) { void ind.offsetWidth; ind.style.transition = ""; }
    }
    function actual() { return tabs.filter(function (t) { return t.getAttribute("aria-selected") === "true"; })[0]; }
    function ir(t, enfocar) {
      var nombre = t.getAttribute("data-hoja"), vNueva = null;
      tabs.forEach(function (x) { var s = x === t; x.setAttribute("aria-selected", s ? "true" : "false"); x.tabIndex = s ? 0 : -1; });
      vistas.forEach(function (v) {
        var on = v.getAttribute("data-vista") === nombre;
        v.classList.toggle("on", on);
        if (on) { v.removeAttribute("inert"); vNueva = v; } else { v.setAttribute("inert", ""); }
      });
      posicion(t);
      ajustar();
      vNueva.classList.remove("anim"); void vNueva.offsetWidth; vNueva.classList.add("anim");
      $$("[data-cuenta]", vNueva).forEach(function (e) { if (e.id !== "cb-total") animarCuenta(e); });
      if (enfocar) t.focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { ir(t); });
      t.addEventListener("keydown", function (e) {
        var k = e.key, n = null;
        if (k === "ArrowRight") n = tabs[(i + 1) % tabs.length];
        else if (k === "ArrowLeft") n = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (k === "Home") n = tabs[0]; else if (k === "End") n = tabs[tabs.length - 1];
        if (n) { e.preventDefault(); ir(n, true); }
      });
    });
    function reposicionar() { posicion(actual(), true); ajustar(true); }
    reposicionar();
    window.addEventListener("resize", reposicionar);
    document.addEventListener("panelcambio", reposicionar);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(reposicionar);

    /* Cobros: marcar cobrado actualiza el total */
    var lista = $("#cb-lista"), total = $("#cb-total"), msg = $("#cb-msg"), vc = $("#v-cobros");
    function recalcular() {
      var suma = 0, n = 0;
      $$("li", lista).forEach(function (li) { if (!li.classList.contains("cobrada")) { suma += parseFloat(li.getAttribute("data-monto")); n++; } });
      var desde = parseFloat(total.getAttribute("data-cuenta"));
      total.setAttribute("data-cuenta", suma);
      animarCuenta(total, desde);
      msg.textContent = n === 0 ? "Todo al día" : (n === 1 ? "1 cliente con saldo" : n + " clientes con saldo");
      vc.classList.toggle("ok", n === 0);
    }
    $$("li", lista).forEach(function (li) {
      var b = $("button", li);
      b.addEventListener("click", function () {
        li.classList.toggle("cobrada");
        b.textContent = li.classList.contains("cobrada") ? "Deshacer" : "Marcar cobrado";
        recalcular();
      });
    });
  }

  /* ---------- cierre de caja ---------- */
  function initCaja() {
    var b = $("#cerrar-caja"), s = $("#sello");
    if (!b) return;
    var cerrada = false;
    b.addEventListener("click", function () {
      cerrada = !cerrada;
      b.setAttribute("aria-pressed", cerrada ? "true" : "false");
      b.textContent = cerrada ? "Reabrir caja" : "Cerrar caja del día";
      if (cerrada) {
        var hora = new Date().toLocaleTimeString("es-US", { hour: "numeric", minute: "2-digit" });
        s.textContent = "Caja cerrada · " + hora + " · $1,284.50";
        s.classList.add("puesto");
      } else { s.classList.remove("puesto"); }
    });
  }

  /* ---------- formulario conectado a una hoja (demostración) ---------- */
  function initFlujo() {
    var b = $("#fl-enviar"); if (!b) return;
    var muestras = [
      { n: "Marisol P.", p: "2 tortas de chocolate", e: "Sábado 10:00 a. m." },
      { n: "Jorge T.", p: "Bandeja de 30 empanadas", e: "Viernes 5:00 p. m." },
      { n: "Daniela V.", p: "1 pastel de tres leches", e: "Domingo 12:00 p. m." },
      { n: "Rafael M.", p: "Caja de 12 alfajores", e: "Lunes 9:00 a. m." }
    ];
    var k = 0, campos = { n: $("#fl-n"), p: $("#fl-p"), e: $("#fl-e") }, lista = $("#fl-nuevas"), bloqueo = false;
    function poner(m) {
      ["n", "p", "e"].forEach(function (c) {
        var el = campos[c]; el.textContent = m[c];
        el.parentNode.style.background = "rgba(245,213,71,.5)";
        setTimeout(function () { el.parentNode.style.background = ""; }, 700);
      });
    }
    b.addEventListener("click", function () {
      if (bloqueo) return; bloqueo = true;
      var m = muestras[k % muestras.length];
      var fecha = new Date().toLocaleDateString("es-US", { day: "numeric", month: "short" }).replace(".", "");
      var fila = document.createElement("div");
      fila.className = "fl-fila nueva";
      [fecha, m.n, m.p, m.e].forEach(function (t) { var s = document.createElement("span"); s.textContent = t; fila.appendChild(s); });
      lista.insertBefore(fila, lista.firstChild);
      while (lista.children.length > 3) lista.removeChild(lista.lastChild);
      setTimeout(function () { fila.classList.remove("nueva"); }, 2000);
      b.textContent = "Enviado";
      setTimeout(function () { b.textContent = "Enviar pedido"; bloqueo = false; }, 900);
      k++; poner(muestras[k % muestras.length]);
    });
  }

  /* ---------- visor de ejemplos ---------- */
  function initVisor() {
    var d = $("#visor");
    if (!d || typeof d.showModal !== "function") return;
    var img = $("#visor-img"), pant = $("#visor-pant"), tit = $("#visor-tit");
    $$(".ej").forEach(function (b) {
      b.addEventListener("click", function () {
        img.src = b.getAttribute("data-visor");
        img.alt = "Página de ejemplo completa: " + b.getAttribute("data-tit");
        tit.textContent = b.getAttribute("data-tit");
        d.showModal(); pant.scrollTop = 0; pant.focus({ preventScroll: true });
      });
    });
    $("#visor-x").addEventListener("click", function () { d.close(); });
    d.addEventListener("click", function (e) { if (e.target === d) d.close(); });
  }

  /* ---------- Hablemos: lo que hoy haces a mano, horas al año, mensaje ---------- */
  function initPendientes() {
    var checks = $$("input[type=checkbox]", $("#pend")), rango = $("#horas"), out = $("#horas-v"), res = $("#horas-res"), ta = $("#f-necesita");
    var tocado = false;
    ta.addEventListener("input", function () { tocado = true; });
    function actualizar() {
      var h = parseInt(rango.value, 10), sel = checks.filter(function (c) { return c.checked; }).map(function (c) { return c.value; });
      out.textContent = h + " h";
      res.textContent = sel.length ? "Son unas " + (h * 52) + " horas al año." : "Marca lo que aplique y mira cuánto tiempo suma al año.";
      if (!tocado) {
 
        ta.value = sel.length ? "Necesito ayuda con: " + sel.join("; ") + ". Hoy le dedico unas " + (h === 1 ? "1 hora" : h + " horas") + " a la semana." : "";
        document.dispatchEvent(new Event("msg"));
      }
    }
    checks.forEach(function (c) { c.addEventListener("change", actualizar); });
    rango.addEventListener("input", actualizar);
    actualizar();
  }

  function initForm() {
    var f = $("#form"), estado = $("#f-estado"), btn = $("#f-enviar"), aviso = $("#aviso-config");
    var cfg = window.CONFIG || {};
    if (cfg.instagram) {
      var user = String(cfg.instagram).replace(/^@/, "").replace(/[^A-Za-z0-9._]/g, "");
      var a = $("#ig-link"); a.href = "https://instagram.com/" + user; a.textContent = "@" + user;
      $("#ig-fila").hidden = false;
      var nav = $(".pie nav"), l = document.createElement("a");
      l.href = a.href; l.target = "_blank"; l.rel = "noopener"; l.textContent = "Instagram"; nav.appendChild(l);
    }
    if (cfg.whatsapp) {
      var num = String(cfg.whatsapp).replace(/\D/g, ""), wa = $("#wa-link");
      wa.href = "https://wa.me/" + num + "?text=" + encodeURIComponent("Hola Carlos, vi tu página y quiero conversar sobre mi negocio.");
      wa.textContent = cfg.whatsappVisible || ("+" + num);
      $("#wa-fila").hidden = false;
      var nav2 = $(".pie nav"), l2 = document.createElement("a");
      l2.href = wa.href; l2.target = "_blank"; l2.rel = "noopener"; l2.textContent = "WhatsApp"; nav2.appendChild(l2);
    }
    if (!cfg.correo) {
      /* sin correo: el formulario arma un mensaje de WhatsApp, sin servicios externos */
      if (!cfg.whatsapp) { aviso.textContent = "Falta conectar un medio de contacto (CONFIG)."; aviso.hidden = false; btn.disabled = true; return; }
      var num3 = String(cfg.whatsapp).replace(/\D/g, ""), wb = $("#wa-btn"), ta2 = $("#f-necesita");
      ["#f-nombre", "#f-negocio", "#f-correo"].forEach(function (s) { $(s).parentNode.hidden = true; });
      btn.hidden = true; btn.style.display = "none"; $("#wa-fila").hidden = true; wb.hidden = false;
      ["#f-nombre", "#f-negocio", "#f-correo"].forEach(function (s) { $(s).parentNode.style.display = "none"; });
      f.addEventListener("submit", function (e) { e.preventDefault(); wb.click(); });
      ta2.placeholder = "Lo que marques a la izquierda aparece aquí. También puedes escribirlo tú.";
      function armar() {
        var t = ta2.value.trim();
        var texto = "Hola Carlos, vi tu página. " + (t || "Quiero conversar sobre mi negocio.");
        wb.href = "https://wa.me/" + num3 + "?text=" + encodeURIComponent(texto);
      }
      ta2.addEventListener("input", armar); document.addEventListener("msg", armar); armar();
      return;
    }
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      estado.className = "estado"; estado.textContent = "";
      var nombre = $("#f-nombre"), correo = $("#f-correo"), necesita = $("#f-necesita"), ok = true;
      [nombre, correo, necesita].forEach(function (c) { c.classList.remove("malo"); c.removeAttribute("aria-invalid"); });
      if (!nombre.value.trim()) { nombre.classList.add("malo"); ok = false; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.value.trim())) { correo.classList.add("malo"); ok = false; }
      if (!necesita.value.trim()) { necesita.classList.add("malo"); ok = false; }
      [nombre, correo, necesita].forEach(function (c) { if (c.classList.contains("malo")) c.setAttribute("aria-invalid", "true"); });
      if (!ok) { estado.className = "estado mal"; estado.textContent = "Revisa los campos marcados."; return; }
      if ($("input[name=_honey]", f).value) { estado.className = "estado ok"; estado.textContent = "Listo."; return; }
      btn.disabled = true; btn.textContent = "Enviando";
      var datos = new FormData(f);
      datos.append("_subject", "Mensaje nuevo desde tu página");
      datos.append("_captcha", "false");
      datos.append("_template", "table");
      fetch("https://formsubmit.co/ajax/" + encodeURIComponent(cfg.correo), { method: "POST", headers: { Accept: "application/json" }, body: datos })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (j && (j.success === "true" || j.success === true)) {
            estado.className = "estado ok"; estado.textContent = "Listo, recibí tu mensaje. Te respondo pronto.";
            f.reset();
          } else { throw new Error("fallo"); }
        })
        .catch(function () { estado.className = "estado mal"; estado.textContent = "No se pudo enviar. Intenta de nuevo en un momento."; })
        .then(function () { btn.disabled = false; btn.textContent = "Enviar mensaje"; });
    });
  }

  /* ---------- pausar animaciones con la pestaña oculta ---------- */
  function initPausa() {
    document.addEventListener("visibilitychange", function () { document.body.classList.toggle("pausado", document.hidden); });
  }

  safe(initBarra, "barra");
  safe(initPortada, "portada");
  safe(initTitulos, "titulos");
  safe(initRevelar, "revelar");
  safe(initContar, "contar");
  safe(initLibreta, "libreta");
  safe(initScroll, "scroll");
  safe(initChat, "chat");
  safe(initTabs, "tabs");
  safe(initHoja, "hoja");
  safe(initCaja, "caja");
  safe(initFlujo, "flujo");
  safe(initVisor, "visor");
  safe(initPendientes, "pendientes");
  safe(initForm, "form");
  safe(initPausa, "pausa");
})();
