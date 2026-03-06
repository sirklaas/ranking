/**
 * TeamX Teams Display System
 * Modern implementation with real-time updates
 */

class TeamXDisplay {
    constructor() {
        this.pb = new PocketBase(CONFIG.PB_URL);
        this.gameRecord = null;
        this.currentGameId = null;
        this.playersByTeam = {};
        this.autoRefreshInterval = null;
        this.isFullscreen = false;

        this.initializeElements();
        this.initialize();
        this.setupKeyboardShortcuts();
    }

    initializeElements() {
        this.elements = {
            showName: document.getElementById('showName'),
            teamsContainer: document.getElementById('teamsContainer'),
            statusDot: document.querySelector('.status-dot'),
            statusText: document.querySelector('.status-text'),
            fullscreenHint: document.querySelector('.fullscreen-hint')
        };
    }

    async initialize() {
        try {
            this.showLoading(true);
            await this.authenticatePocketBase();
            await this.loadGameData();
            await this.loadAndDisplayTeams();
            this.setupRealtimeUpdates();
            this.setupAutoRefresh();
            this.setStatus('live');
        } catch (error) {
            console.error('Initialization failed:', error);
            this.showError('Kan geen verbinding maken met de database');
            this.setStatus('error');
        } finally {
            this.showLoading(false);
        }
    }

    async authenticatePocketBase() {
        try {
            console.log('Authenticating with PocketBase...');
            await this.pb.admins.authWithPassword(CONFIG.ADMIN_EMAIL, CONFIG.ADMIN_PASSWORD);
            console.log('Authentication successful');
        } catch (error) {
            console.error('Authentication failed:', error);
            throw new Error('Authentication failed');
        }
    }

    async loadGameData() {
        try {
            console.log('Loading game data...');

            // First try: Get shows with priority 1, sorted by date (earliest first)
            let records = await this.pb.collection(CONFIG.COLLECTION_TEAMS).getFullList({
                filter: 'priority = 1 && teamnumber > 0',
                sort: 'datum',
                $autoCancel: false
            });

            console.log('Priority 1 records found:', records.length);

            // Fallback: If no priority 1 shows, try priority 2
            if (records.length === 0) {
                console.log('No priority 1 shows, trying priority 2...');
                records = await this.pb.collection(CONFIG.COLLECTION_TEAMS).getFullList({
                    filter: 'priority = 2 && teamnumber > 0',
                    sort: 'datum',
                    $autoCancel: false
                });
                console.log('Priority 2 records found:', records.length);
            }

            if (records.length === 0) {
                throw new Error('No active game found with priority 1 or 2');
            }

            // Take the first record (earliest date)
            this.gameRecord = records[0];
            this.currentGameId = this.gameRecord.id;

            // Update UI
            this.elements.showName.textContent = this.gameRecord.show || 'Team Overview';

            // Set CSS variable for team count
            this.setTeamCountCSS(this.gameRecord.teamnumber);

            console.log('Game loaded:', this.gameRecord.show);
            console.log('Show date:', this.gameRecord.datum);
            console.log('Priority:', this.gameRecord.priority);
            console.log('Number of teams:', this.gameRecord.teamnumber);
        } catch (error) {
            console.error('Error loading game data:', error);
            this.elements.showName.textContent = 'Geen actieve quiz gevonden (zet priority op 1 of 2)';
            throw error;
        }
    }

    setTeamCountCSS(teamCount) {
        document.documentElement.style.setProperty('--team-count', teamCount);
    }

