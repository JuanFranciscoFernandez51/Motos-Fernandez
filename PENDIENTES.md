# Pendientes — Motos Fernandez

Lista de cosas que requieren tu input/acción para completar el setup.
Son rápidas — cuando vuelvas las hacemos juntos.

## 🔴 Urgente (antes de usar los módulos nuevos)

### 1. Cargar datos legales del negocio

Para que los PDFs salgan bien (mandato de venta, boleto compra-venta, OT), hay que cargar:

**Dónde**: `/admin/configuracion` → sección **"Datos legales (para PDFs)"**

Campos:
- **Razón social** (ej: "Fernandez Hermanos S.A." o lo que figure en AFIP)
- **CUIT** del negocio
- **Condición frente al IVA** (Responsable Inscripto / Monotributista / etc.)
- **N° Ingresos Brutos** (si aplica)
- **Teléfono** (con formato para PDF, ej: "+54 291 578-8671")
- **Ciudad** (ej: "Bahía Blanca, Buenos Aires")

Hasta que los cargues, los PDFs van a decir "—" o los defaults de ejemplo.

### 2. Cargar tipos de servicio del taller

**Dónde**: `/admin/taller/tipos-servicio`

Cargá los servicios que hace el taller, por ejemplo:
- Service 1.000 km
- Service 10.000 km
- Cambio de aceite
- Cambio de cubiertas
- Cambio de pastillas de freno
- Reparación mecánica general
- Diagnóstico
- Otros

Para cada uno podés poner un **precio base** orientativo y **duración estimada**.
Esto hace que al crear una OT, elijas el tipo de un dropdown en lugar de escribirlo a mano.

## 🟡 Opcionales / dudas de negocio

### 3. Revisar términos de los PDFs

Los PDFs actualmente tienen términos y condiciones **genéricos** que armé yo basándome en contratos típicos de concesionarias argentinas. **Cuando vuelvas, leélos y decime qué cambiar**:

- **Mandato de venta** → 8 cláusulas (consignación, comisión, vencimiento, etc.)
- **Boleto compra-venta** → 5 cláusulas (propiedad, gastos, transferencia, etc.)
- Los PDFs los ves en: `/admin/mandatos/[id]` → botón "Generar PDF"

Si tenés un texto de contrato que ya usás en papel, **pasámelo** y lo integro tal cual.

### 4. Comisión típica en mandatos

En el form de mandato puse **10% por defecto**. ¿Qué % usás realmente? ¿Varía por modelo?
Si querés lo hago configurable desde `/admin/configuracion`.

### 5. Numeración de documentos

Los números arrancan en 1 y van de a uno (MV-0001, MV-0002...). ¿Querés arrancar desde otro número (ej: MV-1000 para que no parezca "chico")?

---

## 🟢 Fases siguientes del plan (cuando termines lo anterior)

### FASE A — Dashboard operativo (KPIs) ⏱ ~2 hs
Rehacer el dashboard principal (`/admin`) con:
- Ventas del mes / ventas del año (total $ + cantidad)
- Mandatos activos / vencidos
- OTs en taller / listas para entregar
- Clientes nuevos del mes
- Saldos pendientes (de OTs con saldo > 0)
- Top modelos vendidos
- Gráfico de ventas últimos 6 meses

### FASE B — Integración con catálogo ⏱ ~1 hs
- Botón "Crear mandato" en el detalle de un modelo del admin (consignación al vuelo)
- Botón "Registrar venta" en el detalle del modelo
- Cuando se marca "vendida" en modelos → crear venta automáticamente en borrador

### FASE C — Export PDF/Excel del catálogo ⏱ ~2 hs
- `/admin/modelos` → botón Exportar
- Dos opciones: PDF (catálogo con fotos) | Excel (tabla)
- Filtros aplican al exportar (solo las activas, solo una marca, etc.)

### FASE D — Importación masiva ⏱ ~2-3 hs
- Importar **clientes** desde Excel (por si tenés una lista antigua)
- Importar **productos** de la tienda desde Excel

### FASE E — Avisos automáticos ⏱ ~3-4 hs
- Email al cliente cuando su moto está lista (OT → LISTA)
- Recordatorio email "Tu service fue hace 6 meses, ¿agendamos?"
- Recordatorio "Tu mandato vence en 15 días, ¿renovamos?"
- Requiere **Resend** configurado (API key en Vercel)

### FASE F — WhatsApp Business API ⏱ ~3-4 hs
- Enviar PDF del mandato directo por WhatsApp al cliente
- Notificación automática "Su OT #123 está lista"
- Requiere **WhatsApp Business API** (costo extra ~$30 USD/mes de Twilio o similar)

### FASE G — Caja / Movimientos ⏱ ~4-5 hs
- Registro de ingresos/egresos diarios
- Reporte mensual
- Integración con las ventas y OTs (cuando se paga una OT, entra a caja)

---

## 📊 Estado actual

| Módulo | Estado |
|---|---|
| ✅ Web pública (catálogo, tienda, chat IA) | Live en motosfernandez.com.ar |
| ✅ Admin — Modelos (con carrito de ventas, foto modal, etc.) | Completo |
| ✅ Admin — Clientes | **Nuevo** — listo para usar |
| ✅ Admin — Mandatos + PDF | **Nuevo** — listo para usar |
| ✅ Admin — Ventas + PDF boleto | **Nuevo** — listo para usar |
| ✅ Admin — Taller + Tipos servicio + PDF OT | **Nuevo** — listo para usar |
| ⏳ Email con dominio propio | Google Workspace trabado, form enviado a soporte |
| ⏳ Dashboard operativo | Fase A (pendiente) |
| ⏳ Export catálogo PDF/Excel | Fase C (pendiente) |

---

## 🔧 Archivos clave del código (por si buscás algo)

- `prisma/schema.prisma` → modelos de datos
- `src/app/admin/(dashboard)/clientes/` → módulo clientes
- `src/app/admin/(dashboard)/mandatos/` → módulo mandatos
- `src/app/admin/(dashboard)/ventas/` → módulo ventas
- `src/app/admin/(dashboard)/taller/` → módulo taller + tipos servicio
- `src/components/admin/operativo/` → componentes reusables (forms, selectores)
- `src/lib/pdf/` → templates de PDFs
- `src/app/api/pdf/*/[id]/route.tsx` → endpoints de generación de PDFs
