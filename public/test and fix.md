Investigation Report: Production Failure Analysis
Summary of Issues Reported
Top 3 did not work correctly
Top 10 did not work correctly
One player chose a name and ALL players had the same choice
Display showed "1/11 votes" and was stuck
Presenter could not do anything to fix it
Root Cause Analysis
CRITICAL BUG #1: Player Identity Collision
What happened: "One player chose a name and all players had the same choice"

Root cause identified in code:

page.tsx:395-398
typescript
playerInfo={{
  playerId: selectedPlayerName || `anon_${teamNumber}`,
  playerName: selectedPlayerName || 'Speler',
  teamNumber: parseInt(teamNumber) || 0,
}}
The problem: The playerId is set to the player's selected name. If a player hasn't selected their name yet (or their localStorage got corrupted), they become anon_1, anon_2, etc. based on team number.

But worse: If multiple players are on the same team and haven't completed onboarding, they ALL become the same playerId (e.g., anon_1). This means:

When player A votes, they're voting as anon_1
When player B (same team) votes, they're ALSO anon_1
The system sees this as a duplicate vote and ignores it
Evidence in vote API:

route.ts:52-54
typescript
const alreadyVoted = top3State.currentQuestion.votes.some(
    (v) => v.voterId === currentReq.voterId
);
If two players have the same voterId, only the first vote counts.

CRITICAL BUG #2: State Not Initialized Before Voting Started
The "1/11 votes" stuck issue:

For Top 3 and Top 10 to work, the top3_state and top10_state fields in PocketBase must be initialized with all player names before the presenter starts voting.

Current flow has a gap:

Presenter navigates to fase 10/05 (first Top 3 question)
Presenter presses "V" to start voting
The startVoting() function is called
BUT: If top3_state doesn't exist or allPlayerNames is empty, voting breaks
Check the initialization code:

logic.ts:11-15
typescript
export const getInitialState = (allPlayerNames: string[] = []): Top3State => ({
  currentFase: '',
  currentQuestion: createEmptyQuestion(0),
  allPlayerNames,
});
If allPlayerNames is never populated, the display shows 0 total players, and votes don't register properly.

CRITICAL BUG #3: Polling Delay (3 seconds)
page.tsx:320
typescript
const timer = setInterval(poll, 3000);
Players poll for updates every 3 seconds. This means:

When presenter starts voting, phones may not know for up to 3 seconds
When presenter shows results, some phones may still be in voting mode
This creates confusion and race conditions
CRITICAL BUG #4: No Validation That Onboarding Completed
The player page renders the module PlayerView even if the player hasn't completed onboarding:

page.tsx:376-402
The module is rendered if currentSession?.current_fase matches a module. It does not check:

Did the player select their team?
Did the player select their name?
Is selectedPlayerName actually set?
If someone refreshes their phone mid-show and localStorage is cleared, they get anon_X as their identity.

Why Testing Worked But Production Failed
Test Environment	Production
6 phones in iframes with hardcoded test names (TestSpeler1, etc.)	11 real phones using localStorage for identity
All on same computer = fast network	Real devices = variable network latency
URL params bypass localStorage issues	Real phones depend on localStorage persistence
Same browser = shared cache/state	Different browsers/devices = inconsistent state
The test-phones page uses URL parameters that bypass the localStorage-based identity system entirely:

page.tsx:26
typescript
src={`/player?testName=TestSpeler${i}&testTeam=${i}...`}
What Likely Happened During Your Show
Players opened their phones and went through onboarding (team + name selection)
Some players may have refreshed or had localStorage issues → became anon_X
Multiple players on same team became the same anon_X → only 1 vote counted per team
Presenter started voting but allPlayerNames in state was empty or stale
Display showed "1/11" because only 1 unique voterId successfully voted
Subsequent votes were rejected as duplicates
Presenter had no way to reset the voting state mid-game
Step-by-Step Flow: How Top 3 and Top 10 SHOULD Work
Top 3 Flow (Fases 10/05 → 10/13)
Phase 1: Trailer (10/01)
Display: Shows trailer video TrailerTop3.mp4
Phones: Show onboarding or waiting screen
Presenter: Nothing to do, video plays automatically
Phase 2: Presenter Advances to First Question (10/05)
Presenter: Clicks fase 10/05 in the fase navigator
PocketBase: current_fase field updated to 10/05
Display: Shows the question image + heading (e.g., "Wie wordt er echt heel erg snel verliefd")
Display: Shows "name wall" with ALL player names
Phones: Poll every 3 seconds, see fase changed to 10/05
Phones: Show Top3Player component with the question + image
State at this point: phase: 'intro', no voting active yet
Phase 3: Presenter Starts Voting
Presenter: Presses "V" key or clicks "Start Voting" button
Code: Calls top3Logic.startVoting(sessionId, state)
PocketBase: top3_state.currentQuestion.phase set to 'voting'
PocketBase: top3_state.currentQuestion.votes cleared to []
Display: Name wall appears, ready to show who voted
Phones: (within 3 seconds) See phase: 'voting', voting UI appears
Phase 4: Players Vote
Player: Sees list of ALL player names (excluding themselves)
Player: Taps a name to vote
Code: Calls top3Logic.submitVote() → POST to /api/top3-vote
Server: Validates voterId hasn't voted yet
Server: Appends vote to top3_state.currentQuestion.votes
PocketBase: State saved
Display: (within 3 seconds) Sees updated votes, fades out voter's name from wall
Display: Shows "X/Y" vote counter
Phase 5: Presenter Shows Results
Presenter: Presses "R" key or clicks "Show Results" button
Code: Calls top3Logic.showResults(sessionId, state)
Code: Computes top 3 from votes
PocketBase: phase set to 'results', results array populated
Display: Animated donut chart appears with top 3
Phones: Show results view
Phase 6: Move to Next Question
Presenter: Clicks next fase (10/06) or uses arrow key
PocketBase: current_fase updated
PocketBase: top3_state.currentQuestion.questionIndex incremented
State resets: votes: [], results: [], phase: 'intro'
Repeat from Phase 2
Top 10 Flow (Fases 17/05 → 17/14)
Identical to Top 3, but:

Uses top10_state instead of top3_state
Uses /api/top10-vote endpoint
Results show word cloud instead of donut chart
10 questions instead of 9
Critical Prerequisites (That May Have Failed)
Step	What Must Be True	How to Verify
1	PocketBase session has playernames field populated	Check session in PB admin
2	top3_state exists and has allPlayerNames array	Check top3_state JSON in PB
3	All players completed onboarding (have names)	Check selectedPlayerName is set
4	Each player has unique playerId	No two players should be anon_X
5	Presenter started voting AFTER phones synced	Wait 5+ seconds after fase change
Recommended Fixes (For Future)
Generate unique playerId using UUID, not name/team
Validate onboarding complete before allowing voting
Reduce polling interval from 3s to 1s
Add "Reset Voting" button for presenter emergencies
Show player count in presenter view before starting voting
Lock voting after results so late votes don't cause issues