    async loadAndDisplayTeams() {
        // Prevent multiple simultaneous loads
        if (this.isLoading) {
            console.log('Already loading, skipping...');
            return;
        }

        try {
            this.isLoading = true;
            const players = await this.loadPlayers();
            console.log('Players loaded:', players.map(p => `${p.naam}(${p.playernr})`).join(', '));
            this.playersByTeam = this.organizePlayersByTeam(players);
            this.updateDisplay();
        } catch (error) {
            console.error('Error loading teams:', error);
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    async loadPlayers() {
        try {
            console.log('Loading players for game:', this.currentGameId);

            // Get playerData from show record
            const currentShow = await this.pb.collection(CONFIG.COLLECTION_TEAMS).getOne(this.currentGameId, {
                $autoCancel: false
            });

            const players = currentShow.playerData || [];
            console.log(`Found ${players.length} players in playerData`);
            return players;
        } catch (error) {
            console.error('Error loading players:', error);
            return [];
        }
    }

    organizePlayersByTeam(players) {
        const teamData = {};

        players.forEach(player => {
            const teamNumber = player.teamnr;
            if (!teamData[teamNumber]) {
                teamData[teamNumber] = [];
            }
            teamData[teamNumber].push(player);
        });

        // Sort players within each team by player number
        Object.keys(teamData).forEach(team => {
            teamData[team].sort((a, b) => {
                return (parseInt(a.playernr) || 999) - (parseInt(b.playernr) || 999);
            });
        });

        return teamData;
    }

    updateDisplay() {
        if (!this.gameRecord) {
            console.error('No game record to display');
            return;
        }

        const container = this.elements.teamsContainer;
        const existingColumns = container.querySelectorAll('.team-column');

        // Clear container if team count changed
        if (existingColumns.length !== this.gameRecord.teamnumber) {
            container.innerHTML = '';
        }

        // Create or update team columns
        for (let i = 1; i <= this.gameRecord.teamnumber; i++) {
            const teamPlayers = this.playersByTeam[i] || [];
            let column = container.querySelector(`[data-team="${i}"]`);

            if (!column) {
                column = this.createTeamColumn(i, teamPlayers);
                container.appendChild(column);
            } else {
                this.updateTeamColumn(column, i, teamPlayers);
            }
        }

        console.log('Display updated');
    }

    createTeamColumn(teamNumber, teamPlayers) {
        const column = document.createElement('div');
        column.className = 'team-column';
        column.setAttribute('data-team', teamNumber);

        // Create team circle
        const circle = document.createElement('div');
        circle.className = 'team-circle';
        circle.textContent = teamNumber;

        // Create players container
        const playersContainer = document.createElement('div');
        playersContainer.className = 'team-numbers';

        // Add players
        teamPlayers.forEach(player => {
            const slot = this.createPlayerSlot(player);
            playersContainer.appendChild(slot);
        });

        column.appendChild(circle);
        column.appendChild(playersContainer);

        return column;
    }

    updateTeamColumn(column, teamNumber, teamPlayers) {
        const playersContainer = column.querySelector('.team-numbers');
        const existingSlots = playersContainer.querySelectorAll('.team-slot');

        // Get existing player numbers
        const existingNumbers = new Set(
            Array.from(existingSlots).map(slot => slot.dataset.playerNumber)
        );

        // Get new player numbers
        const newNumbers = new Set(teamPlayers.map(p => String(p.playernr)));

        // Remove players that are no longer in this team
        existingSlots.forEach(slot => {
            if (!newNumbers.has(slot.dataset.playerNumber)) {
                slot.remove();
            }
        });

        // Add or update players
        teamPlayers.forEach((player, index) => {
            let slot = playersContainer.querySelector(`[data-player-number="${player.playernr}"]`);

            if (!slot) {
                slot = this.createPlayerSlot(player);
                slot.classList.add('new-player');

                // Insert at correct position
                if (index < playersContainer.children.length) {
                    playersContainer.insertBefore(slot, playersContainer.children[index]);
                } else {
                    playersContainer.appendChild(slot);
                }

                // Remove animation class after animation completes
                setTimeout(() => {
                    slot.classList.remove('new-player');
                }, 600);
            } else {
                // Update existing slot if needed
                const nameSpan = slot.querySelector('.player-name');
                if (nameSpan && nameSpan.textContent !== player.naam) {
                    nameSpan.textContent = player.naam;
                }
            }
        });
    }

    createPlayerSlot(player) {
        const slot = document.createElement('div');
        slot.className = 'team-slot';
        slot.dataset.playerNumber = player.playernr;

        // Player number
        const numberSpan = document.createElement('span');
        numberSpan.className = 'player-number';
        numberSpan.textContent = player.playernr;

        // Player name
        const nameSpan = document.createElement('span');
        nameSpan.className = 'player-name';
        nameSpan.textContent = player.naam;

        slot.appendChild(numberSpan);
        slot.appendChild(nameSpan);

        return slot;
    }

    setupRealtimeUpdates() {
        try {
            console.log('Setting up real-time updates...');

            // Unsubscribe from any existing subscriptions
            this.pb.collection(CONFIG.COLLECTION_TEAMS).unsubscribe();

            // Subscribe to teamx collection updates (playerData changes)
            this.pb.collection(CONFIG.COLLECTION_TEAMS).subscribe(this.currentGameId, async (e) => {
                console.log('Real-time event:', e.action);
                console.log('Event playerData length:', e.record?.playerData?.length || 0);

                // Reload when playerData is updated
                if (['update'].includes(e.action)) {
                    // Add delay to ensure database write is fully committed
                    setTimeout(async () => {
                        console.log('Reloading after realtime event...');
                        await this.loadAndDisplayTeams();
                        this.flashStatus();
                    }, 2000);
                }
            });

            console.log('Real-time updates configured');
        } catch (error) {
            console.error('Error setting up real-time updates:', error);
        }
    }

    setupAutoRefresh() {
        // Disabled - using realtime updates instead
        // Auto-refresh was causing race conditions with playerData reads
        console.log('Auto-refresh disabled - using realtime updates only');
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // F key for fullscreen
            if (e.key === 'f' || e.key === 'F') {
                e.preventDefault();
                this.toggleFullscreen();
            }

            // Spacebar for manual refresh
            if (e.key === ' ') {
                e.preventDefault();
                console.log('Manual refresh triggered');
                this.loadAndDisplayTeams();
            }

            // R key for manual refresh
            if (e.key === 'r' || e.key === 'R') {
                if (!e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    this.manualRefresh();
                }
            }

            // ESC to exit fullscreen (browser handles this)
        });
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => {
                this.isFullscreen = true;
                this.elements.fullscreenHint.style.display = 'none';
            }).catch(err => {
                console.error('Error entering fullscreen:', err);
            });
        } else {
            document.exitFullscreen().then(() => {
                this.isFullscreen = false;
                this.elements.fullscreenHint.style.display = 'block';
            }).catch(err => {
                console.error('Error exiting fullscreen:', err);
            });
        }
    }

    async manualRefresh() {
        console.log('Manual refresh triggered');
        this.flashStatus('refreshing');
        await this.loadAndDisplayTeams();
        this.flashStatus();
    }

    setStatus(status) {
        const statusDot = this.elements.statusDot;
        const statusText = this.elements.statusText;

        switch (status) {
            case 'live':
                statusDot.style.background = '#00ff00';
                statusDot.style.boxShadow = '0 0 10px rgba(0, 255, 0, 0.5)';
                statusText.textContent = 'Live';
                break;
            case 'refreshing':
                statusDot.style.background = '#ffaa00';
                statusDot.style.boxShadow = '0 0 10px rgba(255, 170, 0, 0.5)';
                statusText.textContent = 'Vernieuwen...';
                break;
            case 'error':
                statusDot.style.background = '#ff0000';
                statusDot.style.boxShadow = '0 0 10px rgba(255, 0, 0, 0.5)';
                statusText.textContent = 'Offline';
                break;
        }
    }

    flashStatus(status = 'live') {
        this.setStatus(status);
        if (status === 'live') {
            // Flash effect for updates
            const dot = this.elements.statusDot;
            dot.style.animation = 'none';
            setTimeout(() => {
                dot.style.animation = 'pulse 2s infinite';
            }, 10);
        }
    }

    showLoading(show) {
        if (show) {
            this.elements.teamsContainer.innerHTML = '<div class="loading">Teams laden...</div>';
        }
    }

    showError(message) {
        this.elements.teamsContainer.innerHTML = `
            <div style="text-align: center; padding: 4rem; color: white; font-size: 1.5rem;">
                <p style="margin-bottom: 1rem;">❌</p>
                <p>${message}</p>
            </div>
        `;
    }

    // Cleanup on page unload
    destroy() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
        }
        this.pb.collection(CONFIG.COLLECTION_TEAMS).unsubscribe();
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const teamDisplay = new TeamXDisplay();

    // Cleanup on page unload
    window.addEventListener('unload', () => {
        teamDisplay.destroy();
    });
});
