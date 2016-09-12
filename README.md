# brisca-server

# Work in progress... Under major Refactoring process

# Here is a brief documentation:


##### At the beginning when a client connects to the Web Socket Server, the following messages are sent:


| cmd                | Message Type | Payload                 | Description               |
|--------------------|--------------|-------------------------|---------------------------|
| myInfoPlayer       | Unicast      | id: string              | Their random generated ID |
|                    |              | inGame: string          | Game id, if registered.   |
|                    |              | points: int             | Total game points         |
|                    |              | gamesWon: int           | Games won                 |
|                    |              | gamesLost: int          | Games Lost                |
| newPlayer          | Broadcast    | player: string          | New player's ID           |
| initPlayers        | Unicast      | players: array [string] | Currently online players  |
| initAvailableGames | Unicast      | games: array [string]   | Currently available games |
