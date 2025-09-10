// database-scheduler.js
import cron from "node-cron";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration from environment variables
const config = {
  cronSchedule: process.env.CRON_SCHEDULE || "0 */12 * * *", // Default: every 12 hours
  dbHost: process.env.DB_HOST || "localhost",
  dbPort: process.env.DB_PORT || "5432",
  dbUsername: process.env.DB_USERNAME || "postgres",
  dbName: process.env.DB_NAME || "postgres",
  dbSchema: process.env.DB_SCHEMA || "public",
  inputDumpPath:
    process.env.INPUT_DUMP_PATH ||
    "/Users/macbookair/Desktop/input_file/tprod-rds-for-stg-10-09-2025.sql",
  outputDumpPath:
    process.env.OUTPUT_DUMP_PATH ||
    "/Users/macbookair/Desktop/output_file/tprod-rds-10-09-2025-sanitized.sql",
  tempDir: process.env.TEMP_DIR || "/Users/macbookair/Desktop/temp_file",
  logLevel: process.env.LOG_LEVEL || "info",
  logFile:
    process.env.LOG_FILE || path.join(__dirname, "logs", "scheduler.log"),
};

// Ensure log directory exists
const logDir = path.dirname(config.logFile);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Logging function
function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}${
    data ? ` | Data: ${JSON.stringify(data)}` : ""
  }`;

  // Console output
  console.log(logEntry);

  // File output
  try {
    fs.appendFileSync(config.logFile, logEntry + "\n");
  } catch (error) {
    console.error("Failed to write to log file:", error.message);
  }
}

// Email to skip from anonymization (same as in original script)
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

// Database dump and sanitization function
async function performDatabaseDump() {
  const startTime = new Date();
  log("info", "🔄 Starting automated database dump process...");

  try {
    // Temporary files for sanitization process
    const tempCustomDump = path.join(config.tempDir, "temp_custom.dump");
    const tempPlainDump = path.join(config.tempDir, "temp_plain.sql");
    const finalSanitizedDump = config.outputDumpPath;

    // Ensure temp directory exists
    if (!fs.existsSync(config.tempDir)) {
      fs.mkdirSync(config.tempDir, { recursive: true });
    }

    // Step 1: Copy input dump to temp location
    log("info", "📝 Step 1: Copying input dump to temp location...");
    if (!fs.existsSync(config.inputDumpPath)) {
      throw new Error(`Input dump file not found: ${config.inputDumpPath}`);
    }
    execSync(`cp "${config.inputDumpPath}" "${tempCustomDump}"`, {
      stdio: "inherit",
    });

    // Step 2: Convert custom format to plain SQL for sanitization
    log("info", "📝 Step 2: Converting to plain SQL for sanitization...");
    execSync(
      `pg_restore --no-owner --no-privileges --no-tablespaces --no-security-labels --no-comments -f "${tempPlainDump}" "${tempCustomDump}"`,
      { stdio: "inherit" }
    );

    // Step 3: Sanitize the plain SQL
    log("info", "🔒 Step 3: Sanitizing PII data...");
    await sanitizeDatabaseDump(tempPlainDump);

    // Step 4: Convert sanitized plain SQL back to custom format
    log("info", "📝 Step 4: Converting sanitized data to custom format...");
    await convertToCustomFormat(tempPlainDump, finalSanitizedDump);

    // Clean up temp files
    cleanupTempFiles([tempCustomDump, tempPlainDump]);

    const endTime = new Date();
    const duration = Math.round((endTime - startTime) / 1000);

    log(
      "info",
      `🎉 Database dump completed successfully in ${duration} seconds!`
    );
    log("info", `📝 Custom format dump saved to: ${finalSanitizedDump}`);

    // Verify the file format
    log("info", "🔍 Verifying file format...");
    execSync(`file "${finalSanitizedDump}"`, { stdio: "inherit" });
  } catch (error) {
    log("error", `❌ Database dump failed: ${error.message}`, {
      error: error.stack,
    });
    throw error;
  }
}

// Sanitization function (extracted from original script)
async function sanitizeDatabaseDump(tempPlainDump) {
  // Generate fake data using faker
  let userCounter = 0;

  function generateFakeName() {
    const firstName = "John";
    return `${firstName}${userCounter}`;
  }

  function generateFakeSurname() {
    const lastName = "Doe";
    return `${lastName}${userCounter}`;
  }

  function generateFakeEmail() {
    const username = `john${userCounter}`;
    const domain = "tournated.com";
    return `${username}@${domain}`;
  }

  function incrementUserCounter() {
    userCounter++;
  }

  function generateFakePhone() {
    const prefixes = ["+1"];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const number = Math.floor(Math.random() * 9000000000) + 1000000000;
    return `${prefix}${number}`;
  }

  function generateFakeDOB(originalDate) {
    if (!originalDate || originalDate === "\\N") {
      const start = new Date(1950, 0, 1);
      const end = new Date(2005, 11, 31);
      const randomDate = new Date(
        start.getTime() + Math.random() * (end.getTime() - start.getTime())
      );
      return randomDate.toISOString().split("T")[0];
    }

    try {
      const original = new Date(originalDate);
      if (isNaN(original.getTime())) {
        throw new Error("Invalid date");
      }

      const year = original.getFullYear();
      let month = original.getMonth();
      const monthAdjustment = Math.floor(Math.random() * 5) - 2;
      month = Math.max(0, Math.min(11, month + monthAdjustment));

      let day = original.getDate();
      const dayAdjustment = Math.floor(Math.random() * 31) - 15;
      day = Math.max(1, Math.min(31, day + dayAdjustment));

      const newDate = new Date(year, month, day);

      if (newDate.getMonth() !== month) {
        newDate.setDate(0);
      }

      return newDate.toISOString().split("T")[0];
    } catch (error) {
      const start = new Date(1950, 0, 1);
      const end = new Date(2005, 11, 31);
      const randomDate = new Date(
        start.getTime() + Math.random() * (end.getTime() - start.getTime())
      );
      return randomDate.toISOString().split("T")[0];
    }
  }

  // Read and sanitize
  let content = fs.readFileSync(tempPlainDump, "utf-8");
  const lines = content.split("\n");
  let sanitizedLines = [];
  let nameCount = 0;
  let surnameCount = 0;
  let emailCount = 0;
  let phoneCount = 0;
  let dobCount = 0;
  let passwordCount = 0;
  let otherFieldsCount = 0;
  let skippedRecords = 0;
  let inUserTable = false;

  for (let line of lines) {
    // Check if we're starting a user table COPY statement
    if (/COPY public\."user"/i.test(line)) {
      inUserTable = true;
      sanitizedLines.push(line);
      continue;
    }

    // Check if we're ending the user table data
    if (
      inUserTable &&
      (line.trim() === "" ||
        line.startsWith("COPY public.") ||
        line.startsWith("\\."))
    ) {
      inUserTable = false;
      sanitizedLines.push(line);
      continue;
    }

    // If we're in the user table data, sanitize PII data
    if (inUserTable) {
      const originalLine = line;
      const parts = line.split("\t");

      if (parts.length >= 128) {
        // Column 3: email - check if it should be skipped
        const shouldSkipEmail =
          parts[3] &&
          parts[3].includes("@") &&
          parts[3] !== "\\N" &&
          skipEmails.includes(parts[3]);

        if (shouldSkipEmail) {
          skippedRecords++;
        }

        const hasName = parts[1] && parts[1] !== "\\N";
        const hasSurname = parts[2] && parts[2] !== "\\N";
        const hasEmail =
          parts[3] &&
          parts[3].includes("@") &&
          parts[3] !== "\\N" &&
          !skipEmails.includes(parts[3]);

        let shouldIncrementCounter = false;
        if ((hasName || hasSurname || hasEmail) && !shouldSkipEmail) {
          shouldIncrementCounter = true;
          incrementUserCounter();
        }

        // Column 1: name - anonymize with faker (skip if email is skipped)
        if (hasName && !shouldSkipEmail) {
          parts[1] = generateFakeName();
          nameCount++;
        }

        // Column 2: surname - anonymize with faker (skip if email is skipped)
        if (hasSurname && !shouldSkipEmail) {
          parts[2] = generateFakeSurname();
          surnameCount++;
        }

        // Column 3: email - anonymize with faker
        if (hasEmail) {
          parts[3] = generateFakeEmail();
          emailCount++;
        }

        // Column 5: password - keep existing logic (replace all bcrypt hashes)
        if (parts[5] && parts[5] !== "\\N" && parts[5].length > 10) {
          parts[5] =
            "$2b$10$yki1DJ1UPBML4xZkESX3I.waslVwXuTYfWM00C.AVl34im5zt3Rs2";
          passwordCount++;
        }

        // Column 6: phone - anonymize with faker
        if (parts[6] && parts[6] !== "\\N" && parts[6].length > 3) {
          parts[6] = generateFakePhone();
          phoneCount++;
        }

        // Column 8: dob - keep existing logic
        if (parts[8] && parts[8] !== "\\N" && parts[8].includes("-")) {
          parts[8] = generateFakeDOB(parts[8]);
          dobCount++;
        }

        // Only nullify specific sensitive columns
        const columnsToNullify = new Set([
          19, 50, 53, 54, 55, 56, 57, 58, 59, 60, 62, 67, 68, 70, 71, 72, 77,
          78, 79, 80, 90, 91, 92, 93, 96, 104, 105, 106, 107, 112, 114, 116,
          118, 123,
        ]);

        for (let i = 0; i < parts.length; i++) {
          if (columnsToNullify.has(i) && parts[i] && parts[i] !== "\\N") {
            parts[i] = "\\N";
            otherFieldsCount++;
          }
        }

        line = parts.join("\t");
      }

      if (originalLine !== line) {
        log(
          "debug",
          `👤 Names: ${nameCount} | 👤 Surnames: ${surnameCount} | 📧 Emails: ${emailCount} | 🔐 Passwords: ${passwordCount} | 📞 Phones: ${phoneCount} | 📅 DOBs: ${dobCount} | 🗂️ Sensitive fields: ${otherFieldsCount} | ⏭️ Skipped: ${skippedRecords}`
        );
      }
    }

    sanitizedLines.push(line);
  }

  // Write sanitized plain SQL
  const sanitizedPlainFile = path.join(
    config.tempDir,
    "temp_sanitized_plain.sql"
  );
  fs.writeFileSync(sanitizedPlainFile, sanitizedLines.join("\n"));

  // Additional cleanup: Remove any remaining ownership and privilege statements
  log("info", "🧹 Cleaning up ownership and privilege statements...");
  let cleanedContent = fs.readFileSync(sanitizedPlainFile, "utf-8");

  // Remove ownership and privilege related statements
  const linesToRemove = [
    /^ALTER.*OWNER TO.*;$/gm,
    /^GRANT.*TO.*;$/gm,
    /^REVOKE.*FROM.*;$/gm,
    /^COMMENT ON.*IS.*;$/gm,
  ];

  linesToRemove.forEach((pattern) => {
    cleanedContent = cleanedContent.replace(pattern, "");
  });

  cleanedContent = cleanedContent.replace(/^\s*$/gm, "");
  fs.writeFileSync(sanitizedPlainFile, cleanedContent);

  log("info", `👤 Names anonymized: ${nameCount}`);
  log("info", `👤 Surnames anonymized: ${surnameCount}`);
  log("info", `📧 Emails anonymized: ${emailCount}`);
  log("info", `🔐 Passwords sanitized: ${passwordCount}`);
  log("info", `📞 Phone numbers anonymized: ${phoneCount}`);
  log("info", `📅 Dates of birth anonymized: ${dobCount}`);
  log("info", `🗂️ Sensitive fields nullified: ${otherFieldsCount}`);
  log("info", `⏭️ Records preserved (email skip): ${skippedRecords}`);
}

// Convert sanitized plain SQL back to custom format
async function convertToCustomFormat(tempPlainDump, finalSanitizedDump) {
  const sanitizedPlainFile = path.join(
    config.tempDir,
    "temp_sanitized_plain.sql"
  );

  // First restore sanitized data to a temp database
  const tempDb = "temp_sanitized_custom";
  execSync(
    `psql -U ${config.dbUsername} -c "DROP DATABASE IF EXISTS ${tempDb};"`,
    {
      stdio: "inherit",
    }
  );
  execSync(`psql -U ${config.dbUsername} -c "CREATE DATABASE ${tempDb};"`, {
    stdio: "inherit",
  });
  execSync(
    `psql -U ${config.dbUsername} -d ${tempDb} < "${sanitizedPlainFile}"`,
    {
      stdio: "inherit",
    }
  );

  // Now create custom format dump from sanitized database
  execSync(
    `pg_dump --format=custom --compress=9 --no-owner --no-privileges --no-tablespaces --no-security-labels --no-comments --file="${finalSanitizedDump}" --host=${config.dbHost} --port=${config.dbPort} --username=${config.dbUsername} ${tempDb} -n ${config.dbSchema}`,
    { stdio: "inherit" }
  );

  // Clean up temp database
  execSync(`psql -U ${config.dbUsername} -c "DROP DATABASE ${tempDb};"`, {
    stdio: "inherit",
  });

  // Clean up temp sanitized plain file
  try {
    fs.unlinkSync(sanitizedPlainFile);
  } catch (err) {
    log("warn", `Failed to clean up temp file: ${err.message}`);
  }
}

// Clean up temporary files
function cleanupTempFiles(tempFiles) {
  tempFiles.forEach((file) => {
    try {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        log("debug", `Cleaned up temp file: ${file}`);
      }
    } catch (err) {
      log("warn", `Failed to clean up temp file ${file}: ${err.message}`);
    }
  });
}

// Main scheduler function
function startScheduler() {
  log("info", `🚀 Starting database dump scheduler...`);
  log("info", `⏰ Schedule: ${config.cronSchedule}`);
  log("info", `📁 Input: ${config.inputDumpPath}`);
  log("info", `📁 Output: ${config.outputDumpPath}`);
  log("info", `📝 Logs: ${config.logFile}`);

  // Validate cron schedule
  if (!cron.validate(config.cronSchedule)) {
    log("error", `Invalid cron schedule: ${config.cronSchedule}`);
    process.exit(1);
  }

  // Schedule the job
  const task = cron.schedule(
    config.cronSchedule,
    async () => {
      log("info", "⏰ Scheduled database dump triggered");
      try {
        await performDatabaseDump();
      } catch (error) {
        log("error", `Scheduled dump failed: ${error.message}`);
      }
    },
    {
      scheduled: true,
      timezone: "UTC",
    }
  );

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    log("info", "🛑 Shutting down scheduler...");
    task.stop();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    log("info", "🛑 Shutting down scheduler...");
    task.stop();
    process.exit(0);
  });

  log("info", "✅ Scheduler started successfully. Press Ctrl+C to stop.");
}

// Run immediately if --now flag is provided
if (process.argv.includes("--now")) {
  log("info", "🚀 Running database dump immediately...");
  performDatabaseDump()
    .then(() => {
      log("info", "✅ Immediate dump completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      log("error", `❌ Immediate dump failed: ${error.message}`);
      process.exit(1);
    });
} else {
  // Start the scheduler
  startScheduler();
}
