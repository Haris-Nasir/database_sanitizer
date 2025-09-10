// anonymize.js - Data anonymization module
import { faker } from "@faker-js/faker";
import fs from "fs";
import readline from "readline";
import { createReadStream, createWriteStream } from "fs";

// Emails to skip from anonymization
export const skipEmails = [
  "mail.waleed.saifi@gmail.com",
  "hamzamalik@getnada.com",
  "prodclient@getnada.com",
  "prodclient3@getnada.com",
  "hamzamalik1@getnada.com",
  "test203@getnada.com",
  "testinguser67@getnada.com",
  "asad.ahmad@spadasoftinc.com",
];

// Counter for generating unique fake data
let userCounter = 1;

/**
 * Generate a fake name using counter for uniqueness
 */
export function generateFakeName() {
  const firstName = "John";
  return `${firstName}${userCounter}`;
}

/**
 * Generate a fake surname using counter for uniqueness
 */
export function generateFakeSurname() {
  const lastName = "Doe";
  return `${lastName}${userCounter}`;
}

/**
 * Generate a fake email using counter for guaranteed uniqueness
 */
export function generateFakeEmail() {
  const username = `john${userCounter}`;
  const domain = "tournated.com";
  return `${username}@${domain}`;
}

/**
 * Increment the user counter for unique data generation
 */
export function incrementUserCounter() {
  userCounter++;
}

/**
 * Generate a fake phone number
 */
export function generateFakePhone() {
  return faker.phone.number();
}

/**
 * Generate a fake date of birth that preserves the original year
 * but randomizes the month and day
 */
