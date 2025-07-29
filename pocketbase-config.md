# PocketBase Configuration

## Connection Details
- **PocketHost URL**: https://pinkmilk.pockethost.io
- **Collection**: ranking
- **Environment Variable**: NEXT_PUBLIC_POCKETBASE_URL

## Collection Schema (ranking)
- `showname` (Text) - Name of the show/event
- `city` (Text) - Location/city
- `nr_players` (Number) - Number of players
- `nr_teams` (Number) - Number of teams
- `playernames` (Text) - Comma-separated player names
- System fields: `id`, `created`, `updated`

## Environment Setup
To override the default PocketHost URL, create a `.env.local` file:
```
NEXT_PUBLIC_POCKETBASE_URL=https://pinkmilk.pockethost.io
```

## API Endpoints Used
- `GET /api/collections/ranking/records` - List all sessions
- `POST /api/collections/ranking/records` - Create new session
- `PATCH /api/collections/ranking/records/{id}` - Update session
- `DELETE /api/collections/ranking/records/{id}` - Delete session

## CORS Configuration
PocketHost should automatically handle CORS for web applications. If you encounter CORS issues, check your PocketHost dashboard settings.

## Testing Connection
The application will attempt to connect to PocketHost when:
1. Loading the presenter dashboard (`/presenter`)
2. Creating a new ranking session
3. Searching existing sessions

## Troubleshooting
- Ensure your PocketHost instance is active
- Check that the `ranking` collection exists with the correct schema
- Verify CORS settings allow requests from your domain
- Check browser console for detailed error messages
