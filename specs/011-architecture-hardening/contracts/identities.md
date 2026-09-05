# Tool Contracts: identities toolset

**Feature**: 011-architecture-hardening  
**Source**: generated from the live `tools/list` response of `createServer` (all toolsets enabled, not read-only). Regenerate by connecting an SDK `Client` over `InMemoryTransport` to `createServer` and dumping `tools/list`; `src/schemas/tools.ts` is the Zod source of truth.

**Common envelope**: success → `content[0].text` = JSON of the result and `structuredContent` = the same object; upstream/validation failure → `isError: true` with `{ error: { code, message, kratosStatus?, kratosCode?, suggestion? } }`; declined confirmation (destructive tools) → `{ cancelled: true, message }`.

## `kratos_batch_patch_identities`

**Title**: Batch create identities  
**Annotations**: readOnlyHint=false, destructiveHint=false, idempotentHint=false, openWorldHint=false

**Description**

> Create up to 100 identities in one request (bulk import). Items succeed or fail independently: each result reports action 'create' (with the new identity ID) or 'error' (with Kratos error detail), plus a succeeded/failed summary. Supply a patchId per item to correlate results. Example: {"identities": [{"create": {"schemaId": "default", "traits": {"email": "jane.doe@example.com"}}}]}.

**Input schema (JSON Schema)**

