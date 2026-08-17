# Noun Analysis 
**Date:** 17.08.2026  
**Deliverable:** docs/noun-analysis.md  

## 1. Raw Candidate List
The following nouns were extracted from our Problem Statement and the three Use Case Specifications (Search Space Information, View Details of Planet, Bookmark Items)[cite: 2]:

* User
* Registered User
* Admin
* Chatbot
* Space API
* AI API
* Time Trigger
* System
* Keyword
* Search Bar
* Request
* Data
* Results
* Message / Error Message
* Planet
* Details / Information
* Bookmark
* Session
* Item
* Account
* Mission
* Astronaut
* Space Image
* Launch Date
* Status

---

## 2. Filters Applied
To determine our final system classes, we applied the standard four filters to our raw candidate list:
1. **Filter 1 (Redundancy):** Eliminates nouns that mean the same thing as another noun on the list (synonyms).
2. **Filter 2 (Actor / Outside Boundary):** Eliminates nouns that represent external entities (people or other systems) that interact with our system, but are not part of our core code.
3. **Filter 3 (Attribute):** Eliminates nouns that are simply properties or data points of a larger object.
4. **Filter 4 (Implementation Detail / Vague):** Eliminates nouns that represent internal code mechanics, UI elements, or terms that are too broad to be a specific class.

---

## 3. Discarded Candidates

| Discarded Noun | Filter Applied | Reason for Elimination |
| :--- | :--- | :--- |
| **User** | Filter 2 (Actor) | External human interacting with the system[cite: 2]. |
| **Registered User** | Filter 2 (Actor) | External human actor[cite: 2]. |
| **Admin** | Filter 2 (Actor) | External human actor[cite: 2]. |
| **Chatbot** | Filter 2 (Actor) | Modeled as an actor in our system boundary[cite: 2]. |
| **Space API** | Filter 2 (Actor) | External system providing data[cite: 2]. |
| **AI API** | Filter 2 (Actor) | External system[cite: 2]. |
| **Time Trigger** | Filter 2 (Actor) | External/Scheduled system actor[cite: 2]. |
| **System** | Filter 4 (Vague) | Refers to the entire application; too broad. |
| **Keyword** | Filter 4 (Implementation) | Just a string input for the search function. |
| **Search Bar** | Filter 4 (Implementation) | A User Interface element, not a backend domain class. |
| **Request / Results**| Filter 4 (Implementation) | Network/API mechanics, not domain concepts. |
| **Data / Information** | Filter 4 (Vague) | Too broad to be a class. |
| **Message / Error** | Filter 4 (Implementation) | UI feedback text. |
| **Session / Account**| Filter 4 (Implementation) | Handled by auth infrastructure, not the core space domain. |
| **Item** | Filter 1 (Redundancy) | "Item" is a generic placeholder for Planets, Missions, etc. |
| **Launch Date** | Filter 3 (Attribute) | A property (variable) belonging to the Mission class. |
| **Status** | Filter 3 (Attribute) | A property (variable) belonging to the Mission class. |

---

## 4. Surviving Classes
After applying the filters, these are the core domain classes that will be implemented in the Object-Oriented system:

1. **Planet** (Core entity for planetary data)
2. **CelestialDetails** (Extracted from "Details" to act as a composed class for Planet data, fulfilling the Composition OOP requirement)
3. **Mission** (Core entity for space missions)
4. **Astronaut** (Core entity for crew members)
5. **SpaceImage** (Core entity for APOD and media)
6. **Bookmark** (Core entity representing a saved item for a registered user)