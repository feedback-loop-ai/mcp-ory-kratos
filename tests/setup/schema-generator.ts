/**
 * Schema-Based Trait Generator
 *
 * Dynamically generates valid identity traits based on JSON Schema definitions.
 * Makes tests portable across any Kratos instance regardless of its identity schema.
 */

/**
 * JSON Schema property definition (simplified)
 */
interface JsonSchemaProperty {
  type?: string;
  format?: string;
  pattern?: string;
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  items?: JsonSchemaProperty;
  title?: string;
  default?: unknown;
  "ory.sh/kratos"?: {
    credentials?: {
      password?: { identifier?: boolean };
      passkey?: { display_name?: boolean };
    };
    verification?: { via?: string };
    recovery?: { via?: string };
  };
}

/**
 * JSON Schema definition for identity traits
 */
interface JsonSchema {
  $id?: string;
  $schema?: string;
  title?: string;
  type?: string;
  properties?: {
    traits?: {
      type?: string;
      properties?: Record<string, JsonSchemaProperty>;
      required?: string[];
      additionalProperties?: boolean;
    };
  };
}

/**
 * Generate a unique random string
 */
function generateRandomString(length = 6): string {
  return Math.random().toString(36).substring(2, 2 + length);
}

/**
 * Generate a unique timestamp-based identifier
 */
function generateTimestampId(): string {
  return `${Date.now()}-${generateRandomString()}`;
}

/**
 * Generate a valid email address for testing
 */
function generateTestEmail(prefix = "test"): string {
  return `${prefix}-${generateTimestampId()}@example.com`;
}

/**
 * Generate a valid phone number for testing
 */
function generateTestPhone(): string {
  const areaCode = Math.floor(Math.random() * 900) + 100;
  const exchange = Math.floor(Math.random() * 900) + 100;
  const subscriber = Math.floor(Math.random() * 9000) + 1000;
  return `+1${areaCode}${exchange}${subscriber}`;
}

/**
 * Generate a valid URI for testing
 */
function generateTestUri(): string {
  return `https://example.com/${generateRandomString()}`;
}

/**
 * Generate a valid UUID for testing
 */
function generateTestUuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate a value for a JSON Schema property based on its definition
 */
function generateValueForProperty(
  name: string,
  propSchema: JsonSchemaProperty
): unknown {
  const { type, format, enum: enumValues, properties, items } = propSchema;

  // Handle enum - pick first value
  if (enumValues && enumValues.length > 0) {
    return enumValues[0];
  }

  // Handle default value
  if (propSchema.default !== undefined) {
    return propSchema.default;
  }

  // Handle by type
  switch (type) {
    case "string":
      return generateStringValue(name, propSchema);

    case "boolean":
      // For terms acceptance and similar, default to true
      if (
        name.toLowerCase().includes("accept") ||
        name.toLowerCase().includes("consent") ||
        name.toLowerCase().includes("agree")
      ) {
        return true;
      }
      return true;

    case "number":
    case "integer":
      return generateNumberValue(propSchema);

    case "object":
      if (properties) {
        return generateObjectValue(properties, propSchema.required || []);
      }
      return {};

    case "array":
      if (items) {
        // Generate array with one item
        return [generateValueForProperty(`${name}[0]`, items)];
      }
      return [];

    case "null":
      return null;

    default:
      // If no type specified, try to infer from name or format
      if (format) {
        return generateStringValue(name, { ...propSchema, type: "string" });
      }
      // Fallback to string
      return `test-${generateRandomString()}`;
  }
}

/**
 * Generate a string value based on format or name hints
 */
