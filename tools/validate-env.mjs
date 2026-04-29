#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { basename } from "node:path";

const [, , envPath = ".env", ...flags] = process.argv;
const allowPlaceholders = flags.includes("--allow-placeholders");

const REQUIRED_KEYS = ["PRIVATE_KEY", "SEPOLIA_RPC_URL", "ETHERSCAN_API_KEY"];

function parseEnvFile(path) {
    if (!existsSync(path)) {
        throw new Error(`Env file not found: ${path}`);
    }

    const values = new Map();
    const lines = readFileSync(path, "utf8").split(/\r?\n/);

    for (const [index, rawLine] of lines.entries()) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;

        const equalsIndex = line.indexOf("=");
        if (equalsIndex === -1) {
            throw new Error(`Invalid env line ${index + 1}: missing "="`);
        }

        const key = line.slice(0, equalsIndex).trim();
        let value = line.slice(equalsIndex + 1).trim();

        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }

        values.set(key, value);
    }

    return values;
}

function isPlaceholder(value) {
    return !value || value.includes("YOUR_") || value.includes("your-") || value.includes("...");
}

function assertValue(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function validate(values) {
    for (const key of REQUIRED_KEYS) {
        assertValue(values.has(key), `Missing required key: ${key}`);
        assertValue(values.get(key), `Empty value for required key: ${key}`);
    }

    const privateKey = values.get("PRIVATE_KEY");
    const sepoliaRpcUrl = values.get("SEPOLIA_RPC_URL");
    const etherscanApiKey = values.get("ETHERSCAN_API_KEY");

    if (!allowPlaceholders || !isPlaceholder(privateKey)) {
        assertValue(
            /^0x[0-9a-fA-F]{64}$/.test(privateKey),
            "PRIVATE_KEY must be a 32-byte hex string with 0x prefix"
        );
    }

    if (!allowPlaceholders || !isPlaceholder(sepoliaRpcUrl)) {
        assertValue(/^https?:\/\//.test(sepoliaRpcUrl), "SEPOLIA_RPC_URL must start with http:// or https://");
        assertValue(
            sepoliaRpcUrl.toLowerCase().includes("sepolia"),
            "SEPOLIA_RPC_URL should point to Ethereum Sepolia, not mainnet"
        );
    }

    if (!allowPlaceholders || !isPlaceholder(etherscanApiKey)) {
        assertValue(etherscanApiKey.length >= 16, "ETHERSCAN_API_KEY looks too short");
    }
}

try {
    const values = parseEnvFile(envPath);
    validate(values);
    console.log(`OK: ${basename(envPath)} contains the required deployment configuration.`);
} catch (error) {
    console.error(`Env validation failed: ${error.message}`);
    process.exit(1);
}
