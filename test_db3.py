import sqlite3
db_path = r'C:\Users\15322\Documents\Codex\2026-06-07\use-github-linear-or-my-uploaded\work\poetry_slim.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("SELECT paragraphs FROM poems WHERE paragraphs LIKE '%春後有花兼酒壺%'")
rows = cursor.fetchall()
print(repr(rows))
conn.close()