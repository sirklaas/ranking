const pbUrl = "https://ranking-pb.pinkmilk.eu";
async function run() {
  const adminEmail = process.env.PB_EMAIL || "klaas@pinkmilk.eu"; // don't know it, let's just use generic fetch for list if collection is public
  try {
     const filter = encodeURIComponent(`priority = 1`);
     const res = await fetch(`${pbUrl}/api/collections/ranking/records?filter=${filter}&sort=-updated`);
     const data = await res.json();
     console.log('Result:', JSON.stringify(data, null, 2));
  } catch(e) { console.error(e) }
}
run();
