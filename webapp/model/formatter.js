sap.ui.define([], function () {
    "use strict";

    return {

        getRoundStatusClass: function (sStatus) {

            switch ((sStatus || "").toLowerCase()) {

                case "submitted":
                    return "homeRoundStatus homeRoundStatus--success";

                case "in progress":
                    return "homeRoundStatus homeRoundStatus--progress";

                default:
                    return "homeRoundStatus homeRoundStatus--pending";
            }
        },

        getRoundStatusIcon: function (sStatus) {

            switch ((sStatus || "").toLowerCase()) {

                case "submitted":
                    return "sap-icon://accept";

                case "in progress":
                    return "sap-icon://process";

                default:
                    return "sap-icon://pending";
            }
        }
    };
});