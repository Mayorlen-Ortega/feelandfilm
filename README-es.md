*Leer en [Inglés](README.md).*

# Feel & Film — Autonomous Multi-Agent Cinema & Collaborative Partner

> **Agentic Cinema: The Blockbuster Hackathon**  
> **Track:** *Collaborative Partner*  
> **Motor LLM Principal:** Google Gemini 3.5 Flash  
> **Guion y Director del Biopic:** Google Gemma 2 (con soporte local en Ollama)  
> **Motor de Cinematografía y Video:** Google Veo (Prompts de Fotografía 35mm)  
> **Motor de Composición y Leitmotifs:** Google Lyria (Partitura Armónica Orquestal)  
> **Framework de Agentes:** Google Agent Development Kit (`google-adk`)  
> **Base de Datos y Memoria:** ClickHouse Cloud (Bóveda OLAP)  
> **Autenticación:** Google Identity Services (OAuth 2.0 / GIS)  
> **Despliegue:** Google Cloud Run  

---

## 🎬 Descripción del Proyecto y la Solución Agentic

Los sistemas tradicionales de recomendación de películas se limitan a filtros rígidos o algoritmos genéricos que tratan el cine como un catálogo de tienda online.

**Feel & Film** actúa como un auténtico **Socio Colaborativo Inteligente (*Collaborative Partner*)**. Coordinado por un **Master Orchestrator Agent** impulsado por **Google ADK** y **Google Gemini 3.5 Flash**, el sistema traduce emociones humanas complejas y desestructuradas en una **Experiencia Completa de Noche de Cine** en un **único ciclo autónomo**:

1. **Curaduría Emocional de Cine:** Descubrimiento semántico en tiempo real sobre 800,000+ películas de TMDB con enrutamiento inteligente para directores, estudios (*Studio Ghibli, A24*) y décadas (*años 80, 90s*).
2. **Análisis Musicológico de Banda Sonora:** Desglose profundo de la BSO extrayendo el compositor, la vibra atmosférica y el tema principal.
3. **Maridaje Gastronómico Personalizado:** Creación de maridajes de bebida y snack adaptados estrictamente a las restricciones dietéticas del usuario (*100% libre de alcohol, mocktails botánicos, snacks veganos*).
4. **Buscador de Streaming Regional (*Where to Watch*):** Detección instantánea de plataformas disponibles (*Netflix, Prime Video, Apple TV, Max*) con datos de JustWatch.
5. **Memoria Activa y Aprendizaje Continuo:** Aprende activamente del feedback del usuario a lo largo de las sesiones, generando notas colaborativas explícitas (*"He recordado que prefieres maridajes sin alcohol..."*).
6. **The Cinémathèque Archive y Registro de Vistas:** Bóveda vintage de gavetas de bronce con ordenamiento multicriterio (*Más recientes, Más antiguas, Mejor calificadas, Vistas primero, No vistas primero, Título A-Z, Director A-Z*) y gavetas de filtro (*Vistas, No vistas, 5★ Top Rated, Estados de ánimo*).
7. **Motor de Tráiler Biopic "Mira Tu Propia Película" (Google Veo, Lyria y Gemma 2):** Barra de hitos (3 películas vistas) que desbloquea un tráiler cinemático en 3 Actos a pantalla completa con transiciones Ken Burns, locución por voz y partitura armónica.

---

## 📐 Diagrama de Arquitectura y Diseño del Sistema

El diagrama ilustra cómo **Google Gemini 3.5 Flash, Gemma 2, Veo y Lyria** se conectan con el backend multi-agente, ClickHouse Cloud, las APIs externas y la capa de presentación:

![Diagrama de Arquitectura de Feel & Film](app/static/architecture_diagram.svg)

Para el mapeo técnico completo de componentes, consulta [ARCHITECTURE.md](ARCHITECTURE.md).

