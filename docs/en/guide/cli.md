# 💻 Command Line Interface (CLI)

DriveKit comes with a pre-configured CLI:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="./service-account.json"
```

## Commands

```bash
# Check quota
npx drivekit quota

# List folder
npx drivekit ls /

# Upload file with live progress
npx drivekit upload ./database-dump.sql /Backups -o

# Download file
npx drivekit download FILE_ID ./downloads

# Share publicly
npx drivekit share FILE_ID

# Sync directory
npx drivekit sync ./dist /Websites/Production -c 5 -o

# Delete
npx drivekit delete FILE_ID --permanent
```

