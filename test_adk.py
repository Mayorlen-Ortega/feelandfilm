import asyncio
from app.agent import agent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai.types import Content, Part

async def main():
    try:
        runner = Runner(agent=agent, session_service=InMemorySessionService(), app_name="test", auto_create_session=True)
        content = Content(role="user", parts=[Part(text="hi")])
        events = runner.run_async(user_id='test', session_id='test', new_message=content)
        response_text = ""
        async for e in events:
            if hasattr(e, "data") and hasattr(e.data, "message"):
                for part in getattr(e.data.message, "parts", []):
                    if hasattr(part, "text"):
                        response_text += part.text
        print("Success:", response_text)
    except Exception as ex:
        print("Error:", ex)

if __name__ == "__main__":
    asyncio.run(main())