```text
                           [ Entrada Emocional y Restricciones ]
                                             │
                                             ▼
                    ┌─────────────────────────────────────────────────┐
                    │  Capa 0: Filtro de IA Responsable y Seguridad   │
                    │  (Guardrail Multilingüe NSFW, Violencia y Gore) │
                    └────────────────────────┬────────────────────────┘
                                             │ (Petición Segura)
                                             ▼
                    ┌─────────────────────────────────────────────────┐
                    │       Master Orchestrator Agent (Cerebro)       │
                    │       (Google ADK / Gemini 3.5 Flash)           │
                    │  - Consulta memoria del usuario y dieta         │
                    │  - Sintetiza la nota de colaboración            │
                    └────────────────────────┬────────────────────────┘
                                             │
               ┌─────────────────────────────┼─────────────────────────────┐
               ▼                             ▼                             ▼
    [ Film Curator Agent ]          [ Soundtrack Maestro ]       [ Cinema Sommelier ]
   - TMDB en Vivo 100% Dinámico   - Análisis Musicológico BSO   - Maridaje Gastronómico
   - Enrutador Inteligente:       - Compositor de la BSO        - Respeta reglas de dieta
     • Directores (Créditos)      - Tema Destacado               (100% sin alcohol /
     • Estudios (Ghibli, A24)     - Vibra Musical                snacks veganos)
     • Décadas (años 80, 90s)
     • Título / Temáticas
   - Filtro de Edad (G/PG)
               │                             │                             │
               └─────────────────────────────┼─────────────────────────────┘
                                             │
                                             ▼
                           ┌───────────────────────────────────┐
                           │   Motor de Enriquecimiento        │
                           │   • Póster HD Oficial TMDB        │
                           │   • Proveedores Streaming Región  │
                           └─────────────────┬─────────────────┘
                                             │
                                             ▼
        ┌────────────────────────────────────────────────────────────────────────┐
        │                 Experiencia Completa de Noche de Cine                  │
        │   • Película + Director + Duración + Sinopsis + Fun Fact + Póster      │
        │   • Dónde Ver en Streaming Regional (TMDB / JustWatch)                 │
        │   • Musicología de Banda Sonora + Maridaje Gastronómico                │
        │   • Bucle de Retroalimentación y Memoria (Estrellas + Chips)           │
        └────────────────────────────────────┬───────────────────────────────────┘
                                             │
                                             ▼
                    ┌─────────────────────────────────────────────────┐
                    │    The Cinémathèque Archive (ClickHouse Cloud)  │
                    │    • Ordenamiento Multicriterio y Gavetas Mood  │
                    │    • 1-Clic "Marcar como Vista" y Estrellas     │
                    │    • Eliminación Inmediata (🗑️) y Sincronización│
                    └────────────────────────┬────────────────────────┘
                                             │ (Hito de 3 Películas Vistas)
                                             ▼
                    ┌─────────────────────────────────────────────────┐
                    │   Motor de Biopic Trailer (Google Veo/Lyria/Gemma)│
                    │   • Guion Cinemático en 3 Actos (Google Gemma 2)│
                    │   • Dirección Visual en 35mm (Google Veo)       │
                    │   • Leitmotifs y Partitura (Google Lyria)       │
                    │   • Sala de Cine Completa con Voz y Ken Burns   │
                    └────────────────────────┬────────────────────────┘
                                             │
                                             ▼
                    ┌─────────────────────────────────────────────────┐
                    │        Panel Visual "Behind the Scenes"         │
                    │        • 4 Tarjetas de Decisión de Agentes      │
                    │        • Cajón Terminal de Logs de Google ADK   │
                    └─────────────────────────────────────────────────┘
```

---

## 🛠️ Stack Tecnológico y Modelos de Google Integrados

* **Framework de Agentes:** Google Agent Development Kit (`google-adk`)
* **Motor LLM Principal:** Google Gemini 3.5 Flash (`gemini-3.5-flash` vía SDK Google GenAI / Vertex AI)
* **Guion y Dirección Narrativa:** Google Gemma 2 (`gemma2` / soporte local en Ollama)
* **Motor de Video y Cinematografía:** Google Veo (Arquitectura de composición y prompts 35mm)
* **Composición Musical:** Google Lyria (Estructura armónica y leitmotifs)
* **Backend API & Servidor:** FastAPI (Python 3.11+) con servidor ASGI Uvicorn
* **Base de Datos y Memoria OLAP:** ClickHouse Cloud (vía driver `clickhouse-connect`)
* **Autenticación:** Google Identity Services (GIS / Verificación de Tokens JWT OAuth 2.0)
* **Catálogo en Vivo y Streaming:** The Movie Database (API TMDB v3/v4) e integración JustWatch
* **Frontend:** Vanilla HTML5, CSS3 Moderno (Diseño Glassmorphism y Cinema-Noir), JavaScript ES6+
* **Contenerización y Despliegue:** Docker, Google Cloud Run