```json
{
  "type": "object",
  "properties": {
    "identities": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "create": {
            "type": "object",
            "properties": {
              "schemaId": {
                "type": "string",
                "minLength": 1,
                "description": "Identity schema to use"
              },
              "traits": {
                "type": "object",
                "additionalProperties": {},
                "description": "Identity traits (must match schema)"
              },
              "state": {
                "type": "string",
                "enum": [
                  "active",
                  "inactive"
                ],
                "default": "active",
                "description": "Initial identity state"
              },
              "metadataPublic": {
                "type": "object",
                "additionalProperties": {},
                "description": "Public metadata"
              },
              "metadataAdmin": {
                "type": "object",
                "additionalProperties": {},
                "description": "Admin-only metadata"
              },
              "externalId": {
                "type": "string",
                "description": "External system ID (unique across identities)"
              },
              "organizationId": {
                "type": "string",
                "format": "uuid",
                "description": "Organization to place the identity in"
              },
              "credentials": {
                "type": "object",
                "properties": {
                  "password": {
                    "type": "object",
                    "properties": {
                      "config": {
                        "type": "object",
                        "properties": {
                          "password": {
                            "type": "string",
                            "description": "Plaintext password (hashed by Kratos)"
                          },
                          "hashed_password": {
                            "type": "string",
                            "description": "Pre-hashed password (bcrypt, argon2id, pbkdf2, scrypt, md5, ...)"
                          },
                          "use_password_migration_hook": {
                            "type": "boolean"
                          }
                        },
                        "additionalProperties": false
                      }
                    },
                    "required": [
                      "config"
                    ],
                    "additionalProperties": false
                  },
                  "oidc": {
                    "type": "object",
                    "properties": {
                      "config": {
                        "type": "object",
                        "properties": {
                          "providers": {
                            "type": "array",
                            "items": {
                              "type": "object",
                              "properties": {
                                "provider": {
                                  "type": "string",
                                  "description": "OIDC provider ID as configured in Kratos"
                                },
                                "subject": {
                                  "type": "string",
                                  "description": "Subject at the provider"
                                },
                                "organization": {
                                  "type": "string"
                                },
                                "use_auto_link": {
                                  "type": "boolean"
                                }
                              },
                              "required": [
                                "provider",
                                "subject"
                              ],
                              "additionalProperties": false
                            }
                          }
                        },
                        "required": [
                          "providers"
                        ],
                        "additionalProperties": false
                      }
                    },
                    "required": [
                      "config"
                    ],
                    "additionalProperties": false
                  },
                  "saml": {
                    "type": "object",
                    "properties": {
                      "config": {
                        "type": "object",
                        "properties": {
                          "providers": {
                            "type": "array",
                            "items": {
                              "type": "object",
                              "properties": {
                                "provider": {
                                  "type": "string"
                                },
                                "subject": {
                                  "type": "string"
                                },
                                "organization": {
                                  "type": "string"
                                }
                              },
                              "required": [
                                "provider",
                                "subject"
                              ],
                              "additionalProperties": false
                            }
                          }
                        },
                        "required": [
                          "providers"
                        ],
                        "additionalProperties": false
                      }
                    },
                    "required": [
                      "config"
                    ],
                    "additionalProperties": false
                  }
                },
                "additionalProperties": false,
                "description": "Existing credentials to import with the identity"
              },
              "verifiableAddresses": {
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "value": {
                      "type": "string",
                      "description": "Email address or phone number"
                    },
                    "via": {
                      "type": "string",
                      "enum": [
                        "email",
                        "sms"
                      ],
                      "description": "Delivery channel"
                    },
                    "verified": {
                      "type": "boolean",
                      "default": false
                    },
                    "status": {
                      "type": "string",
                      "enum": [
                        "pending",
                        "sent",
                        "completed"
                      ]
                    }
                  },
                  "required": [
                    "value",
                    "via"
                  ],
                  "additionalProperties": false
                },
                "description": "Pre-verified (or pending) addresses"
              },
              "recoveryAddresses": {
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "value": {
                      "$ref": "#/properties/identities/items/properties/create/properties/verifiableAddresses/items/properties/value"
                    },
                    "via": {
                      "$ref": "#/properties/identities/items/properties/create/properties/verifiableAddresses/items/properties/via"
                    }
                  },
                  "required": [
                    "value",
                    "via"
                  ],
                  "additionalProperties": false
                },
                "description": "Recovery addresses"
              }
            },
            "required": [
              "schemaId",
              "traits"
            ],
            "additionalProperties": false,
            "description": "Identity to create (same fields as kratos_create_identity)"
          },
          "patchId": {
            "type": "string",
            "format": "uuid",
            "description": "Optional correlation ID (UUID), echoed back in the matching result"
          }
        },
        "required": [
          "create"
        ],
        "additionalProperties": false
      },
      "minItems": 1,
      "maxItems": 100,
      "description": "Identity patches to apply in order (1-100 items)"
    }
  },
  "required": [
    "identities"
  ],
  "additionalProperties": false,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

**Output schema (JSON Schema)**

```json
{
  "type": "object",
  "properties": {
    "results": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "action": {
            "type": "string",
            "enum": [
              "create",
              "error",
              "unknown"
            ]
          },
          "identity": {
            "type": "string"
          },
          "patchId": {
            "type": "string"
          },
          "error": {}
        },
        "required": [
          "action"
        ],
        "additionalProperties": false
      }
    },
    "summary": {
      "type": "object",
      "properties": {
        "total": {
          "type": "integer"
        },
        "succeeded": {
          "type": "integer"
        },
        "failed": {
          "type": "integer"
        }
      },
      "required": [
        "total",
        "succeeded",
        "failed"
      ],
      "additionalProperties": false
    }
  },
  "required": [
    "results",
    "summary"
  ],
  "additionalProperties": false,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

## `kratos_create_identity`

**Title**: Create identity  
**Annotations**: readOnlyHint=false, destructiveHint=false, idempotentHint=false, openWorldHint=false

**Description**

> Create a new identity with the given schema and traits. Optionally set metadata, external_id, organization, pre-verified addresses, and import existing credentials (password hash, OIDC/SAML links). Traits must match the schema. Example: {"schemaId": "default", "traits": {"email": "jane.doe@example.com"}}.

**Input schema (JSON Schema)**

