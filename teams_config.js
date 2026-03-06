/**
 * Configuration file for TeamX Teams Display
 * Shared configuration with teaminput and phone folders
 */

const CONFIG = {
    // PocketBase configuration
    PB_URL: 'https://pinkmilk.pockethost.io',
    
    // Collections
    COLLECTION_TEAMS: 'teamx',
    COLLECTION_PLAYERS: 'allplayers',
    
    // Admin credentials (for authentication)
    ADMIN_EMAIL: 'klaas@republick.nl',
    ADMIN_PASSWORD: 'biknu8-pyrnaB-mytvyx',
    
    // Priority for active show
    ACTIVE_PRIORITY: 5,
    
    // UI Configuration
    UI: {
        refreshInterval: 10000, // Backup refresh every 10 seconds
        animationDuration: 500,
        maxPlayersPerTeam: 20
    },
    
    // QR Code settings
    QR_CODE: {
        url: 'https://www.pinkmilk.eu/phone/',
        size: 400
    }
};
