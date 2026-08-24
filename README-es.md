*Read this in [English](README.md).*

# Feel & Film

Feel & Film es un asistente de programación autónomo para cineclubes y entusiastas, creado para el hackathon **Agentic Cinema: The Blockbuster Hackathon**.

## Problema y Usuarios Objetivo
Los programadores de cine a menudo luchan por equilibrar su intuición creativa con los datos de audiencia. Feel & Film resuelve esto utilizando un agente de IA autónomo para generar una recomendación de película altamente curada basada en el estado de ánimo actual de la audiencia, la atmósfera emocional deseada, peticiones temáticas específicas y métricas de rendimiento histórico.

## Flujo del Agente Autónomo
1. El usuario ingresa las restricciones de la audiencia (ej. Estresados, buscando Emociones, Tema: Zombis, para Niños).
2. El agente interpreta esta petición usando **Gemini 3.5 Flash** (vía Google ADK).
3. El agente valida la consistencia lógica (ej. previniendo peticiones contradictorias como Tema + Estado de ánimo opuestos) y aplica estrictamente las clasificaciones por edad.
4. Sintetiza una única recomendación perfecta, explicando su razonamiento, proporcionando una sinopsis y un dato curioso cinematográfico.
5. El backend inyecta automáticamente el póster oficial de la película llamando a la **API de TMDB**.
6. El resultado se devuelve a una interfaz web elegante con temática de cine.
7. El backend almacena automáticamente el estado de ánimo solicitado en **ClickHouse Cloud** para el seguimiento de datos en vivo.

## Funciones Inteligentes y Respaldos (Fallbacks)
* **Agente Sommelier (Orquestación Multi-Agente):** Un segundo agente ADK que actúa como un sommelier de cine, proporcionando recomendaciones de snacks y bebidas perfectamente maridadas con la atmósfera de la película recomendada.
* **Validación de Contradicciones Temáticas:** Si un usuario pide una combinación completamente contradictoria (ej. Comedia Triste), la IA rechaza cortésmente la petición en lugar de alucinar una película inexistente.
* **Filtrado Estricto de Edad:** La IA impone restricciones estrictas G/PG cuando se selecciona el grupo demográfico "Niños (0-12)", bloqueando recomendaciones maduras/clasificación R.
* **Interfaz y Experiencia de Usuario (UI/UX) Cinematográfica:** El frontend cuenta con tipografía elegante (Cinzel & Playfair Display), diseños Flexbox responsivos, carga asíncrona de pósters con animaciones de carga y bordes de tira de película en CSS puro.

## Integración con Google ADK
La lógica central está orquestada usando el framework de Python `google-adk`. El `Agente` está definido con instrucciones específicas y se le proporcionan herramientas personalizadas en Python. ADK gestiona el bucle de razonamiento y la ejecución autónoma de las herramientas.

## Tecnologías y Créditos
* **Framework de Agentes:** Google ADK
* **Modelos de IA (LLM):** Gemini 3.5 Flash
* **Base de Datos:** ClickHouse Cloud
* **Fuentes de Datos:** Este producto utiliza la API de TMDB pero no está respaldado ni certificado por TMDB.

## Integración con ClickHouse Cloud
El backend interactúa directamente con **ClickHouse Cloud** para persistir y agregar las sesiones históricas de la audiencia. Cuando la aplicación web carga, consulta a ClickHouse para generar un gráfico analítico determinista (sin gastar créditos de IA).

## Configuración Local
1. Clona este repositorio.
2. Instala las dependencias: `pip install -r requirements.txt`
3. Copia `.env.example` a `.env` y rellena con tus credenciales (`GEMINI_API_KEY`, `TMDB_API_KEY` y variables de ClickHouse).
4. Inicia el servidor: `uvicorn app.main:app --reload`
5. Abre `http://localhost:8000`

## Despliegue (Google Cloud Run)
Para cumplir con el requisito de Google Cloud, este proyecto está completamente contenedorizado y listo para Cloud Run.

La forma más fácil de desplegar es mediante **Despliegue Continuo con Cloud Build**:
1. Ve a la [Consola de Google Cloud](https://console.cloud.google.com/run) y navega a **Cloud Run**.
2. Haz clic en **Crear Servicio**.
3. Selecciona **Implementar una revisión desde un repositorio existente**.
4. Conecta tu cuenta de GitHub y selecciona este repositorio.
5. En la Configuración de Compilación, selecciona **Dockerfile** (ruta: `/Dockerfile`).
6. En Autenticación, selecciona **Permitir invocaciones no autenticadas** (Allow unauthenticated invocations).
7. Expande la sección de **Variables y Secretos** y añade todas las variables de tu `.env` (`GEMINI_API_KEY`, `TMDB_API_KEY`, `CLICKHOUSE_...`).
8. Haz clic en **Crear**. Cloud Run compilará y desplegará automáticamente tu aplicación.
