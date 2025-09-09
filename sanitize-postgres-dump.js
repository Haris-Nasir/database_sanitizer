// sanitize-postgres-dump.js
import { execSync } from "child_process";
import fs from "fs";
import { faker } from "@faker-js/faker";

// Input/output files
const inputFile =
  "/Users/umarahsan/projects/tournated/db/input-file/tprod-rds-for-haris-09-09-2025.sql";
const tempSqlFile =
  "/Users/umarahsan/projects/tournated/db/output-file/temp_dump.sql";
const outputFile =
  "/Users/umarahsan/projects/tournated/db/output-file/dump_sanitized.sql";

// Emails to skip from anonymization
const skipEmails = ["mail.waleed.saifi@gmail.com"];

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

  // Generate fake data using faker
  function generateFakeName() {
    return faker.person.firstName();
  }

  function generateFakeSurname() {
    return faker.person.lastName();
  }

  function generateFakeEmail() {
    // Generate unique email using Unix timestamp
    const timestamp = Date.now();
    const username = faker.internet.username();
    const domain = faker.internet.domainName();
    return `${username}.${timestamp}@${domain}`;
  }

  function generateFakePhone() {
    return faker.phone.number();
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
  let nameCount = 0;
  let surnameCount = 0;
  let emailCount = 0;
  let phoneCount = 0;
  let dobCount = 0;
  let passwordCount = 0;
  let otherFieldsCount = 0;
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

      if (parts.length >= 128) {
        // Ensure we have enough columns (128 total columns based on actual database schema)

        // Column 1: name - anonymize with faker
        if (parts[1] && parts[1] !== "\\N") {
          parts[1] = generateFakeName();
          nameCount++;
        }

        // Column 2: surname - anonymize with faker
        if (parts[2] && parts[2] !== "\\N") {
          parts[2] = generateFakeSurname();
          surnameCount++;
        }

        // Column 3: email - anonymize with faker
        if (
          parts[3] &&
          parts[3].includes("@") &&
          parts[3] !== "\\N" &&
          !skipEmails.includes(parts[3])
        ) {
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
          parts[8] = generateFakeDOB(parts[8]); // Pass original date
          dobCount++;
        }

        // Only nullify specific sensitive columns

        const columnsToNullify = new Set([
          19, // avatar
          50, // reset_password
          53, // ipinId
          54, // duprId
          55, // teId
          56, // atpId
          57, // wtaId
          58, // fideId
          59, // ltsU10Id
          60, // pdlId
          62, // israel_national_id
          67, // national_fisher_id
          68, // no_fisher_id_doc
          70, // user_national_id
          71, // user_national_med
          72, // user_address
          77, // user_device_token
          78, // user_device_type
          79, // fcm_token
          80, // accessToken
          90, // userClubIdId
          91, // googleId
          92, // appleId
          93, // facebookId
          96, // oldEmail
          104, // middle_name
          105, // name_passport
          106, // middle_name_passport
          107, // surname_passport
          112, // wprUserId
          114, // idToken
          116, // stripeAccountId
          118, // stripe_private_key
          123, // wprPlayerId
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
        console.log(
          `👤 Names: ${nameCount} | 👤 Surnames: ${surnameCount} | 📧 Emails: ${emailCount} | 🔐 Passwords: ${passwordCount} | 📞 Phones: ${phoneCount} | 📅 DOBs: ${dobCount} | 🗂️ Sensitive fields: ${otherFieldsCount}`
        );
      }
    }

    sanitizedLines.push(line);
  }

  // Write sanitized content
  fs.writeFileSync(outputFile, sanitizedLines.join("\n"));

  console.log(`✅ Sanitization complete!`);
  console.log(`👤 Names anonymized: ${nameCount}`);
  console.log(`👤 Surnames anonymized: ${surnameCount}`);
  console.log(`📧 Emails anonymized: ${emailCount}`);
  console.log(`🔐 Passwords sanitized: ${passwordCount}`);
  console.log(`📞 Phone numbers anonymized: ${phoneCount}`);
  console.log(`📅 Dates of birth anonymized: ${dobCount}`);
  console.log(`🗂️ Sensitive fields nullified: ${otherFieldsCount}`);
  console.log(`📝 Sanitized dump written to: ${outputFile}`);

  // Clean up temp file
  fs.unlinkSync(tempSqlFile);

  console.log("🎉 Sanitization complete! You can now restore with:");
  console.log(`psql -U postgres -d new_db < ${outputFile}`);
} catch (error) {
  console.error("❌ Error:", error.message);
  process.exit(1);
}
