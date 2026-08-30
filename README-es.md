*Leer en [Inglés](README.md).*

# Feel & Film — Cine Autónomo Multi-Agente y Socio Colaborativo

> **Agentic Cinema: The Blockbuster Hackathon**  
> **Track:** *Collaborative Partner*  
> **Motor LLM Principal:** Google Gemini 3.5 Flash (`gemini-3.5-flash` vía Google GenAI SDK)  
> **Guion y Director del Biopic:** Google Gemma 2 (`gemma2` / soporte local en Ollama)  
> **Motor de Cinematografía y Video:** Google Veo (Prompts de Fotografía 35mm)  
> **Motor de Composición y Leitmotifs:** Google Lyria (Partitura Armónica y Sintetizador)  
> **Framework de Agentes:** Google Agent Development Kit (`google-adk`)  
> **Base de Datos y Memoria:** ClickHouse Cloud (Bóveda OLAP)  
> **Autenticación:** Google Identity Services (OAuth 2.0 / GIS)  
> **Despliegue:** Google Cloud Run  

---

## 🎬 Descripción del Proyecto y la Solución Agentic

Los sistemas tradicionales de recomendación de películas se limitan a filtros rígidos o algoritmos genéricos que tratan el cine como un catálogo de tienda online.

**Feel & Film** actúa como un auténtico **Socio Colaborativo Inteligente (*Collaborative Partner*)**. Coordinado por un **Master Orchestrator Agent** impulsado por **Google ADK** y **Google Gemini 3.5 Flash**, el sistema traduce emociones humanas complejas y desestructuradas en una **Experiencia Completa de Noche de Cine** en un **único ciclo autónomo**:

1. **Curaduría Emocional de Cine:** Descubrimiento semántico en tiempo real sobre 800,000+ películas de TMDB con enrutamiento inteligente para directores de autor (*Denis Villeneuve, Alfred Hitchcock*), estudios (*Studio Ghibli, A24*), décadas (*años 80, 90s*) y temáticas internacionales.
2. **Análisis Musicológico de Banda Sonora:** Desglose profundo de la BSO extrayendo el compositor, la vibra atmosférica y el tema principal.
3. **Maridaje Gastronómico Personalizado:** Creación de maridajes de bebida y snack adaptados estrictamente a las restricciones dietéticas del usuario (*100% libre de alcohol, mocktails botánicos, snacks veganos*).
4. **Buscador de Streaming Regional (*Where to Watch*):** Detección instantánea de plataformas disponibles (*Netflix, Prime Video, Apple TV, Max*) con datos de JustWatch.
5. **Memoria Activa y Aprendizaje Continuo:** Aprende activamente del feedback del usuario a lo largo de las sesiones, generando notas colaborativas explícitas (*"He recordado que prefieres maridajes sin alcohol..."*).
6. **The Cinémathèque Archive y Registro de Vistas:** Bóveda vintage de gavetas de bronce con ordenamiento multicriterio (*Más recientes, Más antiguas, Mejor calificadas, Vistas primero, No vistas primero, Título A-Z, Director A-Z*) y gavetas de filtro (*Vistas, No vistas, 5★ Top Rated, Estados de ánimo*).
7. **Matriz de Alineación y Fidelidad Multi-Restricción (`Alt+A` / `Option+A`):** Panel interactivo de evaluación cuantitativa que mide cómo las recomendaciones respetan múltiples restricciones simultáneas (*estado de ánimo vs director/década/tema/dieta explícitos*) a lo largo de las 10 sesiones más recientes, con notas de arbitraje Pareto, tarjetas de KPIs y exportaciones en 1-clic (*CSV, JSON, Markdown*).
8. **Constelación Emocional 3D & Motor de Leitmotivs de Google Lyria (*Cosmic Cinema Cartography*):** Asterismo cósmico interactivo donde todo el historial de películas vistas se cartografía en nodos con forma de estrella radiante y enlaces orgánicos. Cuenta con **escalado de profundidad cósmica ($Z$-Depth)** para $>5$ películas (las más recientes brillan en primer plano al 100% mientras las más antiguas se alejan hacia el fondo cósmico con menor opacidad y escala). Mediante **Google Lyria**, cada estrella sintetiza un **leitmotiv cinematográfico original de 5 segundos** (*Space Synth, Celesta Bell, Noir Piano, Orchestral Strings, Vals Parisino*) con convolución de reverberación de catedral en tiempo real, colchón de sub-bajo y línea de tiempo sincronizada.
9. **Agente Mayordomo de Correo (*Cinema Courier & Epistle Agent*):** Genera y despacha cartas editoriales personalizadas a tu correo con la justificación del curador, la receta paso a paso del cóctel/snack para tu cocina y la guía de streaming para organizar tu noche de cine en 1 clic.
10. **Exploración Rápida en 1-Clic (*Instant Re-roll*) y Modo Batería Segura:** Botón directo para pedir otra película alternativa manteniendo el mismo mood sin repetir formularios, con arquitectura tolerante a fallos y avisos amigables de recarga de créditos (cero errores 500).

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
                    │  (Guardrail Multilingüe NSFW, Violencia y Cine) │
                    └────────────────────────┬────────────────────────┘
                                             │ (Petición Segura)
                                             ▼
                    ┌─────────────────────────────────────────────────┐
                    │       Master Orchestrator Agent (Cerebro)       │
                    │       (Google ADK / Gemini 3.5 Flash)           │
                    │  - Consulta memoria del usuario y dieta         │
                    │  - Sintetiza la nota de colaboración            │
                    │  - Deduplica (excluye películas de la cineteca) │
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
        │   • 🎲 1-Clic Re-roll (Mismo Mood) + Modo Batería Segura               │
        │   • ✉️ Cinema Courier Agent (Despacho a Correo en 1-Clic)              │
        │   • Bucle de Retroalimentación y Memoria (Estrellas + Chips)           │
        └────────────────────────────────────┬───────────────────────────────────┘
                                             │
                                             ▼
                    ┌─────────────────────────────────────────────────┐
                    │    The Cinémathèque Archive (ClickHouse Cloud)  │
                    │    • Ordenamiento Multicriterio y Gavetas Mood  │
                    │    • 1-Clic "Marcar como Vista" y Estrellas     │
                    │    • 🎬 1-Clic Revivir Paquete desde la Bóveda  │
                    │    • Eliminación Inmediata (🗑️) y Sincronización│
                    └────────────────────────┬────────────────────────┘
                                             │
               ┌─────────────────────────────┴─────────────────────────────┐
               ▼                                                           ▼
