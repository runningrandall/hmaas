# Versa Property Management API

> API for Versa Property Management Services

**Version:** 1.0.0 | **OpenAPI Spec:** [swagger.json](swagger.json)

## Servers

| Name | URL |
|------|-----|
| Production | `https://{apiId}.execute-api.{region}.amazonaws.com/prod` |
| Local Development | `http://localhost:3001` |

## Authentication

All endpoints require **bearer authentication** (`JWT`).

```
Authorization: Bearer <token>
```

## Endpoints

| Method | Path | Summary |
|--------|------|---------|

---

## Schemas

### ErrorResponse

```json
{
  "type": "object",
  "properties": {
    "error": {
      "type": "object",
      "properties": {
        "code": {
          "type": "string",
          "example": "NOT_FOUND"
        },
        "message": {
          "type": "string",
          "example": "Resource not found"
        },
        "details": {
          "nullable": true,
          "example": [
            {
              "path": "name",
              "message": "Required"
            }
          ]
        },
        "requestId": {
          "type": "string",
          "example": "abc-123-def"
        }
      },
      "required": [
        "code",
        "message"
      ]
    }
  },
  "required": [
    "error"
  ]
}
```

---

*Generated at 2026-02-27T06:12:41.422Z from OpenAPI spec.*