#!/usr/bin/env python3
"""Run SQL file against PostgreSQL database"""
import sys
import psycopg2

if len(sys.argv) < 2:
    print("Usage: python3 run_sql_file.py <sql_file> [connection_string]")
    sys.exit(1)

sql_file = sys.argv[1]
conn_string = sys.argv[2] if len(sys.argv) > 2 else 'postgresql://neondb_owner:npg_vgy4STuQ8Mja@ep-soft-pond-ag9vm5a4-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'

# Read SQL file
with open(sql_file, 'r') as f:
    sql = f.read()

# Connect and execute
try:
    conn = psycopg2.connect(conn_string)
    conn.autocommit = True
    cur = conn.cursor()
    
    # Execute SQL (split by semicolons for multi-statement files)
    cur.execute(sql)
    
    print(f"Successfully executed SQL file: {sql_file}")
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)












