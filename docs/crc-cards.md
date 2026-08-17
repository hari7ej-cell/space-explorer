# CRC Cards
**Date:** 17.08.2026  
**Deliverable:** docs/crc-cards.md  

### Class: Planet
| Responsibilities | Collaborators |
| :--- | :--- |
| Maintains core planetary identifiers (ID, Name, Mass). | `CelestialDetails` |
| Provides summary data for the UI. | |
| Manages the lifecycle of its detailed specifications (Composition). | |

<br>

### Class: CelestialDetails
| Responsibilities | Collaborators |
| :--- | :--- |
| Holds deep atmospheric, geological, and ring data. | *None* |
| Operates as a dependent object (cannot exist independently without a Planet). | |

<br>

### Class: Mission
| Responsibilities | Collaborators |
| :--- | :--- |
| Tracks the launch date, timeline, and current mission status. | `Astronaut` |
| Maintains a roster of assigned crew members (Aggregation). | |
| Provides mission summary data. | |

<br>

### Class: Astronaut
| Responsibilities | Collaborators |
| :--- | :--- |
| Stores the astronaut's name, space agency, and biography. | *None* |
| Tracks the total number of accumulated spaceflights. | |

<br>

### Class: SpaceImage
| Responsibilities | Collaborators |
| :--- | :--- |
| Caches the daily astronomy media metadata (URL, title, date). | *None* |
| Differentiates between static image and video embed types. | |

<br>

### Class: Bookmark
| Responsibilities | Collaborators |
| :--- | :--- |
| Represents a saved space-related item for a registered user. | `Planet`, `Mission`, `Astronaut`, `SpaceImage` |
| Links the saved entity to the user's current session. | |