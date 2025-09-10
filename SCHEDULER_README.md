# Database Dump Scheduler

This automated scheduler runs the database sanitization process every 12 hours (configurable) to create sanitized dumps from your master database.

## Features

- ⏰ **Automated Scheduling**: Runs every 12 hours by default (configurable)
- 🔒 **PII Sanitization**: Automatically anonymizes personal data
- 📝 **Comprehensive Logging**: Detailed logs with timestamps
- ⚙️ **Environment Configuration**: Easy configuration via `.env` file
- 🛡️ **Error Handling**: Robust error handling and recovery
- 🧹 **Auto Cleanup**: Automatically cleans up temporary files

## Quick Start

### 1. Configure Environment Variables

Edit the `.env` file to match your setup:

```bash
# Cron schedule - runs every 12 hours (at 00:00 and 12:00)
CRON_SCHEDULE=0 */12 * * *

# Database connection settings
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_NAME=postgres
DB_SCHEMA=public

# File paths
INPUT_DUMP_PATH=/Users/macbookair/Desktop/input_file/tprod-rds-for-stg-10-09-2025.sql
OUTPUT_DUMP_PATH=/Users/macbookair/Desktop/output_file/tprod-rds-10-09-2025-sanitized.sql
TEMP_DIR=/Users/macbookair/Desktop/temp_file
```

### 2. Start the Scheduler

```bash
# Start the automated scheduler
npm run scheduler:start

# Or run a single dump immediately (for testing)
npm run scheduler:now
```

### 3. Stop the Scheduler

```bash
# Stop the scheduler
npm run scheduler:stop
```

## Available Commands

| Command                   | Description                           |
| ------------------------- | ------------------------------------- |
| `npm run scheduler`       | Start the automated scheduler         |
| `npm run scheduler:start` | Start the automated scheduler (alias) |
| `npm run scheduler:now`   | Run a single dump immediately         |
| `npm run scheduler:stop`  | Stop the running scheduler            |

## Configuration Options

### Cron Schedule

You can modify the `CRON_SCHEDULE` in `.env` to change the timing:

```bash
# Every 6 hours
CRON_SCHEDULE=0 */6 * * *

# Every 24 hours (daily at midnight)
CRON_SCHEDULE=0 0 * * *

# Every 2 hours
CRON_SCHEDULE=0 */2 * * *

# Every Monday at 2 AM
CRON_SCHEDULE=0 2 * * 1

# Every weekday at 6 PM
CRON_SCHEDULE=0 18 * * 1-5
```

### File Paths

Update the file paths in `.env` to match your setup:

- `INPUT_DUMP_PATH`: Path to your source database dump
- `OUTPUT_DUMP_PATH`: Path where sanitized dump will be saved
- `TEMP_DIR`: Directory for temporary files during processing

### Database Settings

Configure your database connection:

- `DB_HOST`: Database host (default: localhost)
- `DB_PORT`: Database port (default: 5432)
- `DB_USERNAME`: Database username (default: postgres)
- `DB_NAME`: Database name (default: postgres)
- `DB_SCHEMA`: Schema to process (default: public)

## Logging

The scheduler creates detailed logs in:

- **Console**: Real-time output
- **Log File**: `/Users/macbookair/Desktop/replica/logs/scheduler.log`

### Log Levels

- `INFO`: General information about the process
- `ERROR`: Error messages and failures
- `DEBUG`: Detailed debugging information (when enabled)

## What Gets Sanitized

The scheduler automatically sanitizes:

- 👤 **Names**: Replaced with "John0", "John1", etc.
- 👤 **Surnames**: Replaced with "Doe0", "Doe1", etc.
- 📧 **Emails**: Replaced with "john0@tournated.com", "john1@tournated.com", etc.
- 📞 **Phone Numbers**: Replaced with fake phone numbers
- 📅 **Dates of Birth**: Slightly modified while preserving the year
- 🔐 **Passwords**: Replaced with a standard bcrypt hash
- 🗂️ **Sensitive Fields**: Various ID fields are nullified

### Preserved Records

Some email addresses are preserved (not sanitized):

- mail.waleed.saifi@gmail.com
- hamzamalik@getnada.com
- prodclient@getnada.com
- prodclient3@getnada.com
- hamzamalik1@getnada.com
- test203@getnada.com
- testinguser67@getnada.com
- asad.ahmad@spadasoftinc.com

## Running as a Service

### Using PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Start the scheduler with PM2
pm2 start database-scheduler.js --name "db-scheduler"

# View logs
pm2 logs db-scheduler

# Stop the scheduler
pm2 stop db-scheduler

# Restart the scheduler
pm2 restart db-scheduler
```

### Using systemd (Linux)

Create a systemd service file:

```bash
sudo nano /etc/systemd/system/db-scheduler.service
```

Add the following content:

```ini
[Unit]
Description=Database Dump Scheduler
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/Users/macbookair/Desktop/replica
ExecStart=/usr/bin/node database-scheduler.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl enable db-scheduler
sudo systemctl start db-scheduler
sudo systemctl status db-scheduler
```

## Troubleshooting

### Common Issues

1. **Permission Denied**: Ensure the user has write permissions to the output directory
2. **Database Connection Failed**: Check database credentials and connectivity
3. **File Not Found**: Verify input dump file exists at the specified path
4. **Cron Schedule Invalid**: Check the cron expression format

### Debug Mode

Enable debug logging by setting `LOG_LEVEL=debug` in `.env`:

```bash
LOG_LEVEL=debug
```

### Manual Testing

Test the scheduler without waiting for the cron schedule:

```bash
npm run scheduler:now
```

## Monitoring

### Check Scheduler Status

```bash
# Check if scheduler is running
ps aux | grep database-scheduler

# View recent logs
tail -f /Users/macbookair/Desktop/replica/logs/scheduler.log
```

### Verify Output

Check that the sanitized dump is being created:

```bash
ls -la /Users/macbookair/Desktop/output_file/
```

## Security Notes

- The scheduler preserves the original database structure
- All PII data is replaced with fake data
- Sensitive fields are nullified
- Ownership and privilege statements are removed
- Temporary files are automatically cleaned up

## Support

For issues or questions:

1. Check the log files for error messages
2. Verify your configuration in `.env`
3. Test with `npm run scheduler:now` first
4. Ensure all file paths are correct and accessible