---

## 🚀 Guía de Inicio Paso a Paso (Reproducción Local)

Sigue estos pasos para clonar, configurar y ejecutar el proyecto desde cero en menos de 3 minutos.

### 1. Prerrequisitos
- **Python:** 3.10, 3.11 o 3.12 instalado ([python.org](https://www.python.org/downloads/))
- **Git:** Instalado en tu sistema
- **Claves API:**
  - **API Key de Google Gemini:** Gratuita en [Google AI Studio](https://aistudio.google.com/)
  - **API Key de TMDB:** Gratuita en [The Movie Database](https://www.themoviedb.org/settings/api)

---

### 2. Clonar el Repositorio
```bash
git clone https://github.com/Mayorlen-Ortega/feelandfilm.git
cd feelandfilm
```

---

### 3. Crear y Activar un Entorno Virtual

**En Windows (PowerShell / Símbolo del Sistema):**
```powershell
python -m venv .venv
.venv\Scripts\activate
```

**En macOS / Linux (bash / zsh):**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

---

### 4. Instalar Dependencias
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

---

### 5. Configurar Variables de Entorno (`.env`)
Crea tu archivo local `.env` a partir de la plantilla:

**Windows:**
```powershell
copy .env.example .env
```

**macOS / Linux:**
```bash
cp .env.example .env
```

Edita `.env` con tus credenciales:
```ini
# 1. API Key de Google Gemini (Requerida)
GEMINI_API_KEY=tu_api_key_de_gemini_aistudio

# 2. API Key de TMDB (Requerida para metadatos y streaming en vivo)
TMDB_API_KEY=tu_api_key_o_bearer_token_de_tmdb

# 3. Google Client ID (Opcional para inicio de sesión con Google)
GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com

# 4. ClickHouse Cloud (Opcional - usa memoria local si se deja vacío)
CLICKHOUSE_HOST=
CLICKHOUSE_PORT=8443
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=
CLICKHOUSE_SECURE=True
```

---

### 6. Ejecutar la Aplicación
Inicia el servidor FastAPI con recarga automática:
```bash
python -m uvicorn app.main:app --reload --port 8000
```

Abre tu navegador en:  
👉 **`http://localhost:8000`**

---

### 7. Ejecutar Pruebas Automatizadas
Comprueba que todos los flujos multi-agente, guardrails de seguridad y endpoints pasen al 100%:

```bash
# 1. Probar el Orquestador Multi-Agente y el Bucle de Memoria Colaborativa
python test_orchestrator.py

# 2. Probar Endpoints de la API, Cinemateca, Pósters y Streaming
python test_api.py
```

---

## ☁️ Instrucciones de Despliegue en la Nube

### Opción A: Despliegue en 1 Clic en Google Cloud Run (Recomendado)

Feel & Film está completamente contenerizado con un `Dockerfile` optimizado para producción.

1. Abre la **[Consola de Google Cloud](https://console.cloud.google.com/run)** y dirígete a **Cloud Run**.
2. Haz clic en **Crear servicio** ➡️ **Implementar continuamente desde un repositorio**.
3. Selecciona tu repositorio de GitHub (`feelandfilm`) y elige la rama `main` (o `feature/agentic-orchestrator`).
4. En **Configuración de compilación**, selecciona **Dockerfile** (ruta: `/Dockerfile`).
5. En **Autenticación**, selecciona **Permitir invocaciones no autenticadas**.
6. En **Contenedor, Variables y Secretos**, añade tus variables de entorno (`GEMINI_API_KEY`, `TMDB_API_KEY`, `GOOGLE_CLIENT_ID`, `CLICKHOUSE_HOST`, etc.).
7. Haz clic en **Crear** para desplegar. Cloud Run generará automáticamente una URL segura `https://*.run.app`.

### Opción B: Despliegue local con Docker
```bash
# 1. Construir la imagen Docker
docker build -t feelandfilm .

# 2. Ejecutar el contenedor Docker
docker run -p 8000:8000 --env-file .env feelandfilm
```

---

## 🌟 Características Principales e Innovaciones

* **Orquestación en 1 Solo Clic:** Paquete completo de noche de cine generado autónomamente sin interacciones fragmentadas.
* **Motor Dinámico de Descubrimiento TMDB 100% en Vivo:** Búsqueda en tiempo real sobre 800,000+ películas con enrutador multi-vía:
  - *Directores reales* (créditos oficiales de dirección)
  - *Estudios de Cine* (Studio Ghibli, A24, Pixar, Marvel)
  - *Épocas y Décadas* (años 80, 90s, 70s, 60s)
  - *Temáticas y Cine Internacional* (Latinoamericano, Asiático, Francés, etc.)
* **Memoria Activa y Aprendizaje Continuo (*Collaborative Partner*):** El agente recuerda feedbacks previos y restricciones dietéticas a lo largo de las sesiones, generando notas explícitas (*"He recordado tu preferencia de maridajes sin alcohol..."*).
* **Motor de Tráiler Biopic "Mira Tu Propia Película":**
  - **Google Gemma 2**: Dirección narrativa y guion estructurado en 3 Actos (*Catalizador, Viaje, Catarsis*).
  - **Google Veo**: Prompts cinematográficos de fotografía en 35mm y composición de planos.
  - **Google Lyria**: Composición de leitmotifs y atmósfera musical orquestal.
  - **Reproductor de Cine en Pantalla Completa**: Animación Ken Burns, locución por voz en vivo y acordes armónicos.
  - **Modo Demo para Jueces**: Permite a los evaluadores del hackathon probar el tráiler en 1 clic.
* **The Cinémathèque Archive (ClickHouse Cloud):** Archivador vintage con:
  - **Ordenamiento Multicriterio**: Más recientes, Más antiguas, Mejor calificadas (5★), Vistas primero, No vistas primero, Título (A-Z), Director (A-Z).
  - **Filtros por Gavetas**: Solo Vistas, No Vistas/Watchlist, 5★ Top Rated, Estresado, Triste, Cansado, Emocionado, Curioso.
  - **Marcado de Películas Vistas y Calificación por Estrellas Separada**: Seguimiento de hitos y evaluación post-película.
  - **Eliminación Instantánea (🗑️)**: Desvanecimiento visual inmediato y sincronización con ClickHouse.
* **Panel Visual "Behind the Scenes":** Línea de tiempo de 4 agentes especialistas al final de la página con cajón técnico desplegable para los logs de Google ADK.
* **Guardrail de Seguridad de IA Responsable Multilingüe:** Filtra y mitiga contenido NSFW, violencia explícita o gore en Español, Inglés, Francés, Portugués, Italiano, Alemán y Japonés antes de cualquier consulta.
* **Autenticación Federada con Google (GIS):** Inicio de sesión con Google OAuth 2.0 y verificación JWT para sincronizar la memoria del usuario.
* **Buscador de Streaming Regional:** Consulta directa de plataformas (Netflix, Prime Video, Max, Apple TV, etc.) basada en datos de TMDB y JustWatch.

---

## 📜 Código de Terceros, Divulgaciones y Créditos

En cumplimiento con las directrices de transparencia del hackathon, se detalla la atribución de todas las librerías, servicios y activos de terceros utilizados:

1. **Google Agent Development Kit (`google-adk`):** Framework de Google para la orquestación multi-agente, control de estado y runners.
2. **Google GenAI SDK (`google-genai`):** Interfaz para los modelos Google Gemini 3.5 Flash y Google Gemma 2.
3. **The Movie Database (API TMDB):** Metadatos de películas en vivo, créditos de directores y pósters en HD. *(Este producto utiliza la API de TMDB pero no está respaldado ni certificado por TMDB).*
4. **Datos de JustWatch (vía TMDB Watch Providers):** Detección de disponibilidad regional en plataformas de streaming.
5. **Driver Python de ClickHouse (`clickhouse-connect`):** Conectividad con la base de datos OLAP ClickHouse Cloud.
6. **FastAPI y Uvicorn:** Framework web asíncrono y servidor ASGI para Python.
7. **Pydantic:** Validación estricta de esquemas de datos.
8. **FontAwesome 6 y Google Fonts (Cinzel, Playfair Display, Outfit, Fira Code):** Tipografías e iconografía bajo licencias abiertas estándar.

---

## 📄 Licencia
Este proyecto está licenciado bajo la **Licencia MIT** — consulta el archivo [LICENSE](LICENSE) para más detalles.
