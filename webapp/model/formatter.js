sap.ui.define([], function () {
    "use strict";

    return {
        statusState: function (sStatus) {
            if (!sStatus) {
                return "None";
            }

            // Convert to lowercase to prevent case-matching issues
            switch (sStatus.toLowerCase()) {
                case "pending":
                    return "Indication13"; // A nice subtle grey/blue info state
                case "in progress":
                case "in_progress":
                    return "Information";  // Blue
                case "submitted":
                    return "Success";      // Green
                case "locked":
                    return "Error";        // Red
                default:
                    return "None";         // Standard dark text
            }
        }
    };
});