sap.ui.define([
    "./BaseController", // Import BaseController 
    "sap/ui/core/routing/History",
    "sap/m/MessageToast",
], function (BaseController, History, MessageToast) {
    "use strict";

    return BaseController.extend("sap.com.interview.controller.Login", {

        onInit: function () {
            // Reset session on login page
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("login").attachPatternMatched(this._onRouteMatched, this);
        },
        _onRouteMatched: function () {
            this.oSession = this.getOwnerComponent().getModel("session");
            this.oSession.setProperty("/studentId", "");
            this.oSession.setProperty("/candidateName", "");
            this.oSession.setProperty("/candidateEmail", "");
        },
        // ── Live change handlers (clear error on typing) ──────────────
        onStudentIdChange: function () {
            this.byId("loginError").setVisible(false);
        },

        onNameChange: function () {
            this.byId("loginError").setVisible(false);
        },

        onEmailChange: function () {
            this.byId("loginError").setVisible(false);
        },

        // ── Validate and proceed to Start screen ──────────────────────
        onStartPressed: function () {
            var oSession = this.getOwnerComponent().getModel("session");
            var oError = this.byId("loginError");

            // 1. Validate Student ID
            if (!oSession.getProperty("/studentId")) {
                oError.setText("Please enter your Student ID.");
                oError.setVisible(true);
                this.byId("inpStudentId").focus();
                return;
            }

            // 2. Validate Full Name
            if (!oSession.getProperty("/candidateName")) {
                oError.setText("Please enter your full name.");
                oError.setVisible(true);
                this.byId("inpName").focus();
                return;
            }

            // 3. Validate Email Presence
            if (!oSession.getProperty("/candidateEmail")) {
                oError.setText("Please enter your email address.");
                oError.setVisible(true);
                this.byId("inpEmail").focus();
                return;
            }

            // Basic email format check
            var rEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!rEmail.test(oSession.getProperty("/candidateEmail"))) {
                oError.setText("Please enter a valid email address (e.g. name@company.com).");
                oError.setVisible(true);
                this.byId("inpEmail").focus();
                return;
            }

            oError.setVisible(false);

            // Navigate to Start page
            var oData = {
                student_Id: oSession.getProperty("/studentId"),
                candidate_Name: oSession.getProperty("/candidateName"),
                candidate_Email: oSession.getProperty("/candidateEmail"),
                flag: "start"
            };
            var oPage = this.byId("loginPage");
            oPage.setBusy(true);
            this.ajaxCreateWithJQuery("Candidate", { data: oData })
                .then(response => {
                    oPage.setBusy(false);
                    oSession.setProperty("/candidates_id", response?.data?.results?.insertId);
                    this.getOwnerComponent().getRouter().navTo("start");
                })
                .catch((error) => {
                    oPage.setBusy(false);

                    let sMessage = "Technical error occurred";

                    try {
                        if (error.responseText) {
                            sMessage = JSON.parse(error.responseText).message;
                        } else if (error.message) {
                            sMessage = error.message;
                        }
                    } catch (e) {
                        sMessage = error.responseText || error.message || "Technical error occurred";
                    }

                    MessageToast.show(sMessage);
                    console.error(error);
                });
        }

    });
});