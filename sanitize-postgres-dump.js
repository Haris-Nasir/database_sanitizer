// sanitize-postgres-dump.js
import { execSync } from "child_process";
import fs from "fs";

// Input/output files
const inputFile =
  "/Users/macbookair/Desktop/dev_db/tprod-rds-for-haris-09-09-2025.sql";
const tempSqlFile = "/Users/macbookair/Desktop/replica/temp_dump.sql";
const outputFile = "/Users/macbookair/Desktop/replica/dump_sanitized.sql";

console.log("🔄 Step 1: Converting custom format to plain SQL...");

try {
  // Convert custom format to plain SQL (include both schema and data)
  execSync(
    `pg_restore --no-owner --no-privileges --no-tablespaces -f "${tempSqlFile}" "${inputFile}"`,
    { stdio: "inherit" }
  );

  console.log("✅ Converted to plain SQL");
  console.log("🔄 Step 2: Sanitizing PII data (emails, phones, DOB)...");

  // Read the plain SQL file
  let content = fs.readFileSync(tempSqlFile, "utf-8");

  // Generate random fake email
  function generateFakeEmail() {
    const domains = ["example.com", "fake.com", "testmail.com"];
    const randomName = Math.random().toString(36).substring(2, 10);
    const domain = domains[Math.floor(Math.random() * domains.length)];
    return `${randomName}@${domain}`;
  }

  // Generate random fake phone number
  function generateFakePhone() {
    const prefixes = ["+1", "+44", "+49", "+33", "+39"];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const number = Math.floor(Math.random() * 9000000000) + 1000000000;
    return `${prefix}${number}`;
  }

  // Generate random fake date of birth (preserving original year)
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

  // Replace PII data in COPY statements for user table
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

    // Check if we're ending the user table data (empty line or next COPY statement)
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
        // Ensure we have enough columns
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

  // Write sanitized content
  fs.writeFileSync(outputFile, sanitizedLines.join("\n"));

  console.log(`✅ Sanitization complete!`);
  console.log(`📧 Emails sanitized: ${emailCount}`);
  console.log(`🔐 Passwords sanitized: ${passwordCount}`);
  console.log(`📞 Phone numbers sanitized: ${phoneCount}`);
  console.log(`📅 Dates of birth sanitized: ${dobCount}`);
  console.log(`📝 Sanitized dump written to: ${outputFile}`);

  // Clean up temp file
  fs.unlinkSync(tempSqlFile);

  console.log("🎉 Sanitization complete! You can now restore with:");
  console.log(`psql -U postgres -d new_db < ${outputFile}`);
} catch (error) {
  console.error("❌ Error:", error.message);
  process.exit(1);
}
