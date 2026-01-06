#!/usr/bin/env python3
"""
psql wrapper - A Python-based PostgreSQL client that mimics psql functionality
Usage:
    python3 psql_wrapper.py "connection_string" -c "SELECT * FROM table;"
    python3 psql_wrapper.py "connection_string"  # Interactive mode
"""

import sys
import psycopg2
from psycopg2.extras import RealDictCursor
import argparse
import os
from typing import Optional

class PSQLWrapper:
    def __init__(self, connection_string: str):
        self.conn_string = connection_string
        self.conn = None
        self.cur = None
        
    def connect(self):
        """Establish database connection"""
        try:
            self.conn = psycopg2.connect(self.conn_string)
            self.cur = self.conn.cursor(cursor_factory=RealDictCursor)
            return True
        except Exception as e:
            print(f"Connection error: {e}", file=sys.stderr)
            return False
    
    def close(self):
        """Close database connection"""
        if self.cur:
            self.cur.close()
        if self.conn:
            self.conn.close()
    
    def execute_command(self, command: str) -> bool:
        """Execute a SQL command or psql meta-command"""
        command = command.strip()
        
        # Handle psql meta-commands
        if command.startswith('\\'):
            return self.handle_meta_command(command)
        
        # Execute SQL command
        try:
            self.cur.execute(command)
            
            # Check if it's a SELECT or similar that returns rows
            if self.cur.description:
                rows = self.cur.fetchall()
                self.print_results(rows)
            else:
                # For INSERT, UPDATE, DELETE, etc.
                rowcount = self.cur.rowcount
                if rowcount >= 0:
                    print(f"{rowcount} row(s) affected")
                self.conn.commit()
            return True
        except Exception as e:
            print(f"Error: {e}", file=sys.stderr)
            self.conn.rollback()
            return False
    
    def handle_meta_command(self, command: str) -> bool:
        """Handle psql meta-commands like \conninfo, \dt, etc."""
        command = command.lower().strip()
        
        if command == '\\conninfo' or command == '\\conn':
            try:
                conn_params = self.conn.get_dsn_parameters()
                print(f"You are connected to database \"{conn_params.get('dbname', 'unknown')}\" "
                      f"as user \"{conn_params.get('user', 'unknown')}\" "
                      f"on host \"{conn_params.get('host', 'unknown')}\" "
                      f"at port \"{conn_params.get('port', 'unknown')}\".")
            except Exception as e:
                print(f"Error getting connection info: {e}", file=sys.stderr)
            return True
        
        elif command == '\\dt' or command.startswith('\\dt '):
            # List tables
            try:
                self.cur.execute("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    ORDER BY table_name;
                """)
                rows = self.cur.fetchall()
                if rows:
                    print("List of relations")
                    print(" Schema | Name | Type  | Owner")
                    print("--------+------+-------+-------")
                    for row in rows:
                        print(f" public | {row['table_name']} | table |")
                else:
                    print("No relations found.")
            except Exception as e:
                print(f"Error: {e}", file=sys.stderr)
            return True
        
        elif command == '\\dv':
            # List views
            try:
                self.cur.execute("""
                    SELECT table_name 
                    FROM information_schema.views 
                    WHERE table_schema = 'public' 
                    ORDER BY table_name;
                """)
                rows = self.cur.fetchall()
                if rows:
                    print("List of relations")
                    print(" Schema | Name | Type | Owner")
                    print("--------+------+------+-------")
                    for row in rows:
                        print(f" public | {row['table_name']} | view |")
                else:
                    print("No relations found.")
            except Exception as e:
                print(f"Error: {e}", file=sys.stderr)
            return True
        
        elif command == '\\d' or command.startswith('\\d '):
            # Describe table
            table_name = command[2:].strip() if len(command) > 2 else None
            if not table_name:
                print("\\d requires a table name")
                return False
            try:
                self.cur.execute("""
                    SELECT 
                        column_name,
                        data_type,
                        character_maximum_length,
                        is_nullable,
                        column_default
                    FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = %s
                    ORDER BY ordinal_position;
                """, (table_name,))
                rows = self.cur.fetchall()
                if rows:
                    print(f"Table \"public.{table_name}\"")
                    print(" Column | Type | Collation | Nullable | Default")
                    print("--------+------+-----------+----------+---------")
                    for row in rows:
                        col_type = row['data_type']
                        if row['character_maximum_length']:
                            col_type += f"({row['character_maximum_length']})"
                        nullable = "yes" if row['is_nullable'] == 'YES' else "no"
                        default = row['column_default'] or ""
                        print(f" {row['column_name']} | {col_type} | | {nullable} | {default}")
                else:
                    print(f"Did not find any relation named \"{table_name}\".")
            except Exception as e:
                print(f"Error: {e}", file=sys.stderr)
            return True
        
        elif command == '\\q' or command == '\\quit':
            return False  # Signal to exit
        
        elif command == '\\l' or command == '\\list':
            # List databases (limited functionality)
            print("Note: Cannot list databases with current connection")
            return True
        
        elif command == '\\?':
            # Help
            print("""
Available meta-commands:
  \\conninfo    - Show connection information
  \\dt          - List tables
  \\dv          - List views
  \\d table     - Describe table structure
  \\q           - Quit
  \\?           - Show this help
            """)
            return True
        
        else:
            print(f"Unknown command: {command}. Type \\? for help.")
            return True
    
    def print_results(self, rows: list):
        """Print query results in a readable format"""
        if not rows:
            print("(0 rows)")
            return
        
        # Get column names
        columns = list(rows[0].keys())
        
        # Calculate column widths
        col_widths = {}
        for col in columns:
            col_widths[col] = max(
                len(str(col)),
                max(len(str(row[col] or '')) for row in rows) if rows else 0
            )
            col_widths[col] = min(col_widths[col], 50)  # Limit width
        
        # Print header
        header = " | ".join(str(col).ljust(col_widths[col]) for col in columns)
        print(header)
        print("-" * len(header))
        
        # Print rows
        for row in rows:
            values = []
            for col in columns:
                val = str(row[col] or '')
                if len(val) > 50:
                    val = val[:47] + "..."
                values.append(val.ljust(col_widths[col]))
            print(" | ".join(values))
        
        print(f"({len(rows)} row{'s' if len(rows) != 1 else ''})")
    
    def interactive_mode(self):
        """Run in interactive mode"""
        print("psql_wrapper interactive mode (Type \\q to quit, \\? for help)")
        print("-" * 60)
        
        while True:
            try:
                # Read input
                try:
                    line = input("psql_wrapper> ").strip()
                except (EOFError, KeyboardInterrupt):
                    print("\nGoodbye!")
                    break
                
                if not line:
                    continue
                
                # Execute command
                if not self.execute_command(line):
                    if line.lower() in ['\\q', '\\quit']:
                        break
                    continue
                    
            except Exception as e:
                print(f"Error: {e}", file=sys.stderr)


def main():
    parser = argparse.ArgumentParser(
        description='Python-based PostgreSQL client (psql wrapper)',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s "postgresql://user:pass@host/db" -c "SELECT version();"
  %(prog)s "postgresql://user:pass@host/db"  # Interactive mode
        """
    )
    
    parser.add_argument('connection_string', 
                       help='PostgreSQL connection string')
    parser.add_argument('-c', '--command',
                       help='Execute a single command and exit')
    parser.add_argument('-f', '--file',
                       help='Execute commands from a file')
    
    args = parser.parse_args()
    
    # Get connection string from environment if not provided
    conn_string = args.connection_string
    if not conn_string and 'DATABASE_URL' in os.environ:
        conn_string = os.environ['DATABASE_URL']
    
    if not conn_string:
        print("Error: Connection string required", file=sys.stderr)
        parser.print_help()
        sys.exit(1)
    
    # Create wrapper instance
    wrapper = PSQLWrapper(conn_string)
    
    if not wrapper.connect():
        sys.exit(1)
    
    try:
        if args.command:
            # Execute single command
            wrapper.execute_command(args.command)
        elif args.file:
            # Execute from file
            try:
                with open(args.file, 'r') as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith('--'):
                            wrapper.execute_command(line)
            except Exception as e:
                print(f"Error reading file: {e}", file=sys.stderr)
                sys.exit(1)
        else:
            # Interactive mode
            wrapper.interactive_mode()
    finally:
        wrapper.close()


if __name__ == '__main__':
    main()












