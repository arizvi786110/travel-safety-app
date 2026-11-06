# ReadMe

SafePath

Know before you go. SafePath is a travel safety app that tells you how safe a destination is right now, helps you plan the flights to get there, and builds a day-by-day itinerary around the places you actually want to see.

Live demo: https://safepath-expo-app.expo.app (create a free account; a 6-digit code is emailed to you)

This is a portfolio project running on free tiers. Some features may hit daily API limits, and the first request after a quiet period can be slow.

What it does
Safety scores. Search a city and get a safety read-out broken into categories, each rated green, amber or red. Ratings come from recent news coverage that is sorted by keyword and topic.
Flight planner. Find routes between cities. Route distance comes from a shortest-path search over a graph of real airline routes, and live prices are shown when available.
Itinerary builder. Pick the days, hours and kinds of places you like. It builds a timetable, checks that the plan is feasible (including travel time between stops) and lets you save it.
Assistant. A chat assistant that can look up destinations, search flights, and manage your favourites for you. It only ever acts as the signed-in user.
Favourites, saved itineraries, weather and country info, plus an Explore tab with a 3D globe on the native app.
Accounts. Email sign-up with one-time codes, password reset, and in-app account deletion.
Route finding with Dijkstra's algorithm. Airports are nodes, routes are edges, and edge weight is the great-circle (haversine) distance. The graph is precomputed from the database into a bundled JSON file, so the hosted server needs no database calls to build it, and the search uses a binary-heap priority queue.
A news-to-safety pipeline. Articles are fetched, categorised by keyword and topic, then rated per category.
Itinerary feasibility checks. Activities are placed into time blocks and checked against opening hours and travel time.

Security and reliability

Security was a deliberate part of the build, not an afterthought:

Every API route requires a signed-in user. The access token is validated against Supabase on the server for each request, so revoked sessions stop working immediately.
Every database query that touches user data is scoped to the authenticated user's ID. The server uses a privileged key that bypasses row-level security, so this is enforced in code.
Per-user rate limits on every route, tighter limits on routes that spend paid API quota, and input validation and length caps on all parameters.
Secrets live only on the server. The app contains just the public Supabase URL and anon key.
Errors are logged on the server with a short message and returned to the client as generic messages.
Account deletion removes the user's data.
The app handles failures visibly: inline error states with retry on every data screen, an error boundary, and an offline banner.
Known limitations
Free-tier APIs have daily quotas, so heavy use can temporarily disable features such as flight prices.
The 3D globe is a native component and does not render in the web preview.
Cold starts: the first request after the server has been idle can be slow.
No native iOS build (this needs a paid Apple developer account). An Android build is planned.
