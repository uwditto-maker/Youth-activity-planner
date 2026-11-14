// Reference data for Trailhead. Places are ideas near Spokane, WA.
// Fees, passes and rules change: always verify before you go.
window.TH_DATA = {
  places: [
    { id: 'riverside', name: 'Riverside State Park', area: 'Spokane, WA', drive: '15 min',
      kinds: ['Day hike', 'Camping', 'Service'], pass: 'Discover Pass (WA State Parks)',
      notes: 'Bowl and Pitcher campground and trail network. Ask the park about volunteer trail-work days.' },
    { id: 'dishman', name: 'Dishman Hills Conservation Area', area: 'Spokane Valley, WA', drive: '20 min',
      kinds: ['Day hike', 'Service'], pass: 'None known; check current rules',
      notes: 'Close-in hiking that suits a short evening or Saturday activity.' },
    { id: 'little-spokane', name: 'Little Spokane River', area: 'North Spokane, WA', drive: '25 min',
      kinds: ['Canoe / kayak', 'Day trip'], pass: 'Discover Pass at state launch sites',
      notes: 'Flat-water paddling. Rent boats or borrow from members; PFDs for everyone.' },
    { id: 'mt-spokane', name: 'Mount Spokane State Park', area: 'Mead, WA', drive: '45 min',
      kinds: ['Summit hike', 'Snowshoe', 'Camping'], pass: 'Discover Pass; Sno-Park permit in winter',
      notes: 'Summit hikes in summer, snowshoeing in winter. Weather changes fast near the top.' },
    { id: 'turnbull', name: 'Turnbull National Wildlife Refuge', area: 'Cheney, WA', drive: '30 min',
      kinds: ['Day hike', 'Service'], pass: 'Seasonal entrance fee',
      notes: 'Easy trails and wildlife viewing. Refuge staff sometimes host volunteer projects.' },
    { id: 'farragut', name: 'Farragut State Park', area: 'Athol, ID', drive: '1 hr',
      kinds: ['Camping', 'Day hike', 'Group camp'], pass: 'Idaho State Parks entry fee + reservation',
      notes: 'Group campsites on Lake Pend Oreille. Good for a first overnight with younger youth.' },
    { id: 'priest-lake', name: 'Priest Lake', area: 'North Idaho', drive: '2 hr',
      kinds: ['Camping', 'Canoe / kayak', 'Multi-night'], pass: 'Idaho State Parks or USFS campground fees',
      notes: 'Lake camping, paddling and hiking. Cell coverage is limited; plan communication.' },
    { id: 'kettle-crest', name: 'Kettle Crest Trail', area: 'Colville National Forest, WA', drive: '2.5 hr',
      kinds: ['Backpacking', 'Multi-night'], pass: 'Check trailhead pass requirements',
      notes: 'Ridge-line backpacking with big views. Water is scarce on the crest; plan carries.' },
    { id: 'salmo-priest', name: 'Salmo-Priest Wilderness', area: 'NE Washington', drive: '2.5 hr',
      kinds: ['Backpacking', 'Multi-night'], pass: 'Check trailhead pass requirements',
      notes: 'Remote old-growth forest. No cell signal; carry a satellite messenger.' },
    { id: 'spokane-whitewater', name: 'Spokane River whitewater (outfitter)', area: 'Spokane, WA', drive: '15 min',
      kinds: ['High adventure', 'Rafting'], pass: 'Outfitter booking',
      notes: 'Use a licensed outfitter with guides. Confirm age and swim requirements.' },
    { id: 'hiawatha', name: 'Route of the Hiawatha', area: 'Idaho / Montana border', drive: '2 hr',
      kinds: ['Bike', 'Day trip'], pass: 'Trail ticket; bike and light rental available',
      notes: 'Downhill rail-trail through tunnels and trestles. Lights required in tunnels.' },
    { id: 'steamboat', name: 'Steamboat Rock State Park', area: 'Electric City, WA', drive: '2 hr',
      kinds: ['Camping', 'Summit hike', 'Water'], pass: 'Discover Pass + camping reservation',
      notes: 'Desert butte hike and lake camping. Hot in summer; bring shade and extra water.' },
    { id: 'palouse-falls', name: 'Palouse Falls State Park', area: 'SE Washington', drive: '2 hr',
      kinds: ['Day trip', 'Day hike'], pass: 'Discover Pass',
      notes: 'Short walks to big views. Stay behind barriers; cliffs are dangerous.' }
  ],

  // Questions to help youth choose their own gospel theme. Trailhead never picks one.
  themeGuidance: [
    'What will we actually do? Climb, cross water, find our way, serve, sleep under the stars, work hard together?',
    'Is there a time the Savior did, taught or experienced something like that? Look in the Gospel Library for a word from your activity.',
    'What do we hope our quorum or class will feel, learn or change because of this activity?',
    'Is there someone we hope will come? What would help them feel the Savior\'s love?',
    'Pray about it as a presidency. Ask a parent or adviser what they would connect, then decide for yourselves.'
  ],

  devotionalTips: [
    'Keep it short: 5 to 15 minutes is plenty outdoors.',
    'Tie it to what the group just did together.',
    'Ask a question and let others share, instead of giving a talk.',
    'Share your testimony of Jesus Christ in your own words.',
    'Pick a hymn or song everyone can sing without a book.'
  ],

  gear: {
    day: {
      personal: ['Daypack', 'Water (2 liters)', 'Lunch and snacks', 'Rain jacket', 'Warm layer', 'Sun hat and sunscreen', 'Sturdy shoes', 'Personal medication', 'Scriptures or Gospel Library app'],
      group: ['First aid kit', 'Map / offline maps', 'Extra water', 'Trash bags']
    },
    overnight: {
      personal: ['Sleeping bag (check overnight low)', 'Sleeping pad', 'Headlamp + batteries', 'Water bottles', 'Rain jacket', 'Warm layers + beanie', 'Extra socks', 'Sturdy shoes', 'Mess kit', 'Toiletries', 'Sun hat and sunscreen', 'Personal medication', 'Scriptures or Gospel Library app'],
      group: ['Tents', 'First aid kit', 'Stove + fuel', 'Cook set and utensils', 'Coolers', 'Water filter or extra water', 'Tarps and rope', 'Lantern', 'Map / offline maps', 'Satellite messenger (no-signal areas)', 'Trash bags', 'Firewood (if allowed)']
    }
  }
};
