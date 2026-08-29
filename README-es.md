*Leer en [Inglés](README.md).*

# Feel & Film — Autonomous Multi-Agent Cinema & Collaborative Partner

**Feel & Film** es un sistema autónomo de orquestación multi-agente y cineteca personal desarrollado para la hackathon **Agentic Cinema: The Blockbuster Hackathon** (Track: **Collaborative Partner**).

---

## 🎬 El Problema y la Solución Agentic
En lugar de ser un simple formulario de recomendaciones paso a paso, **Feel & Film** actúa como un **Socio Colaborativo Inteligente (*Collaborative Partner*)**. Un **Master Orchestrator Agent** coordinado con **Google ADK** y **Gemini 3.5 Flash** genera en un **solo ciclo autónomo** un *Plan Completo de Noche de Cine* (Película + Banda Sonora + Maridaje Gastronómico + Disponibilidad de Streaming) y **aprende activamente** del feedback del usuario para recordar gustos, preferencias de duración y restricciones dietéticas en futuras sesiones.

---

## 🤖 Arquitectura Multi-Agente Autónoma (Google ADK)

1. **Master Orchestrator Agent (`master_orchestrator_agent`):**
   - Recupera el perfil y memoria colaborativa del usuario (`user_memory_profile`).
   - Delega concurrentemente las tareas a los sub-agentes especializados.
   - Sintetiza la **Nota Colaborativa** (*"He recordado que prefieres maridajes sin alcohol y películas de menos de 110 min..."*).
   - Genera la **Traza de Ejecución en Tiempo Real (`agent_trace`)** demostrando cada paso del backend.
2. **Agente Curador de Cine (`film_curator_agent`):**
   - Analiza el estado emocional profundo y atmósfera deseada.
   - Aplica filtros de edad (G/PG para niños) y directivas anti-cliché para descubrir joyas ocultas.
3. **Agente Musicólogo de Banda Sonora (`soundtrack_agent`):**
   - Analiza la BSO original, compositor, vibra musical e identifica el tema destacado.
4. **Agente Sommelier Cinematográfico (`sommelier_agent`):**
   - Curaduría de maridaje de bebida y snack adaptado a las restricciones dietéticas aprendidas (mocktails sin alcohol, vegano, etc.).
5. **Integración Streaming Regional (TMDB / JustWatch):**
   - Detecta la región del espectador y entrega opciones de suscripción, alquiler y compra digital.
6. **The Cinémathèque Archive (ClickHouse Cloud):**
   - Persiste cada experiencia completa catalogada por gaveta emocional en ClickHouse Cloud.

---

## 🌟 Características Principales e Innovaciones

* **Orquestación en 1 Solo Clic:** Paquete completo de noche de cine generado autónomamente sin interacciones fragmentadas.
* **Motor Dinámico de Descubrimiento TMDB 100% en Vivo:** Búsqueda en tiempo real sobre 800,000+ películas con enrutador multi-vía:
  - *Directores reales* (créditos oficiales de dirección)
  - *Estudios de Cine* (Studio Ghibli, A24, Pixar, Marvel)
  - *Épocas y Décadas* (años 80, 90s, 70s, 60s)
  - *Temáticas y Cine Internacional* (Latinoamericano, Asiático, Francés, etc.)
* **Memoria Activa y Aprendizaje Continuo (*Collaborative Partner*):** El agente recuerda feedbacks previos y restricciones dietéticas a lo largo de las sesiones, generando notas explícitas (*"He recordado tu preferencia de maridajes sin alcohol..."*).
* **Panel Visual "Behind the Scenes":** Línea de tiempo visual de 4 agentes especialistas con cajón técnico desplegable para los logs de Google ADK.
* **Guardrail de Seguridad de IA Responsable Multilingüe:** Filtra y mitiga contenido NSFW, violencia explícita o gore en Español, Inglés, Francés, Portugués, Italiano, Alemán y Japonés antes de cualquier consulta.
* **The Cinémathèque Archive (ClickHouse Cloud):** Archivador vintage con gavetas emocionales (`[Todos los Registros]`, `[Estresado]`, `[Triste]`, `[Cansado]`, `[Emocionado]`, `[Curioso]`), eliminación individual de tarjetas (`🗑️`) y colapso de paginación a las primeras 3 recomendaciones.
* **Autenticación Federada con Google (GIS):** Inicio de sesión con Google OAuth 2.0 y verificación JWT para sincronizar la memoria del usuario.
* **Buscador de Streaming Regional:** Consulta directa de plataformas (Netflix, Prime Video, Max, Apple TV, etc.) basada en datos de TMDB y JustWatch.

---

## 📐 Diagrama de Arquitectura

![Diagrama de Arquitectura Feel & Film](app/static/architecture_diagram.svg)

Para el mapeo detallado de componentes, consulta [ARCHITECTURE.md](ARCHITECTURE.md).

---

## 🚀 Configuración y Ejecución Local

### 1. Clonar el repositorio y configurar entorno:
```bash
git clone https://github.com/Mayorlen-Ortega/feelandfilm.git
cd feelandfilm
```

### 2. Configurar variables de entorno:
Crea un archivo `.env` basado en `.env.example`:
```ini
GEMINI_API_KEY=tu_clave_gemini
TMDB_API_KEY=tu_clave_tmdb
GOOGLE_CLIENT_ID=tu_google_client_id
# ClickHouse Cloud (opcional para analítica histórica)
CLICKHOUSE_HOST=...
CLICKHOUSE_PORT=8443
CLICKHOUSE_USER=...
CLICKHOUSE_PASSWORD=...
```

### 3. Instalar dependencias:
```bash
pip install -r requirements.txt
```

### 4. Iniciar la aplicación:
```bash
uvicorn app.main:app --reload
```
Abre en tu navegador: **http://localhost:8000**

---

## 🧪 Pruebas Automatizadas

Ejecuta la suite de pruebas del orquestador autónomo y memoria colaborativa:
```bash
python test_orchestrator.py
```

Ejecuta las pruebas de endpoints de API:
```bash
python test_api.py
```

---

## ☁️ Despliegue en Google Cloud Run

Este proyecto está completamente dockerizado para despliegue con 1 clic en **Google Cloud Run**:
1. En [Google Cloud Console](https://console.cloud.google.com/run), ve a **Cloud Run** y haz clic en **Crear servicio**.
2. Conecta tu repositorio de GitHub y selecciona el branch `feature/agentic-orchestrator`.
3. Selecciona **Dockerfile** (ruta: `/Dockerfile`).
4. Configura las variables de entorno en **Variables y Secretos**.
5. Haz clic en **Crear** para desplegar.
