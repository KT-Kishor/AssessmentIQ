sap.ui.define([
    "./BaseController",
    "sap/m/MessageToast",
    "../model/formatter",
    "sap/ui/model/json/JSONModel" // Explicitly importing JSONModel just in case
], function (BaseController, MessageToast, Formatter, JSONModel) {
    "use strict";

    return BaseController.extend("sap.com.interview.controller.Setup", {
        Formatter: Formatter,

        onInit: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("setup").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: async function () {
            const oSession = this.getOwnerComponent().getModel("session");

            if (!oSession.getProperty("/candidateName")) {
                return this.getOwnerComponent().getRouter().navTo("login");
            }

            const candidate_id = oSession.getProperty("/candidates_id");

            // Initializing default layout states
            this.getView().setModel(new JSONModel({
                round1: {
                    visible: true,
                    enabled: true,
                    text: "Start Round 1",
                    status: "Pending" // Capital 'P' matches your formatter switch
                },
                round2: {
                    visible: false,
                    enabled: false,
                    text: "Start Round 2",
                    status: "Locked" // Capital 'L' matches your formatter switch
                }
            }), "roundModel");

            await this._loadTestAttempts(candidate_id);

            var oPage = this.byId("homePage");
            oPage.setBusy(true);
            this.QuestionsReadCall(1, "oQuestionStatsModel");
            this.QuestionsReadCall(2, "oProgrammingModel");
        },

        _loadTestAttempts: async function (candidate_id) {
            try {
                var oPage = this.byId("homePage");
                oPage.setBusy(true);
                const filter = { candidate_id: candidate_id };
                const oResponse = await this.ajaxReadWithJQuery("TestAttempt", filter);
                const data = oResponse.data || [];

                const oRoundModel = this.getView().getModel("roundModel");

                const oRound1 = data.find(item => Number(item.test_id) === 1);
                const oRound2 = data.find(item => Number(item.test_id) === 2);

                const sRound1Status = (oRound1?.status || "").toLowerCase();
                const sRound1Result = (oRound1?.result_status || "").toLowerCase();
                const sRound2Status = (oRound2?.status || "").toLowerCase();

                let oData = {
                    round1: { visible: true, enabled: true, text: "Start Round 1", status: "Pending" },
                    round2: { visible: false, enabled: false, text: "Locked", status: "Locked" }
                };

                // Round 1 - In Progress
                if (sRound1Status === "in_progress") {
                    oData.round1.text = "Continue Round 1";
                    oData.round1.status = "in_progress";
                }

                // Round 1 - Submitted
                if (sRound1Status === "submitted") {
                    oData.round1.visible = false;
                    oData.round1.status = "Completed";
                }

                // Round 1 - Passed -> Unlocks Round 2
                if (sRound1Result === "pass") {
                    oData.round2.visible = true;
                    oData.round2.enabled = true;
                    oData.round2.text = "Start Round 2";
                    oData.round2.status = "Pending";
                }

                // Round 2 - In Progress
                if (sRound2Status === "in_progress") {
                    oData.round2.visible = true;
                    oData.round2.enabled = true;
                    oData.round2.text = "Continue Round 2";
                    oData.round2.status = "in_progress";
                }

                // Round 2 - Submitted
                if (sRound2Status === "submitted") {
                    oData.round2.visible = false;
                    oData.round2.enabled = false;
                    oData.round2.status = "Completed";
                }

                oRoundModel.setData(oData);
                oPage.setBusy(false);
            } catch (e) {
                oPage.setBusy(false);
            }
        },

        onStartAptitude: function () {
            this.getOwnerComponent().getRouter().navTo("start");
        },

        onStartProgramming: function () {
            var oPage = this.byId("homePage");
            oPage.setBusy(true);

            var oSession = this.getOwnerComponent().getModel("session");

            var oPayload = {
                candidate_id: oSession.getProperty("/candidates_id"),
                test_id: 2,
                status: "in_progress"
            };

            this.ajaxCreateWithJQuery("TestAttempt", {
                data: oPayload
            }).then(function (response) {
                oSession.setProperty("/attemptId", response?.data?.id || response?.data?.results?.insertId);
                oPage.setBusy(false);
                this.getOwnerComponent().getRouter().navTo("view1");
            }.bind(this)).catch(function () {
                oPage.setBusy(false);
                sap.m.MessageBox.error("Unable to start test.");
            });

        },

        QuestionsReadCall: function (testId, modelName) {
            var oPage = this.byId("homePage");
            oPage.setBusy(true);

            this.ajaxReadWithJQuery("Questions", { test_id: testId, flag: 1 })
                .then(response => {
                    oPage.setBusy(false);

                    var aQuestions = response.questions || [];
                    var tests = response.test || [];
                    var totalPoints = 0;

                    aQuestions.forEach(q => {
                        totalPoints += Number(q.marks || 0);
                    });

                    var oModel = new JSONModel({
                        QuestionCount: aQuestions.length,
                        Duration: tests?.duration_mins || 0,
                        TotalPoints: totalPoints,
                        Questions: aQuestions,
                        tests: tests
                    });

                    this.getOwnerComponent().setModel(oModel, modelName);

                }).catch(error => {
                    oPage.setBusy(false);
                    MessageToast.show(
                        JSON.parse(error.responseText).message ||
                        error.message ||
                        error.responseText
                    );
                });
        }
    });
});