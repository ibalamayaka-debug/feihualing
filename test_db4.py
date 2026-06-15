import sqlite3
db_path = r'C:\Users\15322\Documents\Codex\2026-06-07\use-github-linear-or-my-uploaded\work\poetry_slim.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("SELECT * FROM poems WHERE title LIKE '%笑%' AND author LIKE '%晁說之%' LIMIT 1")
row = cursor.fetchone()
print(repr(row))
conn.close()