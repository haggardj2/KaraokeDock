/**
 * Utility functions for parsing and handling application settings
 */
/**
 * Parse boolean settings that might be stored as strings, booleans, numbers, or null/undefined
 *
 * @param value - The setting value to parse
 * @returns boolean - true if the value is truthy, false if explicitly set to false
 *
 * Handles the following cases:
 * - Boolean false: returns false
 * - String "false" (case-insensitive, trimmed): returns false
 * - Number 0: returns false
 * - null/undefined: returns true (default)
 * - Boolean true: returns true
 * - String "true": returns true
 * - Any other value: returns true
 */
export function parseBooleanSetting(value) {
    // Handle null/undefined - default to true
    if (value === null || value === undefined)
        return true;
    // Handle boolean false
    if (value === false)
        return false;
    // Handle string 'false' (case-insensitive, trimmed)
    if (typeof value === 'string' && value.trim().toLowerCase() === 'false')
        return false;
    // Handle number 0 as false
    if (value === 0)
        return false;
    // Everything else defaults to true
    return true;
}
