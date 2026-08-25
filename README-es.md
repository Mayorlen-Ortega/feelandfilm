*Read this in [English](README.md).*

# Feel & Film
Feel & Film es un asistente de programación cinematográfica autónomo y multi-agente para cineclubes y entusiastas, creado para el hackathon **Agentic Cinema: The Blockbuster Hackathon**.

---

## Problema y Usuarios Objetivo
Los programadores de cine y cinéfilos a menudo luchan por equilibrar su intuición creativa con los datos de audiencia. Feel & Film resuelve esto orquestando agentes de IA autónomos impulsados por **Google ADK** y **Gemini 3.5 Flash** para generar recomendaciones de películas altamente curadas según el estado de ánimo actual de la audiencia, la atmósfera emocional deseada, peticiones temáticas específicas y analítica histórica en tiempo real con **ClickHouse Cloud**.

---

## Flujo Multi-Agente Autónomo
1. **Entrada de la Audiencia:** El usuario selecciona el estado de ánimo inicial, la atmósfera deseada, el rango etario (Niños, Adolescentes, Adultos, Familia Mixta) y temas opcionales.
2. **Agente Curador (`film_curator_agent`):**
   - Interpreta las restricciones con **Gemini 3.5 Flash** (vía Google ADK).
   - Valida la consistencia lógica (rechaza combinaciones contradictorias como "Comedia Triste" de forma educada).
   - Aplica restricciones estrictas de edad (G/PG estricto para Niños 0-12).
   - Sintetiza una recomendación de película curada con sinopsis, razonamiento y dato curioso.
3. **Agente de Banda Sonora (`soundtrack_agent`):**
   - Analiza la musicología del filme para extraer compositor de la BSO, atmósfera sonora y tema destacado.
4. **Agente Sommelier (`sommelier_agent`):**
   - Sugiere un maridaje de snacks y bebidas personalizado según el tono de la película.
5. **Buscador de Streaming "Dónde Ver" (TMDB / JustWatch):**
   - Detecta la región del usuario y consulta plataformas de suscripción, alquiler digital y enlaces directos.
6. **Hidratación de Póster:**
   - Consulta de forma asíncrona la **API de TMDB** para mostrar la carátula en alta resolución.
7. **Persistencia Analítica (ClickHouse Cloud):**
   - Registra el evento en **ClickHouse Cloud** para analítica OLAP en tiempo real.

---

## Funcionalidades y Aspectos Destacados
* **Trío Multi-Agente Google ADK:** 3 agentes especializados (`film_curator_agent`, `soundtrack_agent`, `sommelier_agent`) colaborando de forma modular.
* **Buscador "Dónde Ver" Regional:** Disponibilidad en Netflix, Prime Video, HBO Max, Apple TV, etc., con caché en cliente para evitar consumo redundante.
* **Panel de Inteligencia Emocional de Audiencia:** Analítica OLAP en tiempo real desde ClickHouse con micro-tarjetas KPI y **Matriz de Transición Emocional** (Gráfico de barras apiladas que ilustra hacia qué atmósfera desea transicionar la audiencia según cómo se siente).
* **Motor Anti-Clichés y Variabilidad:** Directivas de descubrimiento y memoria de sesión en el navegador (`excluded_films`) para evitar repeticiones.
* **Diseño e Interfaz Cinemática:** Estética Cinema-Noir con Glassmorphism, tipografía editorial (Cinzel & Playfair Display) y gráficos dinámicos con Chart.js.

---

## Tecnologías y Créditos
* **Framework de Agentes:** Google ADK (`google-adk`)
* **Modelo LLM:** Google Gemini 3.5 Flash (vía Google Cloud / ADK)
* **Backend:** FastAPI (Python 3.11+)
* **Base de Datos:** ClickHouse Cloud (Analítica OLAP)
* **Fuentes de Datos:** The Movie Database (TMDB API) y JustWatch. *(Este producto utiliza la API de TMDB pero no está respaldado ni certificado por TMDB).*
* **Frontend:** Vanilla HTML5, CSS3, JavaScript, Chart.js

---

## Configuración Local
1. Clona el repositorio:
   ```bash
   git clone https://github.com/Mayorlen-Ortega/feelandfilm.git
   cd feelandfilm
   ```
2. Instala las dependencias:
   ```bash
   pip install -r requirements.txt
   ```
3. Configura las variables de entorno:
   ```bash
   cp .env.example .env
   ```
   Añade tus credenciales de `GEMINI_API_KEY`, `TMDB_API_KEY` y ClickHouse.
4. Inicia el servidor:
   ```bash
   uvicorn app.main:app --reload
   ```
5. Abre [http://localhost:8000](http://localhost:8000) en tu navegador.

---

## Ejecución de Pruebas
Ejecuta la suite de pruebas automatizadas que valida todos los endpoints y la analítica:
```bash
python test_api.py
```

---

## Despliegue (Google Cloud Run)
Este proyecto está completamente contenedorizado y listo para desplegarse en **Google Cloud Run**:
1. En la [Consola de Google Cloud](https://console.cloud.google.com/run), ve a **Cloud Run** y pulsa en **Crear Servicio**.
2. Selecciona **Implementar una revisión desde un repositorio existente** y conecta tu cuenta de GitHub.
3. Elige **Dockerfile** (ruta: `/Dockerfile`).
4. En Autenticación, marca **Permitir invocaciones no autenticadas**.
5. En la sección **Variables y Secretos**, añade las variables de tu archivo `.env`.
6. Haz clic en **Crear** para desplegar.
