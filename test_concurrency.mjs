import PocketBase from 'pocketbase';

const pb = new PocketBase('https://pinkmilk.pockethost.io');
// Let's just fetch the session ID directly via HTTP to the user's pocketbase, or we know it from earlier requests.
// Wait, 'http://localhost:3000/api/pb-auth-test' might give us info, but easier: Just fetch the first session.

async function run() {
    try {
        // Authenticate as presenter/admin or just fetch the first ranking session
        await pb.admins.authWithPassword('admin@pinkmilk.eu', 'admin123'); // Assuming default
    } catch (e) {
        console.log("Could not auth admin, trying to fetch without auth if public");
    }

    try {
        const records = await pb.collection('ranking').getList(1, 1, { sort: '-created' });
        if (records.items.length === 0) {
            console.log('No ranking sessions found to test on.');
            return;
        }
        const sessionId = records.items[0].id;
        console.log(`Testing on session ID: ${sessionId}`);

        // Create 80 concurrent promises
        const promises = [];
        for (let i = 1; i <= 80; i++) {
            promises.push(
                fetch('http://localhost:3000/api/top3-vote', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sessionId,
                        voterId: `test_voter_${i}`,
                        voterName: `Voter ${i}`,
                        teamNumber: 1,
                        chosenPlayerId: `chosen_${i % 5}`, // Vote for one of 5 people
                        chosenPlayerName: `Player ${i % 5}`,
                    })
                }).then(res => res.json())
            );
        }

        console.log(`Sending 80 concurrent votes...`);
        const start = Date.now();
        const results = await Promise.all(promises);
        const end = Date.now();

        console.log(`Completed in ${end - start}ms.`);

        // Check results
        const successes = results.filter(r => r.success).length;
        const errorsList = results.filter(r => r.error);
        console.log(`Successes: ${successes}, Errors: ${errorsList.length}`);
        if (errorsList.length > 0) {
            console.log('Sample error:', errorsList[0]);
        }

        // Check PocketBase to see how many votes are ACTUALLY saved in the session!
        const sessionDoc = await pb.collection('ranking').getOne(sessionId);
        let headingsObj = typeof sessionDoc.headings === 'string' ? JSON.parse(sessionDoc.headings) : sessionDoc.headings;
        if (typeof headingsObj === 'string') headingsObj = JSON.parse(headingsObj);

        const top3State = headingsObj.top3_state;
        if (typeof top3State === 'string') {
            const parsed = JSON.parse(top3State);
            console.log(`Total votes recorded in DB: ${parsed.currentQuestion.votes.length}`);
        } else if (top3State) {
            console.log(`Total votes recorded in DB: ${top3State.currentQuestion.votes.length}`);
        } else {
            console.log(`No top3_state found in DB.`);
        }

    } catch (err) {
        console.error('Test failed:', err);
    }
}

run();
