# Database Dump Formats Guide

This directory contains multiple formats of your database dump for different tools and use cases.

## 📁 Available Files

### 1. **PostgreSQL Dumps** (for database restoration)

- `dump_postgres.sql` - Standard PostgreSQL dump (214MB)
- `dump_dbeaver.sql` - Same as PostgreSQL, optimized for DBeaver
- `dump_sanitized.sql` - Sanitized version with fake PII data

### 2. **CSV Files** (for spreadsheet applications)

- `dump_csv/user.csv` - 47,701 users (31MB)
- `dump_csv/tournament.csv` - 5,127 tournaments (4.2MB)
- `dump_csv/club.csv` - 688 clubs (419KB)
- `dump_csv/match.csv` - 89,607 matches (18MB)
- `dump_csv/athlete.csv` - Empty (0 records)

### 3. **JSON Files** (for modern applications)

- `dump_csv/json/user.json` - Users in JSON format (2.9MB)
- `dump_csv/json/tournament.json` - Tournaments in JSON format (2.6MB)
- `dump_csv/json/club.json` - Clubs in JSON format (688KB)
- `dump_csv/json/match.json` - Matches in JSON format (1MB)
- `dump_csv/json/athlete.json` - Athletes in JSON format (empty)

## 🔧 Usage Instructions

### **PostgreSQL/DBeaver**

```bash
# Create a new database
psql -U postgres -c "CREATE DATABASE my_database;"

# Restore the dump
psql -U postgres -d my_database < dump_postgres.sql

# Connect DBeaver to: localhost:5432, database: my_database
```

### **CSV Files**

- **Excel/Google Sheets**: Open any `.csv` file directly
- **Command Line**: `head -5 dump_csv/user.csv` to preview
- **Data Analysis**: Use with Python pandas, R, or any data analysis tool

### **JSON Files**

- **Web Applications**: Import directly into JavaScript/Node.js
- **APIs**: Use as mock data for development
- **Modern Tools**: Compatible with most modern programming languages

## 🛡️ PII Sanitization

The `dump_sanitized.sql` file contains:

- ✅ **47,666 fake email addresses** (e.g., `abc123@example.com`)
- ✅ **30,904 fake phone numbers** (e.g., `+1234567890`)
- ✅ **43,393 fake birth dates** (randomized between 1950-2005)
- ✅ **Complete database structure** preserved
- ✅ **All relationships intact**

## 📊 Data Summary

| Table      | Records | File Size | Description                      |
| ---------- | ------- | --------- | -------------------------------- |
| user       | 47,701  | 31MB      | User accounts with sanitized PII |
| tournament | 5,127   | 4.2MB     | Tournament information           |
| club       | 688     | 419KB     | Club/organization data           |
| match      | 89,607  | 18MB      | Match results and data           |
| athlete    | 0       | 0KB       | Athlete records (empty)          |

## 🚀 Quick Start

1. **For Database Work**: Use `dump_postgres.sql` or `dump_dbeaver.sql`
2. **For Data Analysis**: Use CSV files in `dump_csv/`
3. **For Development**: Use JSON files in `dump_csv/json/`
4. **For Production**: Use `dump_sanitized.sql` (no real PII)

## 🔄 Scripts Available

- `sanitize-postgres-dump.js` - Sanitizes PII in PostgreSQL dumps
- `create-formats.js` - Creates multiple dump formats
- `sanitize-multiple-formats.js` - Creates sanitized versions in all formats
- `anonymize.js` - Standalone anonymization module
- `db-dump-restore.js` - Migrates database from source to destination with automatic anonymization

## 🗄️ Database Migration

Use the `db-dump-restore.js` script to migrate databases between different PostgreSQL instances:

### Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Create `.env` file** with your database credentials:

   ```bash
   # Source Database Configuration (where to dump from)
   SOURCE_DB_HOST=localhost
   SOURCE_DB_PORT=5432
   SOURCE_DB_NAME=your_source_database
   SOURCE_DB_USER=postgres
   SOURCE_DB_PASSWORD=

   # Destination Database Configuration (where to restore to)
   # This can be a different server/host than the source
   DEST_DB_HOST=your_destination_host
   DEST_DB_PORT=5432
   DEST_DB_NAME=your_destination_database
   DEST_DB_USER=your_destination_username
   DEST_DB_PASSWORD=your_destination_password

   # Dump Configuration
   DUMP_FORMAT=plain    # custom, plain/sql, csv, directory
   COMPRESSION_LEVEL=9  # 0-9 for custom format (ignored for plain/csv)
   TEMP_DUMP_PATH=/tmp/source_dump.sql
   CLEANUP_TEMP_FILE=true
   ```

3. **Run the migration:**
   ```bash
   npm run db-migrate
   ```

### **Dump Format Options:**

Choose the format that best fits your needs:

