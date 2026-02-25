
import PocketBase from 'pocketbase';

async function list() {
    const pb = new PocketBase('https://pinkmilk.pockethost.io');
    try {
        const sessions = await pb.collection('ranking').getFullList({ sort: '-created' });
        console.log('SESSIONS:');
        if (sessions.length > 0) {
            console.log('FIELDS IN RECORD:', Object.keys(sessions[0]));
            const s = sessions[0];
            console.log(`ID: ${s.id} | Name: ${s.showname} | krakende_state value:`, s.krakende_state ? 'PRESENT' : 'MISSING');
            if (s.headings) {
                const h = typeof s.headings === 'string' ? JSON.parse(s.headings) : s.headings;
                console.log('krakende_state in HEADINGS:', h.krakende_state ? JSON.stringify(h.krakende_state, null, 2) : 'MISSING');
            }
        }
    } catch (e) {
        console.error('PB Connection failed:', e);
    }
}

list();
