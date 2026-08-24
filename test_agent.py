import json
import asyncio
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai.types import Content, Part
from app.agent import agent

async def main():
    prompt = json.dumps({'initial_mood': 'Stressed', 'desired_atmosphere': 'Relaxing', 'audience_age_range': 'Adult', 'max_intensity': 7, 'slots': 3})
    
    try:
        runner = Runner(agent=agent, session_service=InMemorySessionService(), app_name="test", auto_create_session=True)
        print("Events:")
        content = Content(role="user", parts=[Part(text=prompt)])
        async for event in runner.run_async(user_id="default_user", session_id="default_session", new_message=content):
            print(event)
    except Exception as e:
        print("Failed:", e)

if __name__ == "__main__":
    asyncio.run(main())
