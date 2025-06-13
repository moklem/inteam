# Recurring Events Feature Documentation

## Overview
The volleyball app now supports recurring events, allowing coaches to create training sessions or games that repeat on a regular schedule. This feature helps streamline the process of scheduling regular team activities.

## Implementation Details

### Backend Changes

#### 1. Event Model (`server/models/Event.js`)
Added new fields to support recurring events:
- `isRecurring`: Boolean flag indicating if this is a recurring event
- `recurringPattern`: Enum field with values ['weekly', 'biweekly', 'monthly']
- `recurringEndDate`: Date when the recurring series should end
- `recurringGroupId`: Reference to the parent event in a recurring series
- `isRecurringInstance`: Boolean flag for individual instances of a recurring event
- `originalStartTime`: Stores the original start time for recurring instances

#### 2. Event Routes (`server/routes/eventRoutes.js`)
- **POST /api/events**: Enhanced to handle recurring event creation
  - Generates multiple event instances based on the recurring pattern
  - Creates a parent event and linked instances
- **PUT /api/events/:id**: Enhanced to support updating all events in a series
  - Added `updateRecurring` parameter to update all instances
- **DELETE /api/events/:id**: Enhanced to support deleting all events in a series
  - Added `deleteRecurring` query parameter

### Frontend Changes

#### 1. Event Context (`client/src/context/EventContext.js`)
- Updated `createEvent` to handle the response for recurring events
- Updated `updateEvent` to support updating recurring series
- Updated `deleteEvent` to support deleting recurring series
- Added `getRecurringEvents` function to retrieve all events in a series

#### 2. Create Event Page (`client/src/pages/coach/CreateEvent.js`)
Added UI elements for recurring events:
- Toggle switch to enable recurring events
- Dropdown to select recurring pattern (weekly, biweekly, monthly)
- Date picker for recurring end date
- Validation for recurring event fields

#### 3. Edit Event Page (`client/src/pages/coach/EditEvent.js`)
- Added detection for recurring events
- Toggle to apply changes to all events in the series
- Disabled date/time editing when updating entire series
- Clear messaging about recurring event status

#### 4. Events List Page (`client/src/pages/coach/Events.js`)
- Added visual indicators for recurring events
- Chips showing "Serie" for parent events and "Serientermin" for instances
- Option to delete single event or entire series
- Tooltips explaining recurring event status

## Usage

### Creating Recurring Events
1. Navigate to "Create Event" page
2. Fill in event details as usual
3. Toggle "Termin wiederholt sich regelmäßig" switch
4. Select recurring pattern:
   - **Wöchentlich**: Event repeats every week
   - **Alle zwei Wochen**: Event repeats every two weeks
   - **Monatlich**: Event repeats monthly on the same day
5. Select end date for the recurring series
6. Click "Termine erstellen" to create all instances

### Editing Recurring Events
1. Open any event from a recurring series
2. You'll see an info box indicating it's part of a series
3. Toggle "Änderungen auf alle Termine der Serie anwenden" to update all instances
4. Make your changes and save

### Deleting Recurring Events
1. In the events list, click delete on any recurring event
2. You'll see an option to "Alle Termine der Serie löschen"
3. Check the box to delete all instances, or leave unchecked to delete only one

## Technical Notes

### Compatibility
- The feature uses existing packages (date-fns, MUI components)
- No new dependencies were added
- Backward compatible with existing single events

### Performance Considerations
- Recurring events are created as individual database entries
- This allows for flexibility in modifying individual instances
- Events are linked via `recurringGroupId` for efficient querying

### Limitations
- Maximum recurring period depends on the end date selected
- Time changes when updating series apply the same time to all instances
- Cannot change the recurring pattern after creation

## Future Enhancements
Potential improvements for the future:
1. Support for more complex recurring patterns (e.g., every first Monday)
2. Ability to exclude specific dates from a series
3. Option to modify recurring pattern after creation
4. Bulk operations on recurring events
5. Calendar view to visualize recurring events

## API Examples

### Creating a Recurring Event
```javascript
POST /api/events
{
  "title": "Weekly Training",
  "type": "Training",
  "startTime": "2025-06-01T18:00:00",
  "endTime": "2025-06-01T20:00:00",
  "location": "Sports Hall",
  "team": "teamId",
  "isRecurring": true,
  "recurringPattern": "weekly",
  "recurringEndDate": "2025-08-31T23:59:59"
}
```

### Updating All Events in a Series
```javascript
PUT /api/events/:eventId
{
  "title": "Updated Training Title",
  "location": "New Sports Hall",
  "updateRecurring": true
}
```

### Deleting All Events in a Series
```javascript
DELETE /api/events/:eventId?deleteRecurring=true