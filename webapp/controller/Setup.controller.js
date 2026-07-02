sap.ui.define([
    "./BaseController",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "../model/formatter",
    "sap/ui/model/json/JSONModel" // Explicitly importing JSONModel just in case
], function (BaseController, MessageToast,MessageBox, Formatter, JSONModel) {
    "use strict";

    return BaseController.extend("sap.com.interview.controller.Setup", {
        Formatter: Formatter,

        onInit: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("setup").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: async function () {
            this.oSession = this.getOwnerComponent().getModel("session");

            if (!this.oSession.getProperty("/candidateName")) {
                return this.getOwnerComponent().getRouter().navTo("login");
            }

            const candidate_id = this.oSession.getProperty("/candidates_id");

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
            this.updateCandidateLoginStatus(this.oSession.getProperty("/candidates_id"), true);
            this.getOwnerComponent().getRouter().navTo("start");
        },

        // onStartProgramming: function () {
        //     var oPage = this.byId("homePage");
        //     this.updateCandidateLoginStatus(this.oSession.getProperty("/candidates_id"), false);

        //     oPage.setBusy(true);

        //     var oPayload = {
        //         candidate_id: this.oSession.getProperty("/candidates_id"),
        //         test_id: 2,
        //         status: "in_progress"
        //     };

        //     this.ajaxCreateWithJQuery("TestAttempt", {
        //         data: oPayload
        //     }).then(function (response) {
        //         this.oSession.setProperty("/attemptId", response?.data?.id || response?.data?.results?.insertId);
        //         oPage.setBusy(false);
        //         this.getOwnerComponent().getRouter().navTo("view1");
        //     }.bind(this)).catch(function () {
        //         oPage.setBusy(false);
        //         sap.m.MessageBox.error("Unable to start test.");
        //     });

        // },


          // onStartProgramming: function () {
        //     var oPage = this.byId("homePage");
        //     oPage.setBusy(true);

        //     var oSession = this.getOwnerComponent().getModel("session");

        //     var oPayload = {
        //         candidate_id: oSession.getProperty("/candidates_id"),
        //         test_id: 2,
        //         status: "in_progress"
        //     };

        //     this.ajaxCreateWithJQuery("TestAttempt", {
        //         data: oPayload
        //     }).then(function (response) {
        //         oSession.setProperty("/attemptId", response?.data?.id || response?.data?.results?.insertId);
        //         oPage.setBusy(false);
        //         this.getOwnerComponent().getRouter().navTo("view1");
        //     }.bind(this)).catch(function () {
        //         oPage.setBusy(false);
        //         sap.m.MessageBox.error("Unable to start test.");
        //     });

        // },

        onStartProgramming: function () {
     this.updateCandidateLoginStatus(this.oSession.getProperty("/candidates_id"), true);
//   const oSession = this.getOwnerComponent().getModel("session");
    const sEmail = this.oSession.getProperty("/candidateEmail");

    // Set the email for the fragment binding
    this.oSession.setProperty("/email", sEmail);

    if (!this._otpDialog) {

        sap.ui.core.Fragment.load({
            id: this.getView().getId(),
            name: "sap.com.interview.fragment.OTPlogin",
            controller: this
        }).then(function (oDialog) {

            this._otpDialog = oDialog;
            this.getView().addDependent(oDialog);
            oDialog.open();

        }.bind(this));

    } else {
        this._otpDialog.open();
    }

},

onSendOTP: function () {
     var oPage = this.byId("otpDialog");
    var oEmailInput = this.byId("emailInput");
    var sEmail = oEmailInput.getValue().trim();

    var oButton = this.byId("btnSendOTP");
       oPage.setBusy(true);
    this.ajaxCreateWithJQuery("CandidateOTP", {
        candidate_Email: sEmail,
        action: "sendOTP"
    }).then(function () {
          oPage.setBusy(false);
        MessageToast.show("OTP sent successfully.");
        this.byId("otpContainer").setVisible(true);

        // Start 30-second countdown
        this._startOTPTimer(oButton);

    }.bind(this)).catch(function () {
         oPage.setBusy(false);
        MessageBox.error("Failed to send OTP.");
    });
},
_startOTPTimer: function (oButton) {

    var iSeconds = 30;

    oButton.setEnabled(false);
    oButton.setText("Resend OTP (" + iSeconds + "s)");

    // Clear previous timer if any
    if (this._otpTimer) {
        clearInterval(this._otpTimer);
    }

    this._otpTimer = setInterval(function () {

        iSeconds--;

        if (iSeconds > 0) {
            oButton.setText("Resend OTP (" + iSeconds + "s)");
        } else {
            clearInterval(this._otpTimer);
            this._otpTimer = null;

            oButton.setEnabled(true);
            oButton.setText("Resend OTP");
        }

    }.bind(this), 1000);
},
onVerifyOTP: function () {
    var oPage = this.byId("otpDialog");
    var sOTP = this.byId("otpInput").getValue();
    if(!sOTP){
        MessageToast.show("Enter a Valid OTP")
    }
    var sEmail = this.getView().getModel("session").getProperty("/email");
        oPage.setBusy(true);
    this.ajaxCreateWithJQuery("CandidateOTP", {
        candidate_Email: sEmail,
        OTP: sOTP,
        action: "verifyOTP"
    }).then(function (oResponse) {
 oPage.setBusy(false);
        // Display the response message
        MessageToast.show(oResponse.message || "OTP verified successfully.");

        if (oResponse.success) {
            this._otpDialog.close();
            this._createTestAttempt();
        }

    }.bind(this)).catch(function (oError) {
 oPage.setBusy(false);
        // Display backend error message
        var sMessage = oError.responseJSON?.message ||
                       oError.responseText ||
                       oError.message ||
                       "OTP verification failed.";

        MessageBox.error(sMessage);

    });
},
onOTPchange: function (oEvent) {

    var oInput = oEvent.getSource();
    var sValue = oInput.getValue();

    // Allow only digits
    sValue = sValue.replace(/\D/g, "");

    // Restrict to 6 digits
    if (sValue.length > 6) {
        sValue = sValue.substring(0, 6);
    }

    oInput.setValue(sValue);
},
_createTestAttempt: function () {

    var oPage = this.byId("homePage");
    oPage.setBusy(true);

    // var oSession = this.getOwnerComponent().getModel("session");

    var oPayload = {
        candidate_id: this.oSession.getProperty("/candidates_id"),
        test_id: 2,
        status: "in_progress"
    };

    this.ajaxCreateWithJQuery("TestAttempt", {
        data: oPayload
    }).then(function (response) {

        this.oSession.setProperty(
            "/attemptId",
            response?.data?.id || response?.data?.results?.insertId
        );

        oPage.setBusy(false);

        this.getOwnerComponent()
            .getRouter()
            .navTo("view1");

    }.bind(this))
    .catch(function () {

        oPage.setBusy(false);
        MessageBox.error("Unable to start test.");

    });

},
PL_onCloseViewDialog: function () {

     if (this._otpTimer) {
        clearInterval(this._otpTimer);
        this._otpTimer = null;
    }

    if (this.byId("otpInput")) {
        this.byId("otpInput").setValue("");
        this.byId("otpInput").setValueState(sap.ui.core.ValueState.None);
    }

    // Hide OTP section
    if (this.byId("otpContainer")) {
        this.byId("otpContainer").setVisible(false);
    }

    // Close and destroy dialog
    if (this._otpDialog) {
        this._otpDialog.close();
        this._otpDialog.destroy();
        this._otpDialog = null;
    }
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