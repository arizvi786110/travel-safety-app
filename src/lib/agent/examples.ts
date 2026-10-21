

export const ROUTING_EXAMPLES = `
Example 1:
User: Is Tokyo safe?
Action: location_info

Example 2:
User: What's the crime risk in Paris?
Action: location_info

Example 3:
User: Are there any natural disaster risks in Japan?
Action: location_info

Example 4:
User: Find me a flight route from London to Tokyo.
Action: flight_route

Example 5:
User: How can I fly from Manchester to Rome?
Action: flight_route

Example 6:
User: Show me my favourites.
Action: favourites

Example 7:
User: Save Paris to my favourites.
Action: favourites

Example 8:
User: Remove Tokyo from my favourites.
Action: favourites

Example 9:
User: I know Baghdad might be risky but I'm going anyway.
Action: going_anyway

Example 10:
User: I'm still travelling to this place. What precautions should I take?
Action: going_anyway

Example 11:
User: What should I pack for Japan in spring?
Action: general

Example 12:
User: What's a good time of year to visit Italy?
Action: general
`;


export const EXTRACTION_EXAMPLES = `
Example 1:
User: Is Tokyo safe?
Selected tool: location_info

Output:
{"location":"Tokyo"}


Example 2:
User: Tell me about the risks in Baghdad.
Selected tool: location_info

Output:
{"location":"Baghdad"}


Example 3:
User: Find me a route from London to Tokyo.
Selected tool: flight_route

Output:
{"source":"London","destination":"Tokyo"}


Example 4:
User: How can I fly from Manchester to Paris?
Selected tool: flight_route

Output:
{"source":"Manchester","destination":"Paris"}


Example 5:
User: Show my favourites.
Selected tool: favourites

Output:
{"action":"view"}


Example 6:
User: Add Paris to my favourites.
Selected tool: favourites

Output:
{"action":"add","location":"Paris"}


Example 7:
User: Remove Tokyo from my favourites.
Selected tool: favourites

Output:
{"action":"remove","location":"Tokyo"}


Example 8:
User: I'm going to Baghdad anyway.
Selected tool: going_anyway

Output:
{"location":"Baghdad"}


Example 9:
Conversation:
User: Tell me about Paris.
Assistant: Paris has...

Current user message:
What flights go there from London?

Selected tool: flight_route

Output:
{"source":"London","destination":"Paris"}


Example 10:
Conversation:
User: Add Tokyo to my favourites.
Assistant: Tokyo has been added to your favourites.

Current user message:
Actually remove it.

Selected tool: favourites

Output:
{"action":"remove","location":"Tokyo"}


Example 11:
Conversation:
User: Tell me about Cairo.
Assistant: Cairo has...

Current user message:
I'm still going. What should I know?

Selected tool: going_anyway

Output:
{"location":"Cairo"}
`;


export const CHAT_EXAMPLES = `
Example 1:

User:
Is Tokyo safe?

Assistant:
I can help you check Tokyo's available safety information, including risks such as crime and natural disasters.


Example 2:

User:
Is it 100% safe?

Assistant:
No destination can be guaranteed to be completely safe. I can help you understand the available risks and precautions so you can make a more informed decision.


Example 3:

User:
Find me flights from London to Tokyo.

Assistant:
Sure — I'll check the available route from London to Tokyo.


Example 4:

User:
Save Tokyo to my favourites.

Assistant:
Sure — I'll add Tokyo to your favourites.


Example 5:

User:
Show me my favourites.

Assistant:
Sure — I'll check your saved destinations.


Example 6:

User:
I know the destination is risky, but I'm going anyway.

Assistant:
I can help you understand the main risks and practical precautions to consider before you travel.


Example 7:

User:
What should I pack for Japan in spring?

Assistant:
Layers are a good idea for Japan in spring because temperatures can vary. A light jacket, comfortable walking shoes and something for rain can also be useful.


Example 8:

Conversation:
User: Tell me about Paris.
Assistant: Paris has...

User:
What about flights there from London?

Assistant:
I can check the available route from London to Paris.


Example 9:

Conversation:
User: Save Tokyo to my favourites.
Assistant: Tokyo has been saved.

User:
Actually remove it.

Assistant:
Sure — I'll remove Tokyo from your favourites.


Example 10:

User:
Find flights.

Assistant:
Sure. Where are you flying from, and where would you like to go?
`;