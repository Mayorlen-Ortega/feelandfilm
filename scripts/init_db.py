import os
import clickhouse_connect
from dotenv import load_dotenv

load_dotenv()

def get_client():
    host = os.getenv("CLICKHOUSE_HOST", "localhost")
    port = int(os.getenv("CLICKHOUSE_PORT", "8123"))
    user = os.getenv("CLICKHOUSE_USER", "default")
    password = os.getenv("CLICKHOUSE_PASSWORD", "")
    secure = os.getenv("CLICKHOUSE_SECURE", "False").lower() in ("true", "1", "yes")

    print(f"Connecting to ClickHouse at {host}:{port} (secure={secure})...")
    
    return clickhouse_connect.get_client(
        host=host,
        port=port,
        username=user,
        password=password,
        secure=secure
    )

def init_db():
    client = get_client()

    print("Creating tables...")

    # film_catalog
    client.command('''
        CREATE TABLE IF NOT EXISTS film_catalog (
            id UUID DEFAULT generateUUIDv4(),
            title String,
            director String,
            runtime UInt16,
            genre String,
            mood_tags Array(String),
            emotional_intensity UInt8,
            age_suitability String,
            synopsis String
        ) ENGINE = MergeTree()
        ORDER BY id
    ''')

    # audience_sessions
    client.command('''
        CREATE TABLE IF NOT EXISTS audience_sessions (
            session_id UUID DEFAULT generateUUIDv4(),
            timestamp DateTime DEFAULT now(),
            initial_mood String,
            desired_atmosphere String,
            audience_age_range String,
            max_intensity UInt8,
            film_id UUID,
            outcome_rating UInt8 COMMENT '1 to 5 scale',
            mood_transition_success Bool
        ) ENGINE = MergeTree()
        ORDER BY timestamp
    ''')

    # screening_recommendations
    client.command('''
        CREATE TABLE IF NOT EXISTS screening_recommendations (
            recommendation_id UUID DEFAULT generateUUIDv4(),
            timestamp DateTime DEFAULT now(),
            requested_mood String,
            requested_atmosphere String,
            slate Array(UUID) COMMENT 'Array of film IDs',
            agent_confidence Float32,
            agent_reasoning String
        ) ENGINE = MergeTree()
        ORDER BY timestamp
    ''')

    # recommendation_outcomes
    client.command('''
        CREATE TABLE IF NOT EXISTS recommendation_outcomes (
            recommendation_id UUID,
            film_id UUID,
            actual_audience_rating UInt8
        ) ENGINE = MergeTree()
        ORDER BY recommendation_id
    ''')

    print("Database initialization complete.")

if __name__ == "__main__":
    init_db()
