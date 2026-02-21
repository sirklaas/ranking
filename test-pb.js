fetch('https://pinkmilk.pockethost.io/api/collections/ranking/records?sort=-created')
  .then(res => res.json())
  .then(data => {
    if (data.items.length > 0) {
      console.log(data.items[0].headings);
    }
  });
