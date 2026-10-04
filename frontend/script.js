/* =========================================
   EXPLORE DROPDOWN
========================================= */

const exploreButton =
    document.getElementById(
        "exploreButton"
    );

const exploreDropdown =
    exploreButton.closest(
        ".dropdown"
    );


exploreButton.addEventListener(
    "click",
    function(event) {

        event.stopPropagation();

        exploreDropdown.classList.toggle(
            "active"
        );

        accountDropdown.classList.remove(
            "active"
        );
    }
);


/* =========================================
   ACCOUNT DROPDOWN
========================================= */

const accountButton =
    document.getElementById(
        "accountButton"
    );

const accountDropdown =
    accountButton.closest(
        ".dropdown"
    );


accountButton.addEventListener(
    "click",
    function(event) {

        event.stopPropagation();

        accountDropdown.classList.toggle(
            "active"
        );

        exploreDropdown.classList.remove(
            "active"
        );
    }
);


/* =========================================
   CLOSE DROPDOWNS
========================================= */

document.addEventListener(
    "click",
    function() {

        exploreDropdown.classList.remove(
            "active"
        );

        accountDropdown.classList.remove(
            "active"
        );

    }
);


/* =========================================
   SEARCH
========================================= */

const searchInput =
    document.getElementById(
        "searchInput"
    );


searchInput.addEventListener(
    "keydown",
    function(event) {

        if (
            event.key === "Enter"
        ) {

            const value =
                searchInput.value.trim();

            if (value) {

                console.log(
                    "Searching for:",
                    value
                );

                /*
                 * Wikipedia search functionality
                 * will be connected here when
                 * we build the home page.
                 */

            }

        }

    }
);