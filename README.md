# brisca-server

# Work in progress... Under major Refactoring process

# Here is a brief documentation:


##### At the beginning when a client connects to the Web Socket Server, the following messages are sent:


| cmd                | payload                 | Message type | Description               |
|--------------------|-------------------------|--------------|---------------------------|
| myInfoPlayer       | id: string              | Unicast      | Their random generated ID |
|                    | inGame: string          |              | Game id, if registered.   |
|                    | points: int             |              | Total game points         |
|                    | gamesWon: int           |              | Games won                 |
|                    | gamesLost: int          |              | Games Lost                |
| newPlayer          | player: string          | Broadcast    | New player's ID           |
| initPlayers        | players: array [string] | Unicast      | Currently online players  |
| initAvailableGames | games: array [string]   | Unicast      | Currently available games |