function generateStringValue(
  name: string,
  propSchema: JsonSchemaProperty
): string {
  const { format, minLength = 1, maxLength = 100 } = propSchema;
  const nameLower = name.toLowerCase();

  // Handle standard formats
  switch (format) {
    case "email":
      return generateTestEmail();
    case "uri":
    case "url":
      return generateTestUri();
    case "uuid":
      return generateTestUuid();
    case "date":
      return new Date().toISOString().split("T")[0];
    case "date-time":
      return new Date().toISOString();
    case "time":
      return new Date().toISOString().split("T")[1].split(".")[0];
    case "phone":
      return generateTestPhone();
  }

  // Infer from property name
  if (nameLower.includes("email")) {
    return generateTestEmail();
  }
  if (nameLower.includes("phone") || nameLower.includes("tel")) {
    return generateTestPhone();
  }
  if (nameLower.includes("url") || nameLower.includes("uri")) {
    return generateTestUri();
  }
  if (nameLower === "first" || nameLower.includes("firstname")) {
    return "Test";
  }
  if (nameLower === "last" || nameLower.includes("lastname")) {
    return "User";
  }
  if (nameLower.includes("name") && !nameLower.includes("username")) {
    return "Test User";
  }
  if (nameLower.includes("username")) {
    return `testuser-${generateRandomString()}`;
  }
  if (nameLower.includes("picture") || nameLower.includes("avatar")) {
    return `https://example.com/avatar/${generateRandomString()}.png`;
  }

  // Generate string within length constraints
  const baseString = `test-${generateRandomString()}`;
  if (baseString.length < minLength) {
    return baseString.padEnd(minLength, "x");
  }
  if (baseString.length > maxLength) {
    return baseString.substring(0, maxLength);
  }
  return baseString;
}

/**
 * Generate a number value within constraints
 */
function generateNumberValue(propSchema: JsonSchemaProperty): number {
  const { minimum = 0, maximum = 100, type } = propSchema;
  const value = Math.random() * (maximum - minimum) + minimum;
  return type === "integer" ? Math.floor(value) : value;
}

/**
 * Generate an object value by processing its properties
 */
function generateObjectValue(
  properties: Record<string, JsonSchemaProperty>,
  required: string[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  // Generate values for required properties
  for (const propName of required) {
    const propSchema = properties[propName];
    if (propSchema) {
      result[propName] = generateValueForProperty(propName, propSchema);
    }
  }

  // Optionally generate values for non-required properties that have defaults
  for (const [propName, propSchema] of Object.entries(properties)) {
    if (!required.includes(propName) && propSchema.default !== undefined) {
      result[propName] = propSchema.default;
    }
  }

  return result;
}

/**
 * Extract the traits schema from a full identity schema
 */
function extractTraitsSchema(
  schema: JsonSchema
): { properties: Record<string, JsonSchemaProperty>; required: string[] } | null {
  const traitsSchema = schema.properties?.traits;
  if (!traitsSchema?.properties) {
    return null;
  }

  return {
    properties: traitsSchema.properties,
    required: traitsSchema.required || [],
  };
}

/**
 * Generate identity traits from a JSON Schema
 *
 * @param schema - The identity JSON Schema (full schema, not just traits)
 * @returns Generated traits object that conforms to the schema
 */
export function generateTraitsFromSchema(
  schema: JsonSchema
): Record<string, unknown> {
  const traitsSchema = extractTraitsSchema(schema);

  if (!traitsSchema) {
    // If we can't parse the schema, return minimal traits
    console.warn(
      "Could not extract traits schema, returning minimal test traits"
    );
    return {
      email: generateTestEmail(),
    };
  }

  return generateObjectValue(traitsSchema.properties, traitsSchema.required);
}

/**
 * Generate a unique test email (exported for direct use)
 */
export { generateTestEmail };

/**
 * Generate a unique identifier (exported for direct use)
 */
export function generateUniqueId(prefix = "test"): string {
  return `${prefix}-${generateTimestampId()}`;
}

/**
 * Check if a schema has a specific property in traits
 */
export function schemaHasProperty(
  schema: JsonSchema,
  propertyName: string
): boolean {
  const traitsSchema = extractTraitsSchema(schema);
  return traitsSchema?.properties?.[propertyName] !== undefined;
}

/**
 * Get the list of required trait properties from a schema
 */
export function getRequiredTraitProperties(schema: JsonSchema): string[] {
  const traitsSchema = extractTraitsSchema(schema);
  return traitsSchema?.required || [];
}
