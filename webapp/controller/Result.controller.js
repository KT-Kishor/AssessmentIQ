sap.ui.define([
       "./BaseController", // Import BaseController
], function (BaseController) {
    "use strict";

    return BaseController.extend("sap.com.interview.controller.Result", {

        // ── Lifecycle ─────────────────────────────────────────────────
        onInit: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("result").attachPatternMatched(this._onRouteMatched, this);
        },

        // ── Route Matched & Guard Verification ────────────────────────
        _onRouteMatched: function () {
            var oSession = this.getOwnerComponent().getModel("session");

            // Guard: Redirect back if test hasn't been submitted yet
            if (!oSession || !oSession.getProperty("/submitted")) {
                this.getOwnerComponent().getRouter().navTo("login");
                return;
            }

            this._populateResults();
        },

        // ── Core Results Parsing Logic ────────────────────────────────
        _populateResults: function () {
            var oSession = this.getOwnerComponent().getModel("session");
            var oStatsModel = this.getOwnerComponent().getModel("oQuestionStatsModel");

            if (!oStatsModel || !oSession) {
                return;
            }

            var aQuestions = oStatsModel.getProperty("/Questions") || [];
            var aAnswers = oSession.getProperty("/answers") || [];
            var nElapsed = oSession.getProperty("/elapsedTime") || 0;
            var sName = oSession.getProperty("/candidateName") || "Candidate";
            var sEmail = oSession.getProperty("/candidateEmail") || "";

            var nCorrectCount = 0;
            var nIncorrectCount = 0;
            var nSkippedCount = 0;

            var nEarnedScore = 0;
            var nMaxPossiblePoints = 0;

            // Evaluate Answers
            aQuestions.forEach(function (oQ, i) {

                var nSelectedOptionId = aAnswers[i];
                var nQuestionWeight = Number(oQ.marks || 1);

                nMaxPossiblePoints += nQuestionWeight;

                if (nSelectedOptionId === null || nSelectedOptionId === undefined) {
                    nSkippedCount++;
                } else {

                    var oSelectedOption = (oQ.options || []).find(function (opt) {
                        return Number(opt.id) === Number(nSelectedOptionId);
                    });

                    if (oSelectedOption && Number(oSelectedOption.is_correct) === 1) {
                        nCorrectCount++;
                        nEarnedScore += nQuestionWeight;
                    } else {
                        nIncorrectCount++;
                    }
                }
            });

            // Percentage
            var nTotalQs = aQuestions.length;
            var nPct = nTotalQs > 0 ? Math.round((nCorrectCount / nTotalQs) * 100) : 0;

            // Pass Score from Test Table
            var nPassScore = Number(oStatsModel.getProperty("/tests/pass_score") || 0);

            // Pass / Fail
            var sResultStatus = nPct >= nPassScore ? "PASS" : "FAIL";

            // Verdict
            var sVerdict = "";

            if (sResultStatus === "PASS") {
                if (nPct >= 80) {
                    sVerdict = "Excellent Performance!";
                } else {
                    sVerdict = "Good Effort!";
                }
            } else {
                sVerdict = "Keep Practicing";
            }

            // Header Values
            if (this.byId("resultVerdict")) {
                this.byId("resultVerdict").setText(sVerdict);
            }

            if (this.byId("resultNameLine")) {
                this.byId("resultNameLine").setText(sName + " · " + sEmail);
            }

            if (this.byId("resultStatus")) {
                this.byId("resultStatus").setText(
                    sResultStatus + " (" + nPct + "%)"
                );
            }

            // Time
            var nM = Math.floor(nElapsed / 60);
            var nS = nElapsed % 60;
            var sTime = nM + "m " + ("0" + nS).slice(-2) + "s";

            var oView = this.getView();

            setTimeout(function () {

                // Score Ring
                var oRingHtmlCtrl = oView.byId("scoreRingHtml");
                var oDomRef = oRingHtmlCtrl ? oRingHtmlCtrl.getDomRef() : null;

                if (oDomRef) {

                    var oPctEl = oDomRef.querySelector("#aiqScorePctEl");
                    if (oPctEl) {
                        oPctEl.textContent = nPct + "%";
                    }

                    var oArc = oDomRef.querySelector("#aiqScoreArc");

                    if (oArc) {
                        var circumference = 2 * Math.PI * 50;
                        var offset = circumference * (1 - nPct / 100);

                        oArc.style.strokeDasharray = circumference;
                        oArc.style.strokeDashoffset = offset;

                        if (sResultStatus === "PASS") {
                            oArc.style.stroke = "#3B8FFF";
                        } else {
                            oArc.style.stroke = "#EF4444";
                        }
                    }
                }

                // Statistics Section
                var oStatsHtmlCtrl = oView.byId("resultStatsHtml");
                var oStatsDom = oStatsHtmlCtrl ? oStatsHtmlCtrl.getDomRef() : null;

                if (oStatsDom) {

                    var findEl = function (id) {
                        return oStatsDom.querySelector("#" + id);
                    };

                    if (findEl("rsScore")) {
                        findEl("rsScore").textContent =
                            nEarnedScore + "/" + nMaxPossiblePoints;
                    }

                    if (findEl("rsTime")) {
                        findEl("rsTime").textContent = sTime;
                    }

                    if (findEl("rsCorrect")) {
                        findEl("rsCorrect").textContent = nCorrectCount;
                    }

                    if (findEl("rsWrong")) {
                        findEl("rsWrong").textContent = nIncorrectCount;
                    }

                    if (findEl("rsSkipped")) {
                        findEl("rsSkipped").textContent = nSkippedCount;
                    }

                    if (findEl("rsResult")) {
                        findEl("rsResult").textContent = sResultStatus;
                    }
                }

            }, 300);

            // Save Results into Session Model
            oSession.setProperty("/correctCount", nCorrectCount);
            oSession.setProperty("/wrongCount", nIncorrectCount);
            oSession.setProperty("/skippedCount", nSkippedCount);
            oSession.setProperty("/score", nEarnedScore);
            oSession.setProperty("/percentage", nPct);
            oSession.setProperty("/resultStatus", sResultStatus);
            oSession.setProperty("/passScore", nPassScore);
            oSession.setProperty("/maxPossiblePoints", nMaxPossiblePoints);
        },

        // ── Navigation Hook Triggers ──────────────────────────────────
        onReviewAnswers: function () {
            this.getOwnerComponent().getRouter().navTo("review");
        },

        onNewTest: function () {
            this.getOwnerComponent().getRouter().navTo("login");
        }

    });
});