┌──────────────────────────────────────────────┐    ┌──────────────────────────────────────────────┐
│  Matriz de Alineación y Fidelidad de IA      │    │ Constelación Emocional 3D (Google Lyria)     │
│  • Puntuación de Fidelidad (94.2%)           │    │ • Asterismo Irregular y Nodos Estrella      │
│  • Arbitraje de Pareto en Restricciones      │    │ • Capas de Profundidad Z (>5 Películas)     │
│  • Tabla Histórica de Auditoría (10 Sesiones)│    │ • Leitmotivs Cinematográficos de 5s (Lyria)  │
│  • Exportación en 1-Clic (CSV, JSON, MD)     │    │ • DSP Reverb de Catedral y Sincronización    │
└──────────────────────────────────────────────┘    └──────────────────────────────────────────────┘
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
* **Composición Musical y Ambiente:** Google Lyria (Estructura armónica, leitmotifs y sintetizador)
* **Backend API & Servidor:** FastAPI (Python 3.11+) con servidor ASGI Uvicorn
* **Base de Datos y Memoria OLAP:** ClickHouse Cloud (vía driver `clickhouse-connect`)
* **Autenticación:** Google Identity Services (GIS / Verificación de Tokens JWT OAuth 2.0)
* **Catálogo en Vivo y Streaming:** The Movie Database (API TMDB v3/v4) e integración JustWatch
* **Frontend:** Vanilla HTML5, CSS3 Moderno (Diseño Glassmorphism y Cinema-Noir), JavaScript ES6+
* **Contenerización y Despliegue:** Docker, Google Cloud Run

---

## 🚀 Guía de Inicio Paso a Paso (Reproducción Local)

Sigue estos pasos para clonar, configurar y ejecutar el proyecto desde cero en menos de 3 minutos:

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
7. Haz clic en **Crear**. Cloud Run construirá y desplegará automáticamente el contenedor, proporcionando una URL segura `https://*.run.app`.

### Opción B: Despliegue Local con Docker
```bash
# 1. Construir la imagen Docker
docker build -t feelandfilm .

# 2. Ejecutar el contenedor
docker run -p 8000:8000 --env-file .env feelandfilm
```

---

## 🌟 Características Clave e Innovaciones

* **Orquestación Autónoma en 1 Clic:** Genera el paquete completo de la noche de cine en una sola pasada sin interacciones fragmentadas.
* **Motor TMDB Dinámico 100% en Vivo:** Descubrimiento semántico en tiempo real sobre 800,000+ títulos con enrutamiento para:
  - *Directores de autor* (verificación oficial en créditos de dirección)
  - *Estudios cinematográficos* (Studio Ghibli, A24, Pixar, Marvel)
  - *Eras y décadas* (años 80, 90, 70, cine clásico)
  - *Temáticas internacionales* (cine latinoamericano, cine japonés, cine noir francés)
