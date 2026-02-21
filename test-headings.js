const { faseService } = require('./src/lib/pocketbase.ts');
const rawDb = '{"top3_state": "some state"}';
console.log(faseService.parseHeadings(rawDb));
