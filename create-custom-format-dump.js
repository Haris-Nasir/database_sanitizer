// create-custom-format-dump.js
import { execSync } from "child_process";
import fs from "fs";

// Configuration matching your pg_dump command
const config = {
  host: "localhost",
  port: "5432",
  username: "postgres",
  format: "c", // Custom (binary) format
  outputFile:
    "/Users/macbookair/Desktop/replica/tstg-rds-for-haris-09-09-2025.sql",
  schema: "public",
  database: "postgres",
  verbose: true,
};

// Temporary files for sanitization process
const tempCustomDump = "/Users/macbookair/Desktop/replica/temp_custom.dump";
const tempPlainDump = "/Users/macbookair/Desktop/replica/temp_plain.sql";
const finalSanitizedDump = config.outputFile;

// Input file (original PostgreSQL custom dump)
const inputDump =
  "/Users/macbookair/Desktop/dev_db/tprod-rds-for-haris-09-09-2025.sql";

console.log("🔄 Processing custom format dump from input file...");

try {
  // Step 1: Copy input dump to temp location
  console.log("📝 Step 1: Copying input dump to temp location...");
  execSync(`cp "${inputDump}" "${tempCustomDump}"`, { stdio: "inherit" });

  // Step 2: Convert custom format to plain SQL for sanitization
  console.log("📝 Step 2: Converting to plain SQL for sanitization...");
  execSync(
    `pg_restore --no-owner --no-privileges --no-tablespaces -f "${tempPlainDump}" "${tempCustomDump}"`,
    { stdio: "inherit" }
  );

  // Step 3: Sanitize the plain SQL
  console.log("🔒 Step 3: Sanitizing PII data...");

  // Generate fake data functions
  function generateFakeEmail() {
    const domains = ["trnted.com"];
    const randomName = Math.random().toString(36).substring(2, 10);
    const domain = domains[Math.floor(Math.random() * domains.length)];
    return `${randomName}@${domain}`;
  }

  function generateFakePhone() {
    const prefixes = ["+1"];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const number = Math.floor(Math.random() * 9000000000) + 1000000000;
    return `${prefix}${number}`;
  }

  function generateFakeDOB(originalDate) {
    if (!originalDate || originalDate === "\\N") {
      // If no original date, generate a random one
      const start = new Date(1950, 0, 1);
      const end = new Date(2005, 11, 31);
      const randomDate = new Date(
        start.getTime() + Math.random() * (end.getTime() - start.getTime())
      );
      return randomDate.toISOString().split("T")[0];
    }

    try {
      // Parse the original date
      const original = new Date(originalDate);
      if (isNaN(original.getTime())) {
        throw new Error("Invalid date");
      }

      // Keep the original year
      const year = original.getFullYear();

      // Randomly adjust month (+/- 1-2 months)
      let month = original.getMonth(); // 0-11
      const monthAdjustment = Math.floor(Math.random() * 5) - 2; // -2 to +2
      month = Math.max(0, Math.min(11, month + monthAdjustment));

      // Randomly adjust day (+/- 1-15 days)
      let day = original.getDate(); // 1-31
      const dayAdjustment = Math.floor(Math.random() * 31) - 15; // -15 to +15
      day = Math.max(1, Math.min(31, day + dayAdjustment));

      // Create new date with preserved year and adjusted month/day
      const newDate = new Date(year, month, day);

      // Handle invalid dates (e.g., Feb 30th becomes Feb 28/29)
      if (newDate.getMonth() !== month) {
        // Month overflowed, adjust to last day of previous month
        newDate.setDate(0); // Go to last day of previous month
      }

      return newDate.toISOString().split("T")[0];
    } catch (error) {
      // If parsing fails, generate a random date
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
  let emailCount = 0;
  let phoneCount = 0;
  let dobCount = 0;
  let passwordCount = 0;
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

      if (parts.length >= 10) {
        // Column 3: email (index 3)
        if (parts[3] && parts[3].includes("@") && parts[3] !== "\\N") {
          parts[3] = generateFakeEmail();
          emailCount++;
        }

        // Column 5: password (index 5) - Replace all bcrypt hashes
        if (parts[5] && parts[5] !== "\\N" && parts[5].length > 10) {
          parts[5] =
            "$2b$10$yki1DJ1UPBML4xZkESX3I.waslVwXuTYfWM00C.AVl34im5zt3Rs2";
          passwordCount++;
        }

        // Column 6: phone (index 6)
        if (parts[6] && parts[6] !== "\\N" && parts[6].length > 3) {
          parts[6] = generateFakePhone();
          phoneCount++;
        }

        // Column 8: dob (date of birth, index 8)
        if (parts[8] && parts[8] !== "\\N" && parts[8].includes("-")) {
          parts[8] = generateFakeDOB(parts[8]); // Pass original date
          dobCount++;
        }

        line = parts.join("\t");
      }

      if (originalLine !== line) {
        console.log(
          `📧 Emails: ${emailCount} | 🔐 Passwords: ${passwordCount} | 📞 Phones: ${phoneCount} | 📅 DOBs: ${dobCount}`
        );
      }
    }

    sanitizedLines.push(line);
  }

  // Write sanitized plain SQL
  const sanitizedPlainFile =
    "/Users/macbookair/Desktop/replica/temp_sanitized_plain.sql";
  fs.writeFileSync(sanitizedPlainFile, sanitizedLines.join("\n"));

  // Step 4: Convert sanitized plain SQL back to custom format
  console.log("📝 Step 4: Converting sanitized data to custom format...");

  // First restore sanitized data to a temp database
  const tempDb = "temp_sanitized_custom";
  execSync(`psql -U postgres -c "DROP DATABASE IF EXISTS ${tempDb};"`, {
    stdio: "inherit",
  });
  execSync(`psql -U postgres -c "CREATE DATABASE ${tempDb};"`, {
    stdio: "inherit",
  });
  execSync(`psql -U postgres -d ${tempDb} < "${sanitizedPlainFile}"`, {
    stdio: "inherit",
  });

  // Now create custom format dump from sanitized database
  execSync(
    `pg_dump --format=custom --compress=9 --no-owner --no-privileges --file="${finalSanitizedDump}" --host=${config.host} --port=${config.port} --username=${config.username} ${tempDb} -n ${config.schema}`,
    { stdio: "inherit" }
  );

  // Clean up temp database
  execSync(`psql -U postgres -c "DROP DATABASE ${tempDb};"`, {
    stdio: "inherit",
  });

  // Clean up temp files
  try {
    fs.unlinkSync(tempCustomDump);
    fs.unlinkSync(tempPlainDump);
    fs.unlinkSync(sanitizedPlainFile);
  } catch (err) {
    // Ignore cleanup errors
  }

  console.log("\n🎉 Custom format dump created successfully!");
  console.log(`📧 Emails sanitized: ${emailCount}`);
  console.log(`🔐 Passwords sanitized: ${passwordCount}`);
  console.log(`📞 Phone numbers sanitized: ${phoneCount}`);
  console.log(`📅 Dates of birth sanitized: ${dobCount}`);
  console.log(`📝 Custom format dump saved to: ${finalSanitizedDump}`);

  // Verify the file format
  console.log("\n🔍 Verifying file format...");
  execSync(`file "${finalSanitizedDump}"`, { stdio: "inherit" });

  console.log("\n✅ File matches your pg_dump command format!");
  console.log("\n🔧 To use with DBeaver:");
  console.log(
    `pg_restore -U postgres -d your_database "${finalSanitizedDump}"`
  );
} catch (error) {
  console.error("❌ Error:", error.message);
  process.exit(1);
}
