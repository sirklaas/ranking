const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('https://pinkmilk.pockethost.io');

async function fix() {
    const sessions = await pb.collection('ranking').getFullList({ sort: '-created' });
    if (!sessions.length) return console.log('No sessions');
    const session = sessions[0];
    console.log('Patching session:', session.id);

    let headings = {};
    try { headings = JSON.parse(session.headings || '{}'); } catch (e) { }

    const map = {
        'trailerguilty': 'GuiltyPleasure.mp4',
        'trailerzit': 'TrailerZitten.mp4',
        'Super': 'RankingSuperfoods.m4v',
        'Flirt': 'RankingFlirt.m4v',
        'Houseparty': 'RankingHouseparty.m4v',
        'Socials': 'RankingSocials.m4v',
        'Kleding': 'RankingKleding.m4v',
        'All-in': 'All-In.m4v',
        'Sauna': 'RankingSauna.m4v',
        'Collega': 'RankingCollega.m4v',
        'Billen': 'RankingBillen.m4v',
        'Gat': 'RankingGat.m4v',
        'Teveel': 'RankingDrink.m4v',
        'trailertop3': 'TrailerTop3.mp4',
        'trailerkrakende': 'KrakendeKarakters.mp4',
        'trailertop10': 'Top10.mp4',
        'trailerfinale': 'TrailerFinale.mp4',
        'trailerfinale.mp4': 'TrailerFinale.mp4'
    };

    let changed = false;
    for (const [key, val] of Object.entries(headings)) {
        if (val.image && map[val.image]) {
            console.log('Updating', key, val.image, '->', map[val.image]);
            headings[key].image = map[val.image];
            changed = true;
        }
    }

    if (changed) {
        await pb.collection('ranking').update(session.id, { headings: JSON.stringify(headings) });
        console.log('Successfully updated session headings!');
    } else {
        console.log('No headings needed updating.');
    }
}
fix().catch(console.error);
