*Leer en [Inglés](README.md).*

# Feel & Film
Feel & Film es una plataforma autónoma multi-agente de curaduría cinematográfica emocional y cineteca personal, desarrollada para la hackathon **Agentic Cinema: The Blockbuster Hackathon**.

---

## El Problema y los Usuarios Objetivo
Los programadores de cine y cinéfilos suelen enfrentarse al desafío de equilibrar la intuición creativa con las emociones de la audiencia. Feel & Film resuelve esto orquestando agentes de IA autónomos impulsados por **Google ADK** y **Gemini 3.5 Flash** para transformar estados de ánimo expresivos en recomendaciones cinematográficas personalizadas, enriquecidas con maridajes de concesión, análisis musicológico, plataformas de streaming regionales y una **Cinémathèque Archive (Cineteca Personal Vintage)** respaldada por **ClickHouse Cloud**.

---

## Flujo de Trabajo Autónomo Multi-Agente
1. **Autenticación Federada con Google:** Los usuarios inician sesión con Google Identity Services (GIS) para desbloquear su cineteca personal y preservar su historial emocional.
2. **Entrada de Audiencia Expresiva:** El usuario escribe con total libertad sobre cómo se siente (`initial_mood`), la experiencia cinematográfica deseada (`desired_atmosphere`), notas temáticas opcionales (`theme`) y rango demográfico de edad (`audience_age_range`).
3. **Agente Curador de Películas (`film_curator_agent`):**
   - Analiza en profundidad los matices emocionales usando **Gemini 3.5 Flash** (vía Google ADK).
   - Extrae etiquetas multi-emocionales (`detected_mood_tags`), estado principal y giro de atmósfera.
   - Aplica filtros estrictos de edad (G/PG para Niños 0-12) y directivas anti-cliché para descubrir joyas ocultas.
   - Sintetiza una recomendación con sinopsis, razonamiento del curador y dato curioso cinematográfico.
4. **Agente de Banda Sonora (`soundtrack_agent`):**
   - Analiza la musicología del film y extrae el compositor de la BSO, la vibra musical y la pista destacada.
5. **Agente Sommelier (`sommelier_agent`):**
   - Curaduria de maridaje de snacks y bebidas que complementan el tono de la película, con aclaraciones descriptivas en inglés.
6. **Integración "Where to Watch" (TMDB / JustWatch):**
   - Detecta la región del usuario y consulta plataformas de streaming disponibles, alquiler digital y enlaces directos con caché en el cliente.
7. **Persistencia en The Cinémathèque Archive (ClickHouse Cloud):**
   - Archiva automáticamente la ficha completa, póster, etiquetas de humor y notas del usuario en **ClickHouse Cloud** para su consulta en cajones vintage.

---

## Características Principales
* **Trío Multi-Agente de Google ADK:** 3 agentes especializados (`film_curator_agent`, `soundtrack_agent`, `sommelier_agent`) colaborando de forma autónoma.
* **The Cinémathèque Archive:** Cajones archivadores de bronce vintage (`[Todos los Registros]`, `[Estresado]`, `[Triste]`, `[Cansado]`, `[Emocionado]`, `[Curioso]`) que preservan las películas y notas emocionales en ClickHouse Cloud.
* **Autenticación Federada con Google:** Inicio de sesión con Google (GIS / One-Tap), verificación JWT y alertas de Modo Invitado.
* **Buscador de Streaming "Where to Watch":** Consulta de disponibilidad regional (Netflix, Prime Video, Max, Apple TV, etc.) sin llamadas API redundantes gracias a la caché en el navegador.
* **Campos de Texto Expresivos:** Textareas flexibles para expresar estados de ánimo complejos y multidimensionales.
* **Motor de Descubrimiento Anti-Cliché:** Directivas de diversidad y memoria de sesión (`excluded_films`) que evitan recomendaciones repetitivas.
* **Diseño Cinema-Noir:** Estética refinada con Glassmorphism, tipografías elegantes (Cinzel y Playfair Display) y tarjetas de archivo estilo biblioteca clásica.

---

## Diagrama de Arquitectura

![Diagrama de Arquitectura Feel & Film](app/static/architecture_diagram.svg)

Para ver el mapeo detallado de componentes, consulta [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Stack Tecnológico y Créditos
* **Framework de Agentes:** Google ADK (`google-adk`)
* **Motor LLM:** Google Gemini 3.5 Flash (vía Google Cloud / ADK)
* **Autenticación:** Google Identity Services (GIS / OAuth 2.0)
* **Backend:** FastAPI (Python 3.11+)
* **Base de Datos:** ClickHouse Cloud (Analítica OLAP y Archivo Histórico)
* **Fuentes de Datos:** The Movie Database (TMDB API) y datos de JustWatch. *(Este producto utiliza la API de TMDB pero no está avalado ni certificado por TMDB).*
* **Frontend:** HTML5, CSS3, JavaScript Vanilla

---

## Configuración Local
1. Clonar el repositorio:
   ```bash
   git clone https://github.com/Mayorlen-Ortega/feelandfilm.git
   cd feelandfilm
   ```
2. Instalar dependencias:
   ```bash
   pip install -r requirements.txt
   ```
3. Configurar variables de entorno:
   ```bash
   cp .env.example .env
   ```
   Añade tu `GEMINI_API_KEY`, `TMDB_API_KEY`, `GOOGLE_CLIENT_ID` y credenciales de ClickHouse.
4. Iniciar la aplicación:
   ```bash
   uvicorn app.main:app --reload
   ```
5. Abrir [http://localhost:8000](http://localhost:8000) en el navegador.

---

## Ejecución de Pruebas
Ejecuta la suite de pruebas automatizadas:
```bash
python test_api.py
```

---

## Despliegue en Google Cloud Run
Este proyecto está completamente dockerizado para despliegue con 1 clic en **Google Cloud Run**:
1. En [Google Cloud Console](https://console.cloud.google.com/run), ve a **Cloud Run** y haz clic en **Crear servicio**.
2. Selecciona **Implementar una revisión desde un repositorio existente** y conecta tu repositorio de GitHub.
3. Selecciona **Dockerfile** (ruta: `/Dockerfile`).
4. En Autenticación, marca **Permitir invocaciones no autenticadas**.
5. En **Variables y Secretos**, configura las variables de entorno de tu `.env`.
6. Haz clic en **Crear** para desplegar.