```json
{
  "type": "object",
  "properties": {
    "schemaId": {
      "type": "string",
      "minLength": 1,
      "description": "Identity schema to use"
    },
    "traits": {
      "type": "object",
      "additionalProperties": {},
      "description": "Identity traits (must match schema)"
    },
    "state": {
      "type": "string",
      "enum": [
        "active",
        "inactive"
      ],
      "default": "active",
      "description": "Initial identity state"
    },
    "metadataPublic": {
      "type": "object",
      "additionalProperties": {},
      "description": "Public metadata"
    },
    "metadataAdmin": {
      "type": "object",
      "additionalProperties": {},
      "description": "Admin-only metadata"
    },
    "externalId": {
      "type": "string",
      "description": "External system ID (unique across identities)"
    },
    "organizationId": {
      "type": "string",
      "format": "uuid",
      "description": "Organization to place the identity in"
    },
    "credentials": {
      "type": "object",
      "properties": {
        "password": {
          "type": "object",
          "properties": {
            "config": {
              "type": "object",
              "properties": {
                "password": {
                  "type": "string",
                  "description": "Plaintext password (hashed by Kratos)"
                },
                "hashed_password": {
                  "type": "string",
                  "description": "Pre-hashed password (bcrypt, argon2id, pbkdf2, scrypt, md5, ...)"
                },
                "use_password_migration_hook": {
                  "type": "boolean"
                }
              },
              "additionalProperties": false
            }
          },
          "required": [
            "config"
          ],
          "additionalProperties": false
        },
        "oidc": {
          "type": "object",
          "properties": {
            "config": {
              "type": "object",
              "properties": {
                "providers": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "provider": {
                        "type": "string",
                        "description": "OIDC provider ID as configured in Kratos"
                      },
                      "subject": {
                        "type": "string",
                        "description": "Subject at the provider"
                      },
                      "organization": {
                        "type": "string"
                      },
                      "use_auto_link": {
                        "type": "boolean"
                      }
                    },
                    "required": [
                      "provider",
                      "subject"
                    ],
                    "additionalProperties": false
                  }
                }
              },
              "required": [
                "providers"
              ],
              "additionalProperties": false
            }
          },
          "required": [
            "config"
          ],
          "additionalProperties": false
        },
        "saml": {
          "type": "object",
          "properties": {
            "config": {
              "type": "object",
              "properties": {
                "providers": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "provider": {
                        "type": "string"
                      },
                      "subject": {
                        "type": "string"
                      },
                      "organization": {
                        "type": "string"
                      }
                    },
                    "required": [
                      "provider",
                      "subject"
                    ],
                    "additionalProperties": false
                  }
                }
              },
              "required": [
                "providers"
              ],
              "additionalProperties": false
            }
          },
          "required": [
            "config"
          ],
          "additionalProperties": false
        }
      },
      "additionalProperties": false,
      "description": "Existing credentials to import with the identity"
    },
    "verifiableAddresses": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "value": {
            "type": "string",
            "description": "Email address or phone number"
          },
          "via": {
            "type": "string",
            "enum": [
              "email",
              "sms"
            ],
            "description": "Delivery channel"
          },
          "verified": {
            "type": "boolean",
            "default": false
          },
          "status": {
            "type": "string",
            "enum": [
              "pending",
              "sent",
              "completed"
            ]
          }
        },
        "required": [
          "value",
          "via"
        ],
        "additionalProperties": false
      },
      "description": "Pre-verified (or pending) addresses"
    },
    "recoveryAddresses": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "value": {
            "$ref": "#/properties/verifiableAddresses/items/properties/value"
          },
          "via": {
            "$ref": "#/properties/verifiableAddresses/items/properties/via"
          }
        },
        "required": [
          "value",
          "via"
        ],
        "additionalProperties": false
      },
      "description": "Recovery addresses"
    }
  },
  "required": [
    "schemaId",
    "traits"
  ],
  "additionalProperties": false,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

**Output schema (JSON Schema)**

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string"
    },
    "schema_id": {
      "type": "string"
    },
    "state": {
      "type": "string"
    },
    "traits": {},
    "external_id": {
      "type": [
        "string",
        "null"
      ]
    },
    "created_at": {
      "type": "string"
    },
    "updated_at": {
      "type": "string"
    }
  },
  "required": [
    "id"
  ],
  "additionalProperties": true,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

## `kratos_delete_identity`

**Title**: Delete identity  
**Annotations**: readOnlyHint=false, destructiveHint=true, idempotentHint=true, openWorldHint=false

**Description**

> Permanently delete an identity together with its credentials, sessions, and addresses. This cannot be undone; consider kratos_set_identity_state with state=inactive to suspend instead. Example: {"id": "9f8d7c6b-5a49-4838-9271-605948372615"}.

**Input schema (JSON Schema)**

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "Identity UUID"
    }
  },
  "required": [
    "id"
  ],
  "additionalProperties": false,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

**Output schema (JSON Schema)**

```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "const": true
    },
    "message": {
      "type": "string"
    },
    "cancelled": {
      "type": "boolean",
      "const": true
    }
  },
  "additionalProperties": true,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

