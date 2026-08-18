**UC-01: Search Space Information**

**Primary Actor: User**

**Secondary Actor: Space API / NASA API**

**Stakeholders: User, Admin**

**Trigger:**

**User wants to find information about a particular space-related topic.**

**Preconditions:**

**Space Explorer website is available.**

**Search service/API is accessible.**

**User has entered a search term.**

**Postconditions:**

**Relevant search results are displayed to the user.**

**If no results are found, an appropriate message is shown.**

**Main Flow:**

**1\. User enters a keyword in the search bar.**

**2\. System validates the entered keyword.**

**3\. System sends the search request to the Space API.**

**4\. API returns the relevant data.**

**5\. System processes the received data.**

**6\. System displays the relevant results to the user.**

**Alternate Flows:**

**A1: If the search field is empty, the system asks the user to enter a keyword.**

**A2: If no relevant information is found, the system displays "No results found."**

**A3: If the API is unavailable, the system displays an error message and asks the user to try again later.**

**UC-02: View Details of Planet**

**Primary Actor: User**

**Secondary Actor: Space API**

**Stakeholders: User, Admin**

**Trigger:**

**User selects a planet from the search results or the space exploration section.**

**Preconditions:**

**The selected planet exists in the system/API.**

**Space Explorer is connected to the required data source.**

**Postconditions:**

**Detailed information about the selected planet is displayed.**

**Main Flow:**

**1\. User selects a planet.**

**2\. System identifies the selected planet.**

**3\. System requests the required information from the Space API.**

**4\. API returns the planet details.**

**5\. System displays the available information to the user.**

**Alternate Flows:**

**A1: If information about the selected planet is unavailable, the system displays an appropriate message.**

**A2: If the API fails to respond, the system displays an error and allows the user to try again.**

**A3: If some information is unavailable, the system displays the available details instead of showing incomplete/incorrect data.**

**UC-03: Bookmark Items**

**Primary Actor: Registered User**

**Stakeholders: Registered User, Admin**

**Trigger:**

**A registered user wants to save a space-related item for later reference.**

**Preconditions:**

**User is logged into their account.**

**The selected item exists.**

**User has an active session.**

**Postconditions:**

**The selected item is saved to the user's bookmarks.**

**A confirmation message is displayed.**

**Main Flow:**

**1\. Registered user opens a space-related item.**

**2\. User clicks the "Bookmark" option.**

**3\. System verifies the user's session.**

**4\. System saves the selected item to the user's bookmarks.**

**5\. System displays "Added to bookmarks."**

**Alternate Flows:**

**A1: If the user is not logged in, the system asks them to log in before bookmarking the item.**

**A2: If the item is already bookmarked, the system informs the user that it is already saved.**

**A3: If the bookmark cannot be saved due to a system error, the system displays an appropriate error message.**