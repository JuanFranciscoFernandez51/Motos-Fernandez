# Pendientes — Motos Fernandez

## 🎯 Estado actual

✅ **Lista para salir a producción real** — solo falta cargar datos.

- Dominio `motosfernandez.com.ar` online con HTTPS
- Sistema operativo funcional (Clientes, Mandatos, Ventas, Taller, Proveedores)
- PDFs con datos legales reales (razón social, CUIT, IIBB)
- Chat IA andando
- Dark mode activado
- Edición inline en lista de modelos
- Specs automáticas con IA

---

## 📋 TAREAS DE CARGA DE DATOS (vos)

Son la mayoría del trabajo que queda antes del lanzamiento real.

### Urgente — impactan a lo que ve el cliente

- [ ] **Fotos reales** a las 45 motos del Excel (reemplazar placeholder del logo)
- [ ] **Activar** las motos que quieras mostrar en el catálogo
- [ ] **Revisar precios y km** del import del Excel (16 tenían notas internas)
- [ ] Cargar **datos internos** (chasis, motor, patente, cliente) en las motos que correspondan

### Cuando puedas

- [ ] **Proveedores**: cargar los 4-5 principales (Honda, Yamaha, etc.)
- [ ] Asignar proveedor a cada moto 0KM
- [ ] Asignar proveedor a productos de tienda

---

## 🔧 TAREAS DE MIGRACIÓN / OPS (cuando quieras)

- [ ] **Google Workspace** con `motosfernandez.com.ar` (form de reclamo en https://support.google.com/a/contact/domain-transfer — Google tarda 1-3 días)
- [ ] **Eliminar cuentas Gmail viejas** (motosfernandezbahia@gmail, etc.) cuando migres al Workspace
- [ ] Confirmar que `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = dgtlyzyra` esté en Vercel
- [ ] Crear **cuenta Cloudinary propia** de Motos Fernandez (gratis, 25 GB) — la actual `dgtlyzyra` es heredada

---

## 🔒 OPTIMIZACIÓN Y SEGURIDAD (próxima sesión)

Conversado la noche del 23/4. Orden sugerido:

### Prioridad 🥇 (hacer primero)

- [ ] **Backup automático de DB** — script que exporte Neon a archivo externo semanal
- [ ] **Caché de queries** en rutas públicas con `unstable_cache` (catálogo, tienda, home)
- [ ] **Sentry** o **Logtail** — capturar errores automáticamente, saber qué se rompe

### Prioridad 🥈

- [ ] **Rate limiting** en endpoints sensibles: `/api/contacto`, `/api/recomendador`, `/api/admin/upload`
- [ ] **Uptime monitoring** (UptimeRobot o Better Uptime) — alerta si el sitio cae
- [ ] **Vercel Analytics** habilitado (gratis)

### Prioridad 🥉 (cuando crezca el equipo)

- [ ] **2FA** para login admin
- [ ] **Logs de acceso admin** (quién entró, desde qué IP, cuándo)
- [ ] **Bundle analyzer** para reducir tamaño de JS

### Ya implementado ✅

- HTTPS forzado
- Headers de seguridad (X-Frame-Options, HSTS, XSS-Protection)
- Passwords con bcrypt
- CSRF protection en server actions (por defecto de Next)
- Env vars en Vercel
- Middleware auth para `/admin` y `/api/admin`
- Rate limiting en chat (20 msgs/hora por IP)
- Visitas trackeadas

---

## 🎨 LAVADA DE CARA VISUAL (pendiente)

Disparado por comparar con phxtremeshop.com (Shopify estándar pero prolijo).
La funcionalidad de Motos Fernandez ya supera lo de ellos; falta empatar el
pulido visual.

- [ ] **Hero de la home** más impactante:
  - Slider con 3-4 imágenes grandes (motos 0km, usadas destacadas, consigna, taller)
  - Frases cortas + CTA claro en cada slide
  - Considerar video loop de background (ej: moto andando)
- [ ] **Logos de marcas** en grid grande estilo "Shop by Brand" (Honda, Yamaha, Kawasaki, Suzuki, CF Moto, Benelli, KTM, BMW, etc.)
- [ ] **Fotos profesionales** de las motos (reemplazar el placeholder del logo cuando las tengamos)
- [ ] **Banner superior** con promo o mensaje destacado tipo "Financiación sin interés" / "Envío a todo el país"
- [ ] **Sección "Por qué elegirnos"** con íconos + features ya existe → mejorar diseño/anim
- [ ] **Testimonios con fotos reales** de clientes (cuando los tengamos)
- [ ] **Micro-interacciones**: hover effects en cards, transitions suaves, parallax sutil
- [ ] **Home más "scroll-friendly"**: secciones con separadores visuales, colores alternados
- [ ] **Tipografía**: revisar si Antonio/Montserrat/Poppins tienen buen contraste o conviene alguna más bold para títulos (ej: Bebas Neue)
- [ ] **Captura de emails** con popup de 10% descuento al primer pedido en tienda
- [ ] **Animaciones al scrollear** (fade-in, slide-up) con Framer Motion o similar

Tiempo estimado: **4-6 hs** de trabajo de diseño front.

## 🚀 FEATURES PARA DESPUÉS DEL LANZAMIENTO

Cosas que no son críticas pero serían útiles más adelante:

- [ ] **Dashboard operativo** con KPIs (Fase A que conversamos): ventas del mes, OTs abiertas, mandatos vencidos, etc.
- [ ] **Export PDF/Excel** del catálogo desde admin
- [ ] **Importación masiva** de clientes y productos desde Excel
- [ ] **Avisos automáticos email** (Resend): OT lista, recordatorio service, mandato vence
- [ ] **WhatsApp Business API** para enviar PDFs y notificaciones
- [ ] **Caja** / movimientos diarios
- [ ] **Reportes** mensuales (ventas por marca, rentabilidad, etc.)
- [ ] **Email recovery por dominio** cuando Google libere el Workspace viejo

---

## 🐞 BUGS / INVESTIGAR

- [ ] `/admin/modelos` reportado como caído el 23/4 a la noche — pedir captura y diagnosticar (build local pasa OK)

---

## 📝 Preguntas pendientes de negocio

- Términos del mandato de venta → ¿están OK los 8 que armé, o tenés un contrato propio?
- Términos del boleto compra-venta → idem (5 cláusulas)
- Comisión típica en mandatos → puse 10% default, ¿varía?
- Numeración de documentos → arranca en MV-0001 / V-0001 / OT-0001, ¿te sirve o querés arrancar desde otro número?