| Format          | Description                   | Use Case                                              | Compatibility               |
| --------------- | ----------------------------- | ----------------------------------------------------- | --------------------------- |
| **`plain`**     | Human-readable SQL statements | ✅ **Universal** - Works with any SQL database        | MySQL, SQLite, Oracle, etc. |
| **`csv`**       | Comma-separated values        | ✅ **Data Analysis** - Perfect for spreadsheets/tools | Excel, Python pandas, R     |
| **`custom`**    | PostgreSQL binary format      | ⚡ **Fastest** - PostgreSQL optimized                 | PostgreSQL only             |
| **`directory`** | Directory with separate files | 📁 **Flexible** - Good for large databases            | PostgreSQL only             |

#### **Format Examples:**

**Plain SQL Format (Recommended for universality):**

```bash
DUMP_FORMAT=plain
TEMP_DUMP_PATH=/tmp/database_dump.sql
```

- ✅ Human-readable SQL statements
- ✅ Compatible with any SQL database
- ✅ Can be edited/viewed in any text editor
- ✅ Perfect for version control

**CSV Format (Recommended for data analysis):**

```bash
DUMP_FORMAT=csv
TEMP_DUMP_PATH=/tmp/database_dump.sql  # Will create /tmp/database_dump_csv/
```

- ✅ Each table becomes a separate CSV file
- ✅ Perfect for Excel, Google Sheets, Python pandas
- ✅ Great for data analysis and reporting
- ✅ Smaller file sizes for large datasets

**Custom Format (Recommended for PostgreSQL-only):**

```bash
DUMP_FORMAT=custom
COMPRESSION_LEVEL=9
TEMP_DUMP_PATH=/tmp/database_dump.dump
```

- ⚡ Fastest backup/restore
- 📦 Best compression
- 🔒 PostgreSQL-specific optimizations

### Features

- ✅ **Universal Compatibility**: Plain SQL format works with any SQL database (MySQL, SQLite, Oracle, etc.)
- ✅ **Data Analysis Ready**: CSV format perfect for Excel, Python pandas, and data analysis tools
- ✅ **Automatic Anonymization**: Data is automatically anonymized during migration
- ✅ **PII Protection**: Names, emails, phones, DOBs, and sensitive data are anonymized
- ✅ **Smart Email Skipping**: Important accounts preserved based on email whitelist
- ✅ **Secure**: Uses environment variables for credentials
- ✅ **Flexible**: Supports plain SQL, CSV, custom, and directory dump formats
- ✅ **Safe**: Automatically drops and recreates destination database
- ✅ **Clean**: Automatically cleans public schema before restore to prevent conflicts
- ✅ **Fresh Start**: Ensures destination database has clean schema every time
- ✅ **Verbose**: Provides detailed progress logging
- ✅ **Cross-Platform**: Plain SQL dumps can be used on any operating system

## 🔒 Data Anonymization

The migration process automatically anonymizes sensitive data:

### **What Gets Anonymized:**

- ✅ **Names & Surnames**: Converted to fake names (e.g., "John1", "Doe1")
- ✅ **Email Addresses**: Converted to fake emails (e.g., "john1@tournated.com")
- ✅ **Phone Numbers**: Generated using Faker library
- ✅ **Dates of Birth**: Year preserved, month/day randomized
- ✅ **Passwords**: All replaced with safe bcrypt hash
- ✅ **Sensitive Fields**: Device tokens, API keys, addresses nullified

### **What Gets Preserved:**

- ✅ **Important Accounts**: Users with emails in the skip list keep real data
- ✅ **Database Structure**: All tables, constraints, indexes preserved
- ✅ **Relationships**: All foreign keys and data relationships maintained
- ✅ **Data Volume**: Row counts and overall data structure preserved

### **Email Skip List:**

```javascript
const skipEmails = [
  "mail.waleed.saifi@gmail.com",
  "hamzamalik@getnada.com",
  "prodclient@getnada.com",
  "prodclient3@getnada.com",
  "hamzamalik1@getnada.com",
  "test203@getnada.com",
  "testinguser67@getnada.com",
  "asad.ahmad@spadasoftinc.com",
];
```

### **Anonymization Process:**

1. **Dump Creation**: Database dump created in chosen format
2. **Format Conversion**: Converted to plain SQL for processing
3. **Data Anonymization**: PII data replaced with fake values
4. **Schema Cleaning**: Destination database schema cleaned
5. **Data Restore**: Anonymized data restored to destination

## 📝 Notes

- All dumps are PostgreSQL-compatible
- CSV files include headers for easy import
- JSON files contain up to 1000 records per table
- Sanitized dumps are safe for development and testing
- Original data structure and relationships are preserved
- **Schema Cleaning**: Public schema is automatically dropped and recreated before restore
- **Clean Restore**: Ensures no schema conflicts during migration
- **Fresh Database**: Destination database gets a completely clean start each time
