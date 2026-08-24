import os
import random
import clickhouse_connect
from dotenv import load_dotenv

load_dotenv()

def get_client():
    host = os.getenv("CLICKHOUSE_HOST", "localhost")
    port = int(os.getenv("CLICKHOUSE_PORT", "8123"))
    user = os.getenv("CLICKHOUSE_USER", "default")
    password = os.getenv("CLICKHOUSE_PASSWORD", "")
    secure = os.getenv("CLICKHOUSE_SECURE", "False").lower() in ("true", "1", "yes")
    
    return clickhouse_connect.get_client(
        host=host,
        port=port,
        username=user,
        password=password,
        secure=secure
    )

films = [
    {
        "id": "11111111-1111-1111-1111-111111111111",
        "title": "Echoes of the Neon Void",
        "director": "Kaelen Vance",
        "runtime": 105,
        "genre": "Sci-Fi Thriller",
        "mood_tags": ["Tense", "Cyberpunk", "Mysterious"],
        "emotional_intensity": 8,
        "age_suitability": "Adult",
        "synopsis": "A rogue AI developer races against time to decrypt a signal that could unravel the city's power grid."
    },
    {
        "id": "22222222-2222-2222-2222-222222222222",
        "title": "Whispering Pines",
        "director": "Elara Thorne",
        "runtime": 92,
        "genre": "Drama",
        "mood_tags": ["Melancholic", "Reflective", "Quiet"],
        "emotional_intensity": 4,
        "age_suitability": "Teen",
        "synopsis": "Two estranged sisters reconnect at their childhood cabin, unearthing buried secrets."
    },
    {
        "id": "33333333-3333-3333-3333-333333333333",
        "title": "The Laughing Clockmaker",
        "director": "Barnaby Quill",
        "runtime": 88,
        "genre": "Comedy",
        "mood_tags": ["Joyful", "Quirky", "Lighthearted"],
        "emotional_intensity": 3,
        "age_suitability": "Family",
        "synopsis": "A clumsy horologist accidentally invents a watch that freezes time, but only for three seconds."
    },
    {
        "id": "44444444-4444-4444-4444-444444444444",
        "title": "Crimson Horizon",
        "director": "Silas Vane",
        "runtime": 130,
        "genre": "Action Epic",
        "mood_tags": ["Exhilarating", "Violent", "Heroic"],
        "emotional_intensity": 9,
        "age_suitability": "Adult",
        "synopsis": "A band of mercenaries defends the last fertile valley from a warlord's advancing army."
    },
    {
        "id": "55555555-5555-5555-5555-555555555555",
        "title": "Labyrinth of the Mind",
        "director": "Aria Solis",
        "runtime": 115,
        "genre": "Psychological Horror",
        "mood_tags": ["Disturbing", "Surreal", "Dread"],
        "emotional_intensity": 10,
        "age_suitability": "Adult",
        "synopsis": "A sleep researcher becomes trapped in the shared nightmares of her patients."
    },
    {
        "id": "66666666-6666-6666-6666-666666666666",
        "title": "Sunlight in the Rain",
        "director": "Julian Reyes",
        "runtime": 100,
        "genre": "Romance",
        "mood_tags": ["Romantic", "Hopeful", "Bittersweet"],
        "emotional_intensity": 6,
        "age_suitability": "Teen",
        "synopsis": "A chance encounter during a monsoon changes the lives of two struggling artists."
    }
]

def seed_data():
    client = get_client()

    print("Seeding film_catalog...")
    for film in films:
        client.command(f"""
            INSERT INTO film_catalog (id, title, director, runtime, genre, mood_tags, emotional_intensity, age_suitability, synopsis)
            VALUES ('{film['id']}', '{film['title'].replace("'", "''")}', '{film['director'].replace("'", "''")}', {film['runtime']}, '{film['genre']}', {film['mood_tags']}, {film['emotional_intensity']}, '{film['age_suitability']}', '{film['synopsis'].replace("'", "''")}')
        """)

    print("Seeding historical audience sessions...")
    # Generate some synthetic sessions
    moods = ["Stressed", "Bored", "Excited", "Sad", "Curious"]
    atmospheres = ["Relaxing", "Thrilling", "Uplifting", "Thought-provoking"]
    ages = ["Family", "Teen", "Adult"]
    
    sessions_data = []
    for _ in range(50):
        initial_mood = random.choice(moods)
        desired_atmosphere = random.choice(atmospheres)
        age = random.choice(ages)
        max_intensity = random.randint(3, 10)
        film_id = random.choice(films)["id"]
        
        # Simulate an outcome rating based on intensity match (rough proxy)
        outcome_rating = random.randint(1, 5)
        success = outcome_rating >= 4
        
        sessions_data.append(f"('{initial_mood}', '{desired_atmosphere}', '{age}', {max_intensity}, '{film_id}', {outcome_rating}, {success})")

    if sessions_data:
        values_str = ",\n".join(sessions_data)
        client.command(f"""
            INSERT INTO audience_sessions (initial_mood, desired_atmosphere, audience_age_range, max_intensity, film_id, outcome_rating, mood_transition_success)
            VALUES {values_str}
        """)

    print("Data seeding complete.")

if __name__ == "__main__":
    seed_data()