* **Matriz de Alineación y Fidelidad de IA (`Alt+A`):**
  - **Puntuación de Fidelidad Cuantitativa**: Mide el porcentaje de cumplimiento sobre directivas complejas y múltiples.
  - **Arbitraje de Pareto**: Analiza cómo el Master Orchestrator equilibra el estado de ánimo emocional frente a directivas explícitas (*p. ej. "Alivio del estrés" + "Denis Villeneuve", manteniendo la relajación sin traicionar el estilo del director*).
  - **Auditoría y Exportaciones**: Tabla con 10 sesiones recientes y botones para exportar en Markdown, CSV y JSON.
* **Constelación Emocional 3D & Motor de Leitmotivs Google Lyria:**
  - **Cartografía Longitudinal**: Sintetiza todo el historial de películas vistas en un asterismo cósmico orgánico e irregular.
  - **Escalado de Profundidad $Z$-Depth**: Películas recientes en primer plano y filmes antiguos atenuados en el fondo cósmico ($>5$ películas vistas).
  - **Sintetizador Acústico Google Lyria**: Genera un leitmotiv original de 5 segundos para cada nodo estelar (*Space Synth, Celesta Bell, Noir Piano, Orchestral Strings, Vals Parisino*) con convolución de reverberación de catedral en tiempo real, colchón de sub-bajo y línea de tiempo sincronizada.
* **Memoria Continua y Aprendizaje Colaborativo (*Collaborative Partner*):** Recuerda preferencias dietéticas y estilo a lo largo de las sesiones, generando notas colaborativas explícitas (*"He recordado que prefieres maridajes sin alcohol..."*).
* **The Cinémathèque Archive (ClickHouse Cloud):** Bóveda vintage de gavetas con:
  - **Ordenamiento Multicriterio**: Más recientes, Más antiguas, Mejor calificadas (5★), Vistas primero, No vistas primero, Título (A-Z), Director (A-Z).
  - **Gavetas de Filtro**: Vistas, No vistas/Watchlist, 5★ Top Rated, y estados de ánimo (Stressed, Melancholic, Tired, Excited, Curious).
  - **Interruptor Interactivo de Vistas y Calificación por Estrellas**: Marca tus películas vistas y califícalas post-visionado.
  - **Eliminación Inmediata Optimista (`🗑️`)**: Remoción fluida sincronizada con ClickHouse.
* **Panel Visual de la Tripulación de IA y Terminal de Logs:** 4 tarjetas de agentes especialistas con terminal desplegable de trazas en vivo para auditorías de los jueces.
* **Filtro de Contenido Responsable con Whitelist de Cine:** Bloquea contenido NSFW y violencia explícita protegiendo nombres de la industria (*evitando falsos positivos con directores como Alfred Hitchcock*).
* **Modo Batería Segura y Cero Errores 500:** Recuperación automática ante límites de cuota de API, sirviendo alternativas de autor con avisos elegantes de recarga en pantalla.
* **Autenticación Federada (GIS):** Inicia sesión con Google (OAuth 2.0 / JWT) para sincronizar tu bóveda cinematográfica personal.
* **Buscador Regional de Streaming (*Where to Watch*):** Disponibilidad en tiempo real para Netflix, Prime Video, Apple TV, Max, etc.

---

## 📜 Código de Terceros, Divulgaciones y Atribución

En cumplimiento con las directrices de transparencia del Hackathon, se atribuyen a continuación todas las librerías, servicios y activos de terceros utilizados:

1. **Google Agent Development Kit (`google-adk`):** Framework de Google para control de estado, ejecutores multi-agente y orquestación.
2. **Google GenAI SDK (`google-genai`):** Librería cliente para Google Gemini 3.5 Flash y Google Gemma 2.
3. **The Movie Database (API TMDB):** Metadatos en vivo, créditos de dirección y pósters en HD. *(Este producto utiliza la API de TMDB pero no está respaldado ni certificado por TMDB).*
4. **Datos de JustWatch (vía TMDB Watch Providers):** Detección de disponibilidad regional en streaming.
5. **Driver Python de ClickHouse (`clickhouse-connect`):** Conectividad OLAP de alto rendimiento con ClickHouse Cloud.
6. **FastAPI & Uvicorn:** Framework web asíncrono y servidor ASGI para Python.
7. **Pydantic:** Validación de tipos y análisis de datos estructurados.
8. **FontAwesome 6 y Google Fonts (Cinzel, Playfair Display, Outfit, Fira Code):** Tipografía e iconografía de código abierto.

---

## 📄 Licencia
Este proyecto es de código abierto y está bajo la **Licencia MIT** — consulta el archivo [LICENSE](LICENSE) para más detalles.
