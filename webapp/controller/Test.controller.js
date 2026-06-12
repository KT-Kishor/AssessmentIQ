sap.ui.define([
    "./BaseController",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/Text",
    "sap/m/VBox",
    "sap/ui/core/HTML",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (BaseController, Dialog, Button, Text, VBox, HTML, JSONModel, MessageToast, MessageBox) {
    "use strict";

    return BaseController.extend("sap.com.interview.controller.Test", {

        // ── Lifecycle ─────────────────────────────────────────────────
        onInit: function () {
            this._oTimer = null;
            this._oSubmitDialog = null;
            this._oTimeoutDialog = null;
            var oSession = this.getOwnerComponent().getModel("session");

            if (!oSession.getProperty("/candidateName")) {
                return this.getOwnerComponent().getRouter().navTo("login");
            }

            // Disable right click
            document.addEventListener("contextmenu", function (e) { e.preventDefault() });

            // // Disable copy
            document.addEventListener("copy", function (e) { e.preventDefault() });

            // // Disable cut
            document.addEventListener("cut", function (e) { e.preventDefault() });

            // // Disable paste
            document.addEventListener("paste", function (e) { e.preventDefault() });

            // // Disable Ctrl+C, Ctrl+X, Ctrl+V
            document.addEventListener("keydown", function (e) {
                if (e.ctrlKey && (e.key === "c" || e.key === "C" || e.key === "x" || e.key === "X" || e.key === "v" || e.key === "V")) {
                    e.preventDefault();
                }
            });

            // this._testSubmitted = false;
            // this._testDialogOpen = false;

            // document.addEventListener("fullscreenchange",this._onFullscreenChange.bind(this));

            // document.addEventListener("visibilitychange",this._onVisibilityChange.bind(this));

            // window.addEventListener("blur",this._onWindowBlur.bind(this));

            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("test").attachPatternMatched(this._onRouteMatched, this);
        },

        onExit: function () {
            this._stopTimer();
            if (this._oSubmitDialog) { this._oSubmitDialog.destroy(); }
            if (this._oTimeoutDialog) { this._oTimeoutDialog.destroy(); }
        },

        // ── Route Matched & Data Initialization ──────────────────────
        _onRouteMatched: function () {
            this._ensureMockDataInitialized();

            var oSession = this.getOwnerComponent().getModel("session");

            if (!oSession.getProperty("/candidateName")) {
                return this.getOwnerComponent().getRouter().navTo("login");
            }

            // Reset dialog hooks
            if (this._oSubmitDialog) { this._oSubmitDialog.destroy(); this._oSubmitDialog = null; }
            if (this._oTimeoutDialog) { this._oTimeoutDialog.destroy(); this._oTimeoutDialog = null; }

            this._stopTimer();
            this._renderQuestion();
            this._startTimer();
        },

        _ensureMockDataInitialized: function () {
            var oComponent = this.getOwnerComponent();
            var oStatsModel = oComponent.getModel("oQuestionStatsModel");

            // 1. Questions mock model setup
            if (!oStatsModel || !oStatsModel.getProperty("/Questions")) {
                var aMockQuestions = [
                    {
                        id: 2,
                        test_id: 2,
                        question_text: "Which model type in SAPUI5 is server-side by default?",
                        marks: 2,
                        order_no: 0,
                        options: [
                            { id: 1, option_text: "JSONModel", is_correct: 0 },
                            { id: 2, option_text: "XMLModel", is_correct: 0 },
                            { id: 3, option_text: "ODataModel", is_correct: 1 },
                            { id: 4, option_text: "ResourceModel", is_correct: 0 }
                        ]
                    },
                    {
                        id: 3,
                        test_id: 2,
                        question_text: "What does BTP stand for in the SAP Ecosystem?",
                        marks: 1,
                        order_no: 1,
                        options: [
                            { id: 5, option_text: "Business Technology Pipeline", is_correct: 0 },
                            { id: 6, option_text: "Business Technology Platform", is_correct: 1 },
                            { id: 7, option_text: "Basic Technical Protocol", is_correct: 0 }
                        ]
                    }
                ];

                oStatsModel = new JSONModel({
                    QuestionCount: aMockQuestions.length,
                    Duration: aMockQuestions.length,
                    TotalPoints: aMockQuestions.length,
                    Questions: aMockQuestions
                });
                oComponent.setModel(oStatsModel, "oQuestionStatsModel");
            }

            // 2. Session model — FIX: Force answers array to dynamically size with questions length
            var nTotalQs = oStatsModel.getProperty("/Questions").length;
            var oSessionModel = oComponent.getModel("session");

            if (!oSessionModel) {
                oComponent.setModel(new JSONModel(), "session");
                oSessionModel = oComponent.getModel("session");
            }

            // Initialize or adjust answers array length dynamically based on mock questions data
            var aCurrentAnswers = oSessionModel.getProperty("/answers");
            if (!aCurrentAnswers || aCurrentAnswers.length !== nTotalQs) {
                // Creates a clean array filled with null matching the exact count (e.g., 2 items)
                var aDynamicAnswers = Array(nTotalQs).fill(null);
                oSessionModel.setProperty("/answers", aDynamicAnswers);
                oSessionModel.setProperty("/currentQuestion", 0);
            }
        },

        // ── Timer Logic ───────────────────────────────────────────────
        _startTimer: function () {
            var oSession = this.getOwnerComponent().getModel("session");
            oSession.setProperty("/timerRunning", true);

            this._oTimer = setInterval(function () {
                var nLeft = oSession.getProperty("/timeLeft");
                nLeft--;

                if (nLeft <= 0) {
                    nLeft = 0;
                    oSession.setProperty("/timeLeft", nLeft);
                    this._updateTimerDisplay(nLeft);
                    this._stopTimer();
                    this._autoSubmit();
                    return;
                }

                oSession.setProperty("/timeLeft", nLeft);
                this._updateTimerDisplay(nLeft);
            }.bind(this), 1000);
        },

        _stopTimer: function () {
            if (this._oTimer) {
                clearInterval(this._oTimer);
                this._oTimer = null;
            }
        },

        _updateTimerDisplay: function (nLeft) {
            var m = Math.floor(nLeft / 60);
            var s = nLeft % 60;
            var txt = ("0" + m).slice(-2) + ":" + ("0" + s).slice(-2);

            var oSession = this.getOwnerComponent().getModel("session");
            if (oSession) {
                oSession.setProperty("/formattedTime", txt);
            }

            var oTimerText = this.byId("timerDisplay");
            if (oTimerText && nLeft <= 60) {
                oTimerText.addStyleClass("aiqTimerUrgent");
            }
        },

        // ── Render Controls ───────────────────────────────────────────
        _renderQuestion: function () {
            var oStatsModel = this.getOwnerComponent().getModel("oQuestionStatsModel");
            var oSession = this.getOwnerComponent().getModel("session");

            var aQs = oStatsModel.getProperty("/Questions") || [];
            var nIdx = oSession.getProperty("/currentQuestion") || 0;
            var aAnswers = oSession.getProperty("/answers") || [];
            var nTotal = aQs.length; // Will now be exactly 2
            var oQ = aQs[nIdx];

            if (!oQ) { return; }

            oSession.setProperty("/totalQuestions", nTotal);

            // ── Header info (Will now display "Question 1 of 2") ──
            var sQInfo = "Question " + (nIdx + 1) + " of " + nTotal;
            if (this.byId("headerQInfo")) { this.byId("headerQInfo").setText(sQInfo); }

            // ── Progress bar calculations ──
            var nPct = Math.round(((nIdx + 1) / nTotal) * 100);
            if (this.byId("progressBar")) { this.byId("progressBar").setPercentValue(nPct); }
            if (this.byId("progressLabel")) { this.byId("progressLabel").setText(sQInfo); }
            if (this.byId("progressPct")) { this.byId("progressPct").setText(nPct + "% complete"); }

            this._renderDots(nIdx, aAnswers, nTotal);
            this._renderOptions(oQ, nIdx, aAnswers);

            if (this.byId("qNumber")) { this.byId("qNumber").setText("QUESTION " + ("0" + (nIdx + 1)).slice(-2)); }
            if (this.byId("qText")) { this.byId("qText").setText(oQ.question_text); }

            // ── Dynamic Footer Tracker Count Fix ──
            var nUnanswered = aAnswers.filter(function (a) { return a === null; }).length;
            var oUnanswered = this.byId("unansweredText");
            if (oUnanswered) {
                if (nUnanswered === 0) {
                    oUnanswered.setText("✓ All answered");
                    oUnanswered.addStyleClass("aiqAllAnswered");
                } else {
                    // If 1 answer selected out of 2, this will now correctly show "1 unanswered"
                    oUnanswered.setText(nUnanswered + " unanswered");
                    oUnanswered.removeStyleClass("aiqAllAnswered");
                }
            }

            if (this.byId("btnPrev")) { this.byId("btnPrev").setEnabled(nIdx > 0); }
            if (this.byId("btnNext")) { this.byId("btnNext").setVisible(nIdx < nTotal - 1); }
        },

        _renderDots: function (nCurrent, aAnswers, nTotal) {
            var oDotsHtml = this.byId("qDotsHtml");
            if (!oDotsHtml) { return; }

            var sHtml = "<div class='aiqQDots' id='aiqQDotsContainer'>";
            for (var i = 0; i < nTotal; i++) {
                var sCls = "aiqQDot";
                if (i === nCurrent) { sCls += " aiqDotCurrent"; }
                else if (aAnswers[i] !== null) { sCls += " aiqDotAnswered"; }

                sHtml += "<div class='" + sCls + "' onclick='window.aiqGoToQ(" + i + ")'>" + (i + 1) + "</div>";
            }
            sHtml += "</div>";
            oDotsHtml.setContent(sHtml);

            var that = this;
            window.aiqGoToQ = function (nIdx) {
                var oSession = that.getOwnerComponent().getModel("session");
                if (!oSession.getProperty("/submitted")) {
                    oSession.setProperty("/currentQuestion", nIdx);
                    that._renderQuestion();
                }
            };
        },

        _renderOptions: function (oQ, nQIdx, aAnswers) {
            var nSelectedOptionId = aAnswers[nQIdx];
            var that = this;

            var sHtml = "<div class='aiqOptionsList'>";

            oQ.options.forEach(function (oOpt, index) {
                var sLabelLetter = String.fromCharCode(65 + index);
                var bChecked = nSelectedOptionId === oOpt.id ? "checked" : "";

                sHtml +=
                    "<div class='aiqOption'>" +
                    "<label style='display:flex;align-items:center;cursor:pointer;width:100%;'>" +
                    "<input type='radio' " +
                    "name='question_" + nQIdx + "' " +
                    "value='" + oOpt.id + "' " +
                    bChecked + " " +
                    "onchange=\"window.aiqSelectOpt(" + oOpt.id + ")\" />" +
                    "<span style='margin-left:10px;'>&nbsp;" +
                    "<b>" + sLabelLetter + ".</b> " + oOpt.option_text +
                    "</span>" +
                    "</label>" +
                    "</div>";
            });

            sHtml += "</div>";

            this.byId("optionsHtml").setContent(sHtml);

            window.aiqSelectOpt = function (nOptionId) {
                var oSession = that.getOwnerComponent().getModel("session");
                var nCurrent = oSession.getProperty("/currentQuestion");
                var aAns = oSession.getProperty("/answers");

                aAns[nCurrent] = nOptionId;
                oSession.setProperty("/answers", aAns);
                that._renderQuestion();
            };
        },

        // ── Pagination Events ─────────────────────────────────────────
        onPrevious: function () {
            var oSession = this.getOwnerComponent().getModel("session");
            var nIdx = oSession.getProperty("/currentQuestion");
            if (nIdx > 0) {
                oSession.setProperty("/currentQuestion", nIdx - 1);
                this._renderQuestion();
            }
        },

        onNext: function () {
            var oSession = this.getOwnerComponent().getModel("session");
            var nIdx = oSession.getProperty("/currentQuestion");
            var nTotal = oSession.getProperty("/totalQuestions");
            if (nIdx < nTotal - 1) {
                oSession.setProperty("/currentQuestion", nIdx + 1);
                this._renderQuestion();
            }
        },

        // ── Submission Logic ──────────────────────────────────────────
        onSubmitPressed: function () {
            var oSession = this.getOwnerComponent().getModel("session");
            var aAnswers = oSession.getProperty("/answers") || [];
            var nAnswered = aAnswers.filter(function (a) { return a !== null; }).length;
            var nTotal = aAnswers.length;
            var nUnanswered = nTotal - nAnswered;

            var sMsg = "You have answered " + nAnswered + " of " + nTotal + " questions.";
            if (nUnanswered > 0) {
                sMsg += " " + nUnanswered + " question(s) will be marked as unanswered.";
            }
            sMsg += " Are you sure you want to submit?";

            if (!this._oSubmitDialog) {
                var that = this;
                this._oSubmitDialog = new Dialog({
                    title: "Submit Assessment?",
                    type: "Message",
                    state: "Warning",
                    content: [

                        new Text({ id: "submitDialogMsg", text: sMsg, wrapping: true }).addStyleClass("aiqDialogText")
                    ],
                    beginButton: new Button({
                        text: "Yes, Submit Now",
                        type: "Emphasized",
                        press: function () {
                            this._testSubmitted = true;

                            if (document.fullscreenElement) {
                                document.exitFullscreen();
                            }
                            that._oSubmitDialog.close();

                            // STEP 1: Stop timer and calculate answers first so they exist in model
                            that._calculateResultsData();

                            // STEP 2: Save response options and update attempt status with valid score metrics
                            that.saveCandidateAnswers();
                            that.UpdateTestAttempt("submitted");

                            // STEP 3: Safe to route now that processing is finished
                            that.getOwnerComponent().getRouter().navTo("result");
                        }
                    }),
                    endButton: new Button({
                        text: "Continue Test",
                        press: function () {
                            that._oSubmitDialog.close();
                        }
                    })
                });
                this.getView().addDependent(this._oSubmitDialog);
            } else {
                var oMsgText = sap.ui.getCore().byId("submitDialogMsg");
                if (oMsgText) { oMsgText.setText(sMsg); }
            }

            this._oSubmitDialog.open();
        },

        /**
         * Isolates scoring calculation calculations into the local model.
         * Guarantees /score and /percentage paths populate successfully prior to AJAX dispatching.
         */
        _calculateResultsData: function () {
            this._stopTimer();

            var oSession = this.getOwnerComponent().getModel("session");
            var oStatsModel = this.getOwnerComponent().getModel("oQuestionStatsModel");

            var aQs = oStatsModel.getProperty("/Questions") || [];
            var aAnswers = oSession.getProperty("/answers") || [];
            var nStart = oSession.getProperty("/startTime") || Date.now();

            var nCorrectCount = 0;
            var nTotalScoreAccumulator = 0;
            var nMaxPossibleMarks = 0;

            aQs.forEach(function (oQ, i) {
                var nSelectedId = aAnswers[i];
                var nQuestionWeight = oQ.marks || 1;

                nMaxPossibleMarks += nQuestionWeight;

                var oSelectedOption = oQ.options.find(function (opt) {
                    return opt.id === nSelectedId;
                });

                if (oSelectedOption && oSelectedOption.is_correct === 1) {
                    nCorrectCount++;
                    nTotalScoreAccumulator += nQuestionWeight;
                }
            });

            var nWrongCount = aQs.length - nCorrectCount;
            var nElapsed = Math.floor((Date.now() - nStart) / 1000);

            // Calculate percentage
            var nPercentage = nMaxPossibleMarks > 0 ? Math.round((nTotalScoreAccumulator / nMaxPossibleMarks) * 100) : 0;

            // ── NEW: Calculate Pass or Fail Status ──
            var sPassingStatus = nPercentage >= 50 ? "Pass" : "Fail"; // You can change 50 to your passing benchmark

            oSession.setProperty("/submitted", true);
            oSession.setProperty("/correctCount", nCorrectCount);
            oSession.setProperty("/wrongCount", nWrongCount);
            oSession.setProperty("/score", nTotalScoreAccumulator);
            oSession.setProperty("/percentage", nPercentage);
            oSession.setProperty("/passingStatus", sPassingStatus); // Saved to model
            oSession.setProperty("/elapsedTime", nElapsed);
        },

        UpdateTestAttempt: function (status) {
            var oSession = this.getOwnerComponent().getModel("session");

            var oPayload = {
                status: status, // Keeps track of "submitted" vs "timeout"
                submitted_at: new Date().toISOString(),
                total_marks: oSession.getProperty("/score"),
                score: oSession.getProperty("/percentage"),
                result_status: oSession.getProperty("/passingStatus") // Sends "Pass" or "Fail" to the backend
            };

            var requestData = {
                filters: {
                    id: oSession.getProperty("/attemptId")
                },
                data: oPayload
            };

            this.ajaxUpdateWithJQuery("TestAttempt", requestData)
                .then(function (response) {
                    console.log("Attempt update successful:", response);
                })
                .catch(function (error) {
                    MessageToast.show(error.message || error.responseText);
                });
        },

        saveCandidateAnswers: function () {
            var oSession = this.getOwnerComponent().getModel("session");
            var oQuestionModel = this.getOwnerComponent().getModel("oQuestionStatsModel");

            var aQuestions = oQuestionModel.getProperty("/Questions") || [];
            var aAnswers = oSession.getProperty("/answers") || [];
            var attemptId = oSession.getProperty("/attemptId");

            aQuestions.forEach(function (oQuestion, index) {
                var selectedOptionId = aAnswers[index];

                // Default values if unanswered
                var nIsCorrect = 0;
                var nMarksAwarded = 0;

                // Find the option object that the user selected
                if (selectedOptionId !== null && selectedOptionId !== undefined) {
                    var oSelectedOption = oQuestion.options.find(function (opt) {
                        return opt.id === selectedOptionId;
                    });

                    // Check if the selected option is marked correct in your data structure
                    if (oSelectedOption && oSelectedOption.is_correct === 1) {
                        nIsCorrect = 1;
                        nMarksAwarded = oQuestion.marks || 1; // Assign actual question weight
                    }
                }

                // Build the payload with the two new fields included
                var oPayload = {
                    attempt_id: attemptId,
                    question_id: oQuestion.id,
                    selected_option_id: selectedOptionId,
                    is_correct: nIsCorrect,
                    marks_awarded: nMarksAwarded
                };

                // FIXED: Wrapped the config parameter inside an object literal { data: oPayload }
                this.ajaxCreateWithJQuery("CandidateAnswers", {
                    data: oPayload
                })
                    .then(function (response) {
                        console.log("Candidate answer saved successfully:", response);
                    })
                    .catch(function (error) {
                        MessageToast.show(error.message || error.responseText);
                    });

            }.bind(this));
        },

        _autoSubmit: function () {
            var that = this;
            if (!this._oTimeoutDialog) {
                this._oTimeoutDialog = new Dialog({
                    title: "Time's Up!",
                    type: "Message",
                    state: "Error",
                    content: [
                        new HTML({
                            content: "<div class='aiqDialogIcon aiqDialogIconError'>" +
                                "<svg width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='#DC2626' stroke-width='2.5'>" +
                                "<circle cx='12' cy='12' r='10'/><polyline points='12 6 12 12 16 14'/></svg></div>"
                        }),
                        new Text({
                            text: "Your time has expired. The assessment has been automatically submitted.",
                            wrapping: true
                        }).addStyleClass("aiqDialogText")
                    ],
                    beginButton: new Button({
                        text: "View My Results",
                        type: "Emphasized",
                        press: function () {
                            that._oTimeoutDialog.close();
                            that._doSubmit();
                        }
                    })
                });
                this.getView().addDependent(this._oTimeoutDialog);
            }
            this._oTimeoutDialog.open();
        },

        _doSubmit: function () {
            this._calculateResultsData();
            this.saveCandidateAnswers();
            this.UpdateTestAttempt("timeout");
            this.getOwnerComponent().getRouter().navTo("result");
        },
        _onFullscreenChange: function () {

            if (!document.fullscreenElement &&
                !this._testSubmitted &&
                !this._testDialogOpen) {

                this._autoSubmitTest("Fullscreen mode exited.");
            }
        },

        _onVisibilityChange: function () {

            if (document.hidden &&
                !this._testSubmitted &&
                !this._testDialogOpen) {

                this._autoSubmitTest("Tab switched or window minimized.");
            }
        },

        _onWindowBlur: function () {

            if (!this._testSubmitted &&
                !this._testDialogOpen) {

                this._autoSubmitTest("Window lost focus.");
            }
        },

        _autoSubmitTest: function (sMessage) {

            if (this._testDialogOpen) {
                return;
            }

            this._testDialogOpen = true;

            MessageBox.show(
                sMessage + "\n\nDo you want to submit the test?",
                {
                    icon: MessageBox.Icon.WARNING,
                    title: "Warning",
                    actions: [
                        MessageBox.Action.YES,
                        MessageBox.Action.NO
                    ],

                    onClose: function (oAction) {

                        this._testDialogOpen = false;

                        if (oAction === MessageBox.Action.YES) {

                            this._testSubmitted = true;
                            this.onSubmitPressed();

                        } else {

                            setTimeout(function () {

                                var elem = document.documentElement;

                                if (elem.requestFullscreen) {
                                    elem.requestFullscreen();
                                } else if (elem.webkitRequestFullscreen) {
                                    elem.webkitRequestFullscreen();
                                } else if (elem.msRequestFullscreen) {
                                    elem.msRequestFullscreen();
                                }

                            }, 300);
                        }

                    }.bind(this)
                }
            );
        },
    });
});