# KURT API Documentation

## Overview

The KURT API provides access to seat availability data from the KU Leuven reservation system. It returns real-time availability information for specified library seats on a given date.

## Endpoint

### Query Availability

Retrieves availability status for specified resource IDs on a given date.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `resourceIds` | Array of strings | Yes | List of resource IDs to query (e.g., `["300855", "300856"]`) |
| `date` | String | Yes | Date in YYYY-MM-DD format (e.g., `"2025-06-07"`) |
| `uid` | String | Yes | User ID in r-number/u-number/b-number format (e.g., `"r0123456"`) |

#### Request Example

```
Resource IDs: ["300855", "300856"]
Date: "2025-06-07"
User ID: "r0123456"
```

## Response Format

The API returns an object where each key is a resource ID and the value contains availability information:

```json
{
  "300855": {
    "timeslots": [
      {
        "resource_id": 300855,
        "date": "2025-06-07T15:00:00.000Z",
        "status": "B"
      }
    ],
    "hourlyStatus": {
      "0": "U",
      "1": "U",
      "2": "U",
      "15": "B",
      "19": "A",
      "23": "A"
    },
    "availableHours": ["19", "23"]
  }
}
```

### Response Object Properties

#### `timeslots`
- **Type**: Array of objects
- **Description**: Raw timeslot data from the reservation system
- **Properties**:
  - `resource_id`: Number - The resource ID
  - `date`: String - ISO datetime string
  - `status`: String - Status code ("A", "B", or "U")

#### `hourlyStatus`
- **Type**: Object
- **Description**: Hour-by-hour status map for easy lookup
- **Keys**: String numbers "0" through "23" representing hours
- **Values**: Status codes ("A", "B", or "U")
- **Note**: Hours without explicit timeslots default to "A" (available)

#### `availableHours`
- **Type**: Array of strings
- **Description**: List of hour strings where status is "A" (available)
- **Example**: `["8", "19", "23"]` means available at 8 AM, 7 PM, and 11 PM

## Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| `"A"` | Available | The resource is available for booking |
| `"B"` | Busy/Booked | The resource is already booked |
| `"U"` | Unavailable | The resource is unavailable (outside operating hours, etc.) |

## Error Handling

The API may return errors in the following cases:

- **Invalid parameters**: Empty or missing resource IDs, date, or user ID
- **Network errors**: Failed to connect to the reservation system
- **Authentication errors**: Invalid user ID or insufficient permissions
- **API errors**: Malformed response or server issues

Common error scenarios:
- Invalid user ID format
- Date outside allowed range
- Resource ID does not exist
- Network connectivity issues

## Resource IDs

Resource IDs can be found in the seat mapping files in the `seats/` directory:

- `agora.json` - Agora library seats
- `arenberg-main.json` - Arenberg main library seats
- `ldc-leeszaal.json` - LDC reading room seats
- ... and more

Each file maps resource IDs to human-readable seat names:

```json
{
  "300855": "Silent 102",
  "300856": "Silent 103"
}
```

## Data Notes

- The API returns data for a full 24-hour period starting from 00:00:00 on the specified date
- All timestamps in the response are in UTC ISO format
- The system operates on Belgian time (CET/CEST), consider timezone differences when displaying times
- Hours missing from `timeslots` (typically outside operating hours) default to "A" (available) in `hourlyStatus`
- Resource availability is updated in real-time from the KU Leuven reservation system