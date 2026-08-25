import os
import clickhouse_connect
import json
from dotenv import load_dotenv

load_dotenv()

host = os.getenv("CLICKHOUSE_HOST", "")
port = int(os.getenv("CLICKHOUSE_PORT", "8123"))
user = os.getenv("CLICKHOUSE_USER", "default")
password = os.getenv("CLICKHOUSE_PASSWORD", "")
secure = os.getenv("CLICKHOUSE_SECURE", "False").lower() in ("true", "1", "yes")

client = clickhouse_connect.get_client(
    host=host, port=port, username=user, password=password, secure=secure
)

VALID_MOODS = ["Stressed", "Bored", "Excited", "Sad", "Curious"]
VALID_ATMOSPHERES = ["Relaxing", "Thrilling", "Uplifting", "Thought-provoking"]
VALID_AGES = ["Kids (0-12)", "Teens (13-17)", "Adults (18+)", "Mixed Family"]

# 1. Mood counts
m_res = client.query("SELECT initial_mood, count() FROM audience_sessions WHERE initial_mood IN ('Stressed', 'Bored', 'Excited', 'Sad', 'Curious') GROUP BY initial_mood")
m_counts = {r[0]: r[1] for r in m_res.result_rows}

# 2. Atmosphere counts
a_res = client.query("SELECT desired_atmosphere, count() FROM audience_sessions GROUP BY desired_atmosphere")
a_counts = {r[0]: r[1] for r in a_res.result_rows}

# 3. Demographics counts
d_res = client.query("SELECT audience_age_range, count() FROM audience_sessions GROUP BY audience_age_range")
d_counts = {r[0]: r[1] for r in d_res.result_rows}

# 4. Mood -> Atmosphere Matrix
t_res = client.query("SELECT initial_mood, desired_atmosphere, count() FROM audience_sessions WHERE initial_mood IN ('Stressed', 'Bored', 'Excited', 'Sad', 'Curious') GROUP BY initial_mood, desired_atmosphere")
t_map = {}
for mood, atm, count in t_res.result_rows:
    if mood not in t_map:
        t_map[mood] = {}
    t_map[mood][atm] = count

print("Mood counts:", m_counts)
print("Atmosphere counts:", a_counts)
print("Demographics counts:", d_counts)
print("Matrix:", json.dumps(t_map, indent=2))
