# Position Statistics Feature

## Overview
Added position-based attendance statistics to the EventDetail page, showing a breakdown of attending players by their positions.

## Implementation Details

### Frontend Changes

#### EventDetail Component (`client/src/pages/coach/EventDetail.js`)
- Added `getPositionStatistics()` function to calculate position distribution
- Added new imports: `Card`, `CardContent`, and `SportsVolleyball` icon
- Created a new section after the main event details showing position statistics
- Each position is displayed in a card showing:
  - Position name
  - Number of players
  - Percentage of total attending players
- Added an info alert when not all invited players have responded
- Statistics only show when there are attending players

### Visual Design
- Uses Material-UI Card components for each position
- Grid layout responsive across different screen sizes (xs=12, sm=6, md=4)
- Shows percentage calculation for each position
- Sorted by count in descending order
- Handles players without positions as "Keine Position"

### User Experience
- Statistics section only appears when there are attending players
- Clear visual hierarchy with icons and typography
- Responsive design works on mobile and desktop
- Informative alert when statistics are based on partial responses

## Testing Scenarios
1. View event with no attending players - statistics section should not appear
2. View event with attending players having different positions
3. View event with some players having no position set
4. Check responsive layout on different screen sizes
5. Verify percentage calculations are correct

## Related Features
- Integrates with existing event management system
- Uses player position data from User model
- Works with both regular team players and guest players
- Compatible with recurring events feature