export function generateFakeDOB(originalDate) {
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

/**
 * Parse INSERT statement values, handling commas inside quoted strings
 * @param {string} valuesString - The VALUES part of an INSERT statement
 * @returns {array} - Array of individual values
 */
function parseInsertValues(valuesString) {
  const values = [];
  let current = "";
  let inQuotes = false;
  let quoteChar = "";

  for (let i = 0; i < valuesString.length; i++) {
    const char = valuesString[i];

    if (!inQuotes && (char === '"' || char === "'")) {
      inQuotes = true;
      quoteChar = char;
      current += char;
    } else if (inQuotes && char === quoteChar) {
      inQuotes = false;
      current += char;
    } else if (!inQuotes && char === ",") {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  // Add the last value
  if (current.trim()) {
    values.push(current.trim());
  }

  return values;
}

/**
 * Anonymize data in a plain SQL dump file (memory-efficient version)
 * @param {string} inputFile - Path to the input SQL dump file
 * @param {string} outputFile - Path to write the anonymized output
 * @returns {object} - Statistics about the anonymization process
 */
export function anonymizeSqlDump(inputFile, outputFile) {
  console.log("🔒 Starting data anonymization...");

  // Create read and write streams for memory-efficient processing
  const readStream = createReadStream(inputFile, { encoding: "utf8" });
  const writeStream = createWriteStream(outputFile, { encoding: "utf8" });

  const rl = readline.createInterface({
    input: readStream,
    crlfDelay: Infinity,
  });

  // Statistics counters
  let nameCount = 0;
  let surnameCount = 0;
  let emailCount = 0;
  let phoneCount = 0;
  let dobCount = 0;
  let passwordCount = 0;
  let otherFieldsCount = 0;
  let skippedRecords = 0;
  let inUserTable = false;
  let linesProcessed = 0;

  return new Promise((resolve, reject) => {
    rl.on("line", (line) => {
      linesProcessed++;

      // Check if we're ending the user table data (look for next INSERT or end of section)
      if (
        inUserTable &&
        (line.trim() === "" ||
          (line.startsWith("INSERT INTO") &&
            !/INSERT INTO public\."user"/i.test(line) &&
            !/INSERT INTO "user"/i.test(line)) ||
          (line.startsWith("--") && line.includes("Name:")) ||
          line.startsWith("\\."))
      ) {
        inUserTable = false;
        writeStream.write(line + "\n");
        return;
      }

      // Check if this is a user table INSERT statement (detect and process in one step)
      if (
        (/INSERT INTO public\."user"/i.test(line) ||
          /INSERT INTO "user"/i.test(line)) &&
        line.includes("VALUES")
      ) {
        inUserTable = true;
        const originalLine = line;

        // Process the INSERT statement for anonymization
        // Extract values from INSERT statement
        const valuesMatch = line.match(/VALUES\s*\((.*)\)/i);
        if (valuesMatch) {
          const valuesString = valuesMatch[1];
          // Split by comma but be careful about commas inside strings
          const parts = parseInsertValues(valuesString);

          if (parts.length >= 3) {
            // Need at least id, name, email columns
            // Column 3: email - check if it should be skipped (assuming standard order)
            const emailIndex = 3; // 0-based index for email column (id=0, name=1, surname=2, email=3)
            const shouldSkipEmail =
              parts[emailIndex] &&
              typeof parts[emailIndex] === "string" &&
              parts[emailIndex].includes("@") &&
              parts[emailIndex] !== "NULL" &&
              skipEmails.includes(parts[emailIndex].replace(/['"]/g, ""));

            // Track skipped records for reporting
            if (shouldSkipEmail) {
              skippedRecords++;
            }

            // Column 1: name - anonymize with faker (skip if email is skipped)
            const nameIndex = 1; // 1-based index in INSERT statement
            if (
              parts[nameIndex] &&
              parts[nameIndex] !== "NULL" &&
              !shouldSkipEmail
            ) {
              const cleanName = parts[nameIndex].replace(/['"]/g, "");
              if (cleanName) {
                parts[nameIndex] = `'${generateFakeName()}'`;
                nameCount++;
              }
            }

            // Column 2: surname - anonymize with faker (skip if email is skipped)
            const surnameIndex = 2; // 1-based index in INSERT statement
            if (
              parts[surnameIndex] &&
              parts[surnameIndex] !== "NULL" &&
              !shouldSkipEmail
            ) {
              const cleanSurname = parts[surnameIndex].replace(/['"]/g, "");
              if (cleanSurname) {
                parts[surnameIndex] = `'${generateFakeSurname()}'`;
                surnameCount++;
              }
            }

            // Column 3: email - anonymize with faker
            if (
              parts[emailIndex] &&
              typeof parts[emailIndex] === "string" &&
              parts[emailIndex].includes("@") &&
              parts[emailIndex] !== "NULL" &&
              !skipEmails.includes(parts[emailIndex].replace(/['"]/g, ""))
            ) {
              parts[emailIndex] = `'${generateFakeEmail()}'`;
              emailCount++;
            }

            // Column 5: password - replace all bcrypt hashes
            const passwordIndex = 4;
            if (
              parts[passwordIndex] &&
              parts[passwordIndex] !== "NULL" &&
              parts[passwordIndex].length > 10
            ) {
              parts[passwordIndex] =
                "'$2b$10$yki1DJ1UPBML4xZkESX3I.waslVwXuTYfWM00C.AVl34im5zt3Rs2'";
              passwordCount++;
            }

            // Column 6: phone - anonymize with faker
            const phoneIndex = 5;
            if (
              parts[phoneIndex] &&
              parts[phoneIndex] !== "NULL" &&
              parts[phoneIndex].length > 3
            ) {
              parts[phoneIndex] = `'${generateFakePhone()}'`;
              phoneCount++;
            }

            // Column 8: dob - anonymize date
            const dobIndex = 7;
            if (
              parts[dobIndex] &&
              parts[dobIndex] !== "NULL" &&
              parts[dobIndex].includes("-")
            ) {
              const cleanDate = parts[dobIndex].replace(/['"]/g, "");
              parts[dobIndex] = `'${generateFakeDOB(cleanDate)}'`;
              dobCount++;
            }

            // Reconstruct the INSERT statement
            line = line.replace(valuesMatch[0], `VALUES (${parts.join(", ")})`);
          }
        }

        // Show progress every 1000 lines
        if (linesProcessed % 1000 === 0) {
          console.log(
            `📊 Progress: ${linesProcessed} lines | 👤 Names: ${nameCount} | 📧 Emails: ${emailCount} | ⏭️ Skipped: ${skippedRecords}`
          );
        }

        // Increment counter after processing all fake data for this user
        if (originalLine !== line) {
          incrementUserCounter();
        }

        // Write the (possibly modified) line
        writeStream.write(line + "\n");
      } else {
        // For all other lines, just write them as-is
        writeStream.write(line + "\n");
      }
    });

    rl.on("close", () => {
      writeStream.end();

      console.log("\n🎉 Anonymization completed!");
      console.log(`📊 Summary:`);
      console.log(`   👤 Names anonymized: ${nameCount}`);
      console.log(`   👤 Surnames anonymized: ${surnameCount}`);
      console.log(`   📧 Emails anonymized: ${emailCount}`);
      console.log(`   🔐 Passwords sanitized: ${passwordCount}`);
      console.log(`   📞 Phone numbers anonymized: ${phoneCount}`);
      console.log(`   📅 Dates of birth anonymized: ${dobCount}`);
      console.log(`   🗂️ Sensitive fields nullified: ${otherFieldsCount}`);
      console.log(`   ⏭️ Records preserved (email skip): ${skippedRecords}`);
      console.log(`   📝 Total lines processed: ${linesProcessed}`);

      resolve({
        nameCount,
        surnameCount,
        emailCount,
        phoneCount,
        dobCount,
        passwordCount,
        otherFieldsCount,
        skippedRecords,
        linesProcessed,
        totalProcessed:
          nameCount +
          surnameCount +
          emailCount +
          phoneCount +
          dobCount +
          passwordCount +
          otherFieldsCount +
          skippedRecords,
      });
    });

    rl.on("error", (error) => {
      console.error("❌ Error reading file:", error);
      reject(error);
    });

    writeStream.on("error", (error) => {
      console.error("❌ Error writing file:", error);
      reject(error);
    });
  });
}
