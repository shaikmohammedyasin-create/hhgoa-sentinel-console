import sqlite3
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]

def audit():
    db_paths = [
        ROOT / "data" / "prepared" / "investigation_rebuilt.db",
        ROOT / "data" / "prepared" / "downloaded_data_v1.db",
        ROOT / "data" / "prepared" / "investigation.db",
    ]
    for db_path in db_paths:
        if not db_path.exists():
            print(f"File not found: {db_path}")
            continue
        print("\n==========================================")
        print(f"DATABASE: {db_path.name} ({db_path.stat().st_size} bytes)")
        print("==========================================")
        conn = sqlite3.connect(str(db_path))
        tables = conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
        for (tname,) in tables:
            cnt = conn.execute(f'SELECT COUNT(*) FROM "{tname}"').fetchone()[0]
            print(f"  Table: {tname:20s} | Rows: {cnt:10d}")
        if ("_meta",) in tables:
            cols = [d[0] for d in conn.execute("SELECT * FROM _meta").description]
            row = conn.execute("SELECT * FROM _meta").fetchone()
            print("  _meta contents:", dict(zip(cols, row)))

    print("\n==========================================")
    print("SOURCE CSVs in data/synthetic:")
    print("==========================================")
    for p in (ROOT / "data" / "synthetic").glob("*.csv"):
        df = pd.read_csv(p)
        print(f"  File: {p.name:25s} | Rows: {len(df):10d} | Size: {p.stat().st_size:10d} bytes")

if __name__ == "__main__":
    audit()
