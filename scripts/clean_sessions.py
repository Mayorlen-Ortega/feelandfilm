import os
import clickhouse_connect
from dotenv import load_dotenv

load_dotenv()

host = os.getenv("CLICKHOUSE_HOST", "")
port = int(os.getenv("CLICKHOUSE_PORT", "8123"))
user = os.getenv("CLICKHOUSE_USER", "default")
password = os.getenv("CLICKHOUSE_PASSWORD", "")
secure = os.getenv("CLICKHOUSE_SECURE", "False").lower() in ("true", "1", "yes")

if not host or host == "mock":
    print("ClickHouse not configured or mock mode.")
    exit(0)

client = clickhouse_connect.get_client(
    host=host, port=port, username=user, password=password, secure=secure
)

print("Before cleaning:")
res = client.query("SELECT initial_mood, count() FROM audience_sessions GROUP BY initial_mood")
for row in res.result_rows:
    print(f"  {row[0]}: {row[1]}")

print("\nDeleting entries not in ('Stressed', 'Bored', 'Excited', 'Sad', 'Curious')...")
client.command("ALTER TABLE audience_sessions DELETE WHERE initial_mood NOT IN ('Stressed', 'Bored', 'Excited', 'Sad', 'Curious')")

import time
time.sleep(2)

print("\nAfter cleaning:")
res = client.query("SELECT initial_mood, count() FROM audience_sessions GROUP BY initial_mood")
for row in res.result_rows:
    print(f"  {row[0]}: {row[1]}")
