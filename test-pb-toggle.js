const pbUrl = "https://ranking-pb.pinkmilk.eu";
async function run() {
  try {
     const filter = encodeURIComponent(`priority = 1`);
     const res = await fetch(`${pbUrl}/api/collections/ranking/records?filter=${filter}`);
     const data = await res.json();
     console.log('Total Priority=1 games:', data.totalItems);
     data.items.forEach(d => console.log(d.id, d.showname, "fase: " + d.current_fase, "updated: " + d.updated));
  } catch(e) { console.error(e) }
}
run();
