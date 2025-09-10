// create-custom-format-dump.js
import { execSync } from "child_process";
import fs from "fs";
import { faker } from "@faker-js/faker";

// Configuration matching your pg_dump command
const config = {
  host: "localhost",
  port: "5432",
  username: "postgres",
  format: "c", // Custom (binary) format
  outputFile:
    "/Users/umarahsan/projects/tournated/db/output-file/tprod-rds-09-09-2025-sanitized.sql",
  schema: "public",
  database: "postgres",
  verbose: true,
};

// Emails to skip from anonymization
const skipEmails = ["mail.waleed.saifi@gmail.com"];

// Temporary files for sanitization process
const tempCustomDump =
  "/Users/umarahsan/projects/tournated/db/temp/temp_custom.dump";
const tempPlainDump =
  "/Users/umarahsan/projects/tournated/db/temp/temp_plain.sql";
const finalSanitizedDump = config.outputFile;

// Input file (original PostgreSQL custom dump)
const inputDump =
  "/Users/umarahsan/projects/tournated/db/input-file/tprod-rds-for-haris-09-09-2025.sql";

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

  // Generate fake data using faker
  let userCounter = 1;

  function generateFakeName() {
    const firstName = "John";
    return `${firstName}${userCounter}`;
  }

  function generateFakeSurname() {
    const lastName = "Doe";
    return `${lastName}${userCounter}`;
  }

  function generateFakeEmail() {
    // Generate unique email using user counter for guaranteed uniqueness
    const username = `john${userCounter}`;
    const domain = "tournated.com";
    return `${username}@${domain}`;
  }

  function incrementUserCounter() {
    userCounter++;
  }

  function generateFakePhone() {
    return faker.phone.number();
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

    // name, surname, email, password, phone, dob, city, street, role, avatar, reset_password, ipinId, duprId, teId, atpId, wtaId, fideId, ltsU10Id, pdlId, israel_national_id, national_fisher_id, no_fisher_id_doc, user_national_id, user_national_med, user_address, user_device_token, user_device_type, fcm_token, accessToken, userClubIdId, googleId, appleId, facebookId, oldEmail, middle_name, name_passport, middle_name_passport, surname_passport, wprUserId, idToken, stripeAccountId, stripe_private_key, wprPlayerId

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

        // Increment counter after processing all fake data for this user
        incrementUserCounter();
      }
    }

    sanitizedLines.push(line);
  }

  // Write sanitized plain SQL
  const sanitizedPlainFile =
    "/Users/umarahsan/projects/tournated/db/temp/temp_sanitized_plain.sql";
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
  console.log(`👤 Names anonymized: ${nameCount}`);
  console.log(`👤 Surnames anonymized: ${surnameCount}`);
  console.log(`📧 Emails anonymized: ${emailCount}`);
  console.log(`🔐 Passwords sanitized: ${passwordCount}`);
  console.log(`📞 Phone numbers anonymized: ${phoneCount}`);
  console.log(`📅 Dates of birth anonymized: ${dobCount}`);
  console.log(`🗂️ Sensitive fields nullified: ${otherFieldsCount}`);
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
