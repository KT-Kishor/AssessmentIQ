sap.ui.define([
    "./BaseController", // Import BaseController 
    "sap/ui/model/json/JSONModel", // JSON model for data handling
    "sap/m/MessageToast",
], function (BaseController, JSONModel, MessageToast) {
    "use strict";

    return BaseController.extend("sap.com.interview.controller.Start", {

        onInit: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("start").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            var oSession = this.getOwnerComponent().getModel("session");
            var sName = oSession.getProperty("/candidateName");
            var sEmail = oSession.getProperty("/candidateEmail");

            // Guard: if no candidate name, redirect back to login
            if (!sName) return this.getOwnerComponent().getRouter().navTo("login");

            this.byId("loggedInText").setText("Logged in as: " + sName + " (" + sEmail + ")");
            this.QuestionsReadCall();
        },

        QuestionsReadCall: function () {
            var oPage = this.byId("startPage");
            oPage.setBusy(true);

            this.ajaxReadWithJQuery("Questions")
                .then(response => {
                    oPage.setBusy(false);

                    var aQuestions = response.questions || [];
                    var tests = response.test || [];
                    var totalPoints = 0;

                    aQuestions.forEach(function (q) {
                        totalPoints += Number(q.marks || 0);
                    });
                    var oStatsModel = new JSONModel({
                        QuestionCount: aQuestions.length,
                        Duration: tests?.duration_mins || 0,
                        TotalPoints: totalPoints,
                        Questions: aQuestions,
                        tests: tests
                    });

                    this.getOwnerComponent().setModel(oStatsModel, "oQuestionStatsModel");

                })
                .catch((error) => {
                    oPage.setBusy(false);
                    MessageToast.show(
                        JSON.parse(error.responseText).message ||
                        error.message ||
                        error.responseText
                    );
                });
        },

        onBeginTest: function () {
            var oSession = this.getOwnerComponent().getModel("session");
            var oQuestionStatsModel = this.getOwnerComponent().getModel("oQuestionStatsModel");
            // Initialize answers array (null = unanswered)
            var aAnswers = [];
            for (var i = 0; i < 10; i++) { aAnswers.push(null); }

            oSession.setProperty("/answers", aAnswers);
            oSession.setProperty("/currentQuestion", 0);
            oSession.setProperty("/timeLeft", oQuestionStatsModel.getProperty("/tests/duration_mins") * 60);
            oSession.setProperty("/submitted", false);
            oSession.setProperty("/startTime", Date.now());
            oSession.setProperty("/elapsedTime", 0);

            this.getOwnerComponent().getRouter().navTo("test");

            var oPayload = {
                candidate_id: oSession.getProperty("/candidates_id"),
                test_id: 1,
                status: "in_progress"
            };

            this.ajaxCreateWithJQuery("TestAttempt", {
                data: oPayload
            }).then(function (response) {

                oSession.setProperty("/attemptId", response?.data?.results?.insertId);

                this.getOwnerComponent().getRouter().navTo("test");

            }.bind(this));
        }

    });
});