## `kratos_delete_identity_credential`

**Title**: Delete identity credential  
**Annotations**: readOnlyHint=false, destructiveHint=true, idempotentHint=true, openWorldHint=false

**Description**

> Remove one credential type from an identity (e.g. reset TOTP, WebAuthn, passkey, or lookup secrets while keeping the password). For oidc/saml pass identifier='<provider>:<subject>' to unlink a single provider. The credential is gone permanently; the user must re-enrol.

**Input schema (JSON Schema)**

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "Identity UUID"
    },
    "type": {
      "type": "string",
      "enum": [
        "password",
        "oidc",
        "totp",
        "webauthn",
        "lookup_secret",
        "passkey",
        "code",
        "profile",
        "saml",
        "link_recovery",
        "code_recovery"
      ],
      "description": "Credential type to delete"
    },
    "identifier": {
      "type": "string",
      "description": "For oidc/saml: which linked provider to unlink, formatted as '<provider>:<subject>' (see kratos_get_identity with includeCredential=['oidc'])"
    }
  },
  "required": [
    "id",
    "type"
  ],
  "additionalProperties": false,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

**Output schema (JSON Schema)**

```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "const": true
    },
    "message": {
      "type": "string"
    },
    "cancelled": {
      "type": "boolean",
      "const": true
    }
  },
  "additionalProperties": true,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

## `kratos_get_identity`

**Title**: Get identity  
**Annotations**: readOnlyHint=true, destructiveHint=—, idempotentHint=true, openWorldHint=false

**Description**

> Get a single identity by ID. Use includeCredential (e.g. ['oidc', 'password']) to see which credentials are linked; secret config is redacted unless KRATOS_ALLOW_CREDENTIAL_EXPOSURE is set.

**Input schema (JSON Schema)**

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "Identity UUID"
    },
    "includeCredential": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": [
          "password",
          "oidc",
          "totp",
          "webauthn",
          "lookup_secret",
          "passkey",
          "code",
          "profile",
          "saml",
          "link_recovery",
          "code_recovery"
        ]
      },
      "description": "Credential types to include, e.g. ['oidc']. Secret config is redacted unless KRATOS_ALLOW_CREDENTIAL_EXPOSURE is set"
    },
    "includeCredentials": {
      "type": "boolean",
      "description": "Deprecated: include all credential types. Prefer includeCredential"
    }
  },
  "required": [
    "id"
  ],
  "additionalProperties": false,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

**Output schema (JSON Schema)**

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string"
    },
    "schema_id": {
      "type": "string"
    },
    "state": {
      "type": "string"
    },
    "traits": {},
    "external_id": {
      "type": [
        "string",
        "null"
      ]
    },
    "created_at": {
      "type": "string"
    },
    "updated_at": {
      "type": "string"
    }
  },
  "required": [
    "id"
  ],
  "additionalProperties": true,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

## `kratos_get_identity_by_external_id`

**Title**: Get identity by external ID  
**Annotations**: readOnlyHint=true, destructiveHint=—, idempotentHint=true, openWorldHint=false

**Description**

> Look up an identity by its external_id field (exact match, requires Kratos 25.4.0+). The external_id links an identity to a record in an external system and is unique across all identities. Returns a structured NOT_FOUND error if no identity has the given external_id. Example: {"externalId": "crm-12345"}.

**Input schema (JSON Schema)**

```json
{
  "type": "object",
  "properties": {
    "externalId": {
      "type": "string",
      "minLength": 1,
      "description": "The identity's external_id field value (exact match, Kratos 25.4.0+)"
    }
  },
  "required": [
    "externalId"
  ],
  "additionalProperties": false,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

**Output schema (JSON Schema)**

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string"
    },
    "schema_id": {
      "type": "string"
    },
    "state": {
      "type": "string"
    },
    "traits": {},
    "external_id": {
      "type": [
        "string",
        "null"
      ]
    },
    "created_at": {
      "type": "string"
    },
    "updated_at": {
      "type": "string"
    }
  },
  "required": [
    "id"
  ],
  "additionalProperties": true,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

## `kratos_get_identity_schema`

**Title**: Get identity schema  
**Annotations**: readOnlyHint=true, destructiveHint=—, idempotentHint=true, openWorldHint=false

**Description**

> Get the raw JSON Schema for an identity schema ID (e.g. 'default'). Use it to learn which traits are required and which are used as login identifiers.

**Input schema (JSON Schema)**

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "minLength": 1,
      "description": "Schema ID, e.g. 'default'"
    }
  },
  "required": [
    "id"
  ],
  "additionalProperties": false,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

**Output schema (JSON Schema)**

```json
{
  "type": "object",
  "properties": {},
  "additionalProperties": true,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

## `kratos_list_identities`

**Title**: List identities  
**Annotations**: readOnlyHint=true, destructiveHint=—, idempotentHint=true, openWorldHint=false

**Description**

> List identities with optional filtering by exact or similar credential identifier (e.g. email), ID list, or organization. Returns nextPageToken for pagination. Use includeCredential to also load linked credentials (secret config is redacted by default).

**Input schema (JSON Schema)**

```json
{
  "type": "object",
  "properties": {
    "pageSize": {
      "type": "integer",
      "minimum": 1,
      "maximum": 100,
      "default": 20,
      "description": "Number of items per page (1-100, default 20)"
    },
    "pageToken": {
      "type": "string",
      "description": "Cursor from a previous response's nextPageToken"
    },
    "credentialsIdentifier": {
      "type": "string",
      "description": "Exact credential identifier match (e.g. email or username)"
    },
    "previewCredentialsIdentifierSimilar": {
      "type": "string",
      "description": "Fuzzy/partial credential identifier match (Kratos preview feature)"
    },
    "ids": {
      "type": "array",
      "items": {
        "type": "string",
        "format": "uuid"
      },
      "maxItems": 500,
      "description": "Only return identities with these IDs"
    },
    "organizationId": {
      "type": "string",
      "format": "uuid",
      "description": "Only return identities in this organization"
    },
    "includeCredential": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": [
          "password",
          "oidc",
          "totp",
          "webauthn",
          "lookup_secret",
          "passkey",
          "code",
          "profile",
          "saml",
          "link_recovery",
          "code_recovery"
        ]
      },
      "description": "Credential types to include (metadata only unless KRATOS_ALLOW_CREDENTIAL_EXPOSURE is set)"
    },
    "consistency": {
      "type": "string",
      "enum": [
        "strong",
        "eventual"
      ],
      "description": "Read consistency (eventual is faster on large deployments)"
    }
  },
  "additionalProperties": false,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

**Output schema (JSON Schema)**

```json
{
  "type": "object",
  "properties": {
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "schema_id": {
            "type": "string"
          },
          "state": {
            "type": "string"
          },
          "traits": {},
          "external_id": {
            "type": [
              "string",
              "null"
            ]
          },
          "created_at": {
            "type": "string"
          },
          "updated_at": {
            "type": "string"
          }
        },
        "required": [
          "id"
        ],
        "additionalProperties": true
      }
    },
    "count": {
      "type": "integer",
      "description": "Items in this page"
    },
    "nextPageToken": {
      "type": "string",
      "description": "Cursor for the next page; absent on the last page"
    }
  },
  "required": [
    "items",
    "count"
  ],
  "additionalProperties": false,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

## `kratos_list_identity_schemas`

**Title**: List identity schemas  
**Annotations**: readOnlyHint=true, destructiveHint=—, idempotentHint=true, openWorldHint=false

**Description**

> List the identity schemas configured in Kratos (ID plus JSON Schema). Use this to discover valid schemaId values and required traits before creating identities. Example: {}.

**Input schema (JSON Schema)**

```json
{
  "type": "object",
  "properties": {
    "pageSize": {
      "type": "integer",
      "minimum": 1,
      "maximum": 100,
      "default": 20,
      "description": "Number of items per page (1-100, default 20)"
    },
    "pageToken": {
      "type": "string",
      "description": "Cursor from a previous response's nextPageToken"
    }
  },
  "additionalProperties": false,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

**Output schema (JSON Schema)**

```json
{
  "type": "object",
  "properties": {
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {},
        "additionalProperties": true
      }
    },
    "count": {
      "type": "integer",
      "description": "Items in this page"
    },
    "nextPageToken": {
      "type": "string",
      "description": "Cursor for the next page; absent on the last page"
    }
  },
  "required": [
    "items",
    "count"
  ],
  "additionalProperties": false,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

## `kratos_patch_identity`

**Title**: Patch identity  
**Annotations**: readOnlyHint=false, destructiveHint=true, idempotentHint=false, openWorldHint=false

**Description**

> Partially update an identity with JSON Patch operations (add/remove/replace on paths like /traits/email, /state, /metadata_admin/role). Use this to change specific fields without replacing the whole identity. Example: {"id": "9f8d7c6b-5a49-4838-9271-605948372615", "patch": [{"op": "replace", "path": "/traits/email", "value": "jane.doe@example.com"}]}.

**Input schema (JSON Schema)**

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "Identity UUID"
    },
    "patch": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "op": {
            "type": "string",
            "enum": [
              "add",
              "remove",
              "replace"
            ],
            "description": "Patch operation"
          },
          "path": {
            "type": "string",
            "description": "JSON path to modify"
          },
          "value": {
            "description": "Value for add/replace"
          }
        },
        "required": [
          "op",
          "path"
        ],
        "additionalProperties": false
      },
      "minItems": 1,
      "description": "JSON Patch operations"
    }
  },
  "required": [
    "id",
    "patch"
  ],
  "additionalProperties": false,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

**Output schema (JSON Schema)**

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string"
    },
    "schema_id": {
      "type": "string"
    },
    "state": {
      "type": "string"
    },
    "traits": {},
    "external_id": {
      "type": [
        "string",
        "null"
      ]
    },
    "created_at": {
      "type": "string"
    },
    "updated_at": {
      "type": "string"
    },
    "cancelled": {
      "type": "boolean",
      "const": true
    },
    "message": {
      "type": "string"
    }
  },
  "additionalProperties": true,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

## `kratos_set_identity_state`

**Title**: Set identity state  
**Annotations**: readOnlyHint=false, destructiveHint=true, idempotentHint=true, openWorldHint=false

**Description**

> Activate or suspend (inactive) an identity. An inactive identity cannot log in. Set revokeSessions to also delete all of its sessions, logging it out everywhere immediately (session deletion is irreversible). Example: {"id": "9f8d7c6b-5a49-4838-9271-605948372615", "state": "inactive"}.

**Input schema (JSON Schema)**

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "Identity UUID"
    },
    "state": {
      "type": "string",
      "enum": [
        "active",
        "inactive"
      ],
      "description": "New state (inactive = suspended)"
    },
    "revokeSessions": {
      "type": "boolean",
      "default": false,
      "description": "Also delete all of the identity's sessions (log out everywhere)"
    }
  },
  "required": [
    "id",
    "state"
  ],
  "additionalProperties": false,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

**Output schema (JSON Schema)**

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string"
    },
    "state": {
      "type": "string"
    },
    "sessionsRevoked": {
      "type": "boolean",
      "description": "True when sessions existed and were deleted; false when there were none"
    },
    "cancelled": {
      "type": "boolean",
      "const": true
    },
    "message": {
      "type": "string"
    }
  },
  "additionalProperties": true,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

## `kratos_update_identity`

**Title**: Update identity (full replace)  
**Annotations**: readOnlyHint=false, destructiveHint=true, idempotentHint=true, openWorldHint=false

**Description**

> Replace an identity's schema, traits, state, and metadata (PUT semantics). WARNING: fields you omit are cleared - omitting metadataPublic or metadataAdmin removes the existing metadata. Prefer kratos_patch_identity to change individual fields. Example: {"id": "9f8d7c6b-5a49-4838-9271-605948372615", "schemaId": "default", "traits": {"email": "jane.doe@example.com"}, "state": "active"}.

**Input schema (JSON Schema)**

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "Identity UUID"
    },
    "schemaId": {
      "type": "string",
      "minLength": 1,
      "description": "Identity schema"
    },
    "traits": {
      "type": "object",
      "additionalProperties": {},
      "description": "Updated traits (full replacement)"
    },
    "state": {
      "type": "string",
      "enum": [
        "active",
        "inactive"
      ],
      "description": "Identity state"
    },
    "metadataPublic": {
      "type": "object",
      "additionalProperties": {},
      "description": "Public metadata; omitting it clears existing public metadata"
    },
    "metadataAdmin": {
      "type": "object",
      "additionalProperties": {},
      "description": "Admin metadata; omitting it clears existing admin metadata"
    },
    "externalId": {
      "type": "string"
    },
    "credentials": {
      "type": "object",
      "properties": {
        "password": {
          "type": "object",
          "properties": {
            "config": {
              "type": "object",
              "properties": {
                "password": {
                  "type": "string",
                  "description": "Plaintext password (hashed by Kratos)"
                },
                "hashed_password": {
                  "type": "string",
                  "description": "Pre-hashed password (bcrypt, argon2id, pbkdf2, scrypt, md5, ...)"
                },
                "use_password_migration_hook": {
                  "type": "boolean"
                }
              },
              "additionalProperties": false
            }
          },
          "required": [
            "config"
          ],
          "additionalProperties": false
        },
        "oidc": {
          "type": "object",
          "properties": {
            "config": {
              "type": "object",
              "properties": {
                "providers": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "provider": {
                        "type": "string",
                        "description": "OIDC provider ID as configured in Kratos"
                      },
                      "subject": {
                        "type": "string",
                        "description": "Subject at the provider"
                      },
                      "organization": {
                        "type": "string"
                      },
                      "use_auto_link": {
                        "type": "boolean"
                      }
                    },
                    "required": [
                      "provider",
                      "subject"
                    ],
                    "additionalProperties": false
                  }
                }
              },
              "required": [
                "providers"
              ],
              "additionalProperties": false
            }
          },
          "required": [
            "config"
          ],
          "additionalProperties": false
        },
        "saml": {
          "type": "object",
          "properties": {
            "config": {
              "type": "object",
              "properties": {
                "providers": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "provider": {
                        "type": "string"
                      },
                      "subject": {
                        "type": "string"
                      },
                      "organization": {
                        "type": "string"
                      }
                    },
                    "required": [
                      "provider",
                      "subject"
                    ],
                    "additionalProperties": false
                  }
                }
              },
              "required": [
                "providers"
              ],
              "additionalProperties": false
            }
          },
          "required": [
            "config"
          ],
          "additionalProperties": false
        }
      },
      "additionalProperties": false,
      "description": "Existing credentials to import with the identity"
    }
  },
  "required": [
    "id",
    "schemaId",
    "traits",
    "state"
  ],
  "additionalProperties": false,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

**Output schema (JSON Schema)**

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string"
    },
    "schema_id": {
      "type": "string"
    },
    "state": {
      "type": "string"
    },
    "traits": {},
    "external_id": {
      "type": [
        "string",
        "null"
      ]
    },
    "created_at": {
      "type": "string"
    },
    "updated_at": {
      "type": "string"
    },
    "cancelled": {
      "type": "boolean",
      "const": true
    },
    "message": {
      "type": "string"
    }
  },
  "additionalProperties": true,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```
