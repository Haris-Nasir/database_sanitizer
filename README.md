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

## 📝 Notes

- All dumps are PostgreSQL-compatible
- CSV files include headers for easy import
- JSON files contain up to 1000 records per table
- Sanitized dumps are safe for development and testing
- Original data structure and relationships are preserved

