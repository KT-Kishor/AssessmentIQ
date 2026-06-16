sap.ui.define([
    "./BaseController",
], function (BaseController) {
    "use strict";

    var ROUND2_TEST_ID = 2;

    return BaseController.extend("sap.com.interview.controller.Result", {

        // ── Lifecycle ─────────────────────────────────────────────────
        onInit: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("result").attachPatternMatched(this._onRouteMatched, this);
        },

        // ── Route Matched & Guard ─────────────────────────────────────
        _onRouteMatched: function () {
            var oSession = this.getOwnerComponent().getModel("session");
            if (!oSession.getProperty("/candidateName")) {
                return this.getOwnerComponent().getRouter().navTo("login");
            }
            this._populateResults();
        },

        // ── Core Results Parsing ──────────────────────────────────────
        _populateResults: function () {
            var oSession    = this.getOwnerComponent().getModel("session");
            var oStatsModel = this.getOwnerComponent().getModel("oQuestionStatsModel");

            if (!oStatsModel || !oSession) { return; }

            var aQuestions = oStatsModel.getProperty("/Questions") || [];
            var aAnswers   = oSession.getProperty("/answers")      || [];
            var nElapsed   = oSession.getProperty("/elapsedTime")  || 0;
            var sName      = oSession.getProperty("/candidateName")  || "Candidate";
            var sEmail     = oSession.getProperty("/candidateEmail") || "";

            var nCorrectCount      = 0;
            var nIncorrectCount    = 0;
            var nSkippedCount      = 0;
            var nEarnedScore       = 0;
            var nMaxPossiblePoints = 0;

            aQuestions.forEach(function (oQ, i) {
                var nSelectedOptionId = aAnswers[i];
                var nQuestionWeight   = Number(oQ.marks || 1);
                nMaxPossiblePoints   += nQuestionWeight;

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

            var nTotalQs      = aQuestions.length;
            var nPct          = nTotalQs > 0 ? Math.round((nCorrectCount / nTotalQs) * 100) : 0;
            var nPassScore    = Number(oStatsModel.getProperty("/tests/pass_score") || 0);
            var sResultStatus = nPct >= nPassScore ? "PASS" : "FAIL";

            var sVerdict = "";
            if (sResultStatus === "PASS") {
                sVerdict = nPct >= 80 ? "Excellent Performance!" : "Good Effort!";
            } else {
                sVerdict = "Keep Practicing";
            }

            if (this.byId("resultVerdict"))  { this.byId("resultVerdict").setText(sVerdict); }
            if (this.byId("resultNameLine")) { this.byId("resultNameLine").setText(sName + " · " + sEmail); }
            if (this.byId("resultStatus"))   { this.byId("resultStatus").setText(sResultStatus + " (" + nPct + "%)"); }

            var nM    = Math.floor(nElapsed / 60);
            var nS    = nElapsed % 60;
            var sTime = nM + "m " + ("0" + nS).slice(-2) + "s";

            var oView = this.getView();

            setTimeout(function () {

                var oRingDom = oView.byId("scoreRingHtml") ? oView.byId("scoreRingHtml").getDomRef() : null;
                if (oRingDom) {
                    var oPctEl = oRingDom.querySelector("#aiqScorePctEl");
                    if (oPctEl) { oPctEl.textContent = nPct + "%"; }

                    var oArc = oRingDom.querySelector("#aiqScoreArc");
                    if (oArc) {
                        var circumference = 2 * Math.PI * 50;
                        oArc.style.strokeDasharray  = circumference;
                        oArc.style.strokeDashoffset = circumference * (1 - nPct / 100);
                        oArc.style.stroke = sResultStatus === "PASS" ? "#3B8FFF" : "#EF4444";
                    }
                }

                var oStatsDom = oView.byId("resultStatsHtml") ? oView.byId("resultStatsHtml").getDomRef() : null;
                if (oStatsDom) {
                    var findEl = function (id) { return oStatsDom.querySelector("#" + id); };
                    if (findEl("rsScore"))   { findEl("rsScore").textContent   = nEarnedScore + "/" + nMaxPossiblePoints; }
                    if (findEl("rsTime"))    { findEl("rsTime").textContent    = sTime; }
                    if (findEl("rsCorrect")) { findEl("rsCorrect").textContent = nCorrectCount; }
                    if (findEl("rsWrong"))   { findEl("rsWrong").textContent   = nIncorrectCount + nSkippedCount; }
                }

            }, 300);

            oSession.setProperty("/correctCount",      nCorrectCount);
            oSession.setProperty("/wrongCount",        nIncorrectCount);
            oSession.setProperty("/skippedCount",      nSkippedCount);
            oSession.setProperty("/score",             nEarnedScore);
            oSession.setProperty("/percentage",        nPct);
            oSession.setProperty("/resultStatus",      sResultStatus);
            oSession.setProperty("/passScore",         nPassScore);
            oSession.setProperty("/maxPossiblePoints", nMaxPossiblePoints);

            // ── resultState model drives view visibility bindings ─────
            var oResultModel = this.getOwnerComponent().getModel("resultState");
            if (!oResultModel) {
                oResultModel = new sap.ui.model.json.JSONModel();
                this.getOwnerComponent().setModel(oResultModel, "resultState");
            }
            oResultModel.setData({
                isPassed:        sResultStatus === "PASS",
                isFailed:        sResultStatus === "FAIL",
                resultStatus:    sResultStatus,
                percentage:      nPct,
                passScore:       nPassScore,
                round2Loading:   sResultStatus === "PASS",
                round2Error:     false,
                round2Problems:  [],
                round2Test:      {},
                round2ProbCount: "—",
                round2Duration:  "—",
                round2PassMark:  "—"
            });

            // ── Call Round 2 API only when candidate PASSED ───────────
            if (sResultStatus === "PASS") {
                this._loadRound2Questions();
            }
        },

        // ── NEW: Round 2 API Call (same pattern as QuestionsReadCall) ─
        _loadRound2Questions: function () {
            var that         = this;
            var oResultModel = this.getOwnerComponent().getModel("resultState");
            var oPage        = this.byId("resultPage");

            // Show busy on the result page while loading Round 2 data
            if (oPage) { oPage.setBusy(true); }

            // Same helper you already use everywhere — filter test_id = 2
            this.ajaxReadWithJQuery("Questions", { test_id: ROUND2_TEST_ID })
                .then(function (response) {
                    if (oPage) { oPage.setBusy(false); }

                    /*
                     * response shape (same as your MCQ call):
                     * {
                     *   success: true,
                     *   test: { id, title, duration_mins, pass_score, round_type },
                     *   questions: [
                     *     { id, title, question_text, difficulty, topic, marks, options:[...] }
                     *   ]
                     * }
                     */
                    var oTest      = response.test      || {};
                    var aQuestions = response.questions  || [];

                    // Values from the test row
                    var nDuration  = Number(oTest.duration_mins || 0);
                    var nPassScore = parseFloat(oTest.pass_score || "0");
                    var nProbCount = aQuestions.length;

                    // Map to display-ready problem list
                    var aProblems = aQuestions.map(function (oQ, idx) {
                        return {
                            index:      idx + 1,
                            id:         oQ.id,
                            title:      oQ.title || oQ.question_text || ("Problem " + (idx + 1)),
                            topic:      oQ.topic || "",
                            difficulty: oQ.difficulty || "easy",
                            marks:      Number(oQ.marks || 1),
                            diffClass:  that._getDiffClass(oQ.difficulty)
                        };
                    });

                    // Update resultState model
                    oResultModel.setProperty("/round2Loading",   false);
                    oResultModel.setProperty("/round2Error",     false);
                    oResultModel.setProperty("/round2Test",      oTest);
                    oResultModel.setProperty("/round2Problems",  aProblems);
                    oResultModel.setProperty("/round2ProbCount", String(nProbCount));
                    oResultModel.setProperty("/round2Duration",  nDuration + " min");
                    oResultModel.setProperty("/round2PassMark",  nPassScore + "%");

                    // Push values into core:HTML DOM
                    setTimeout(function () {
                        that._renderRound2Section(aProblems, nDuration, nPassScore, nProbCount);
                    }, 100);
                })
                .catch(function (error) {
                    if (oPage) { oPage.setBusy(false); }

                    oResultModel.setProperty("/round2Loading", false);
                    oResultModel.setProperty("/round2Error",   true);

                    // Parse error same way as your existing calls
                    var sMsg = "";
                    try {
                        sMsg = JSON.parse(error.responseText).message;
                    } catch (e) {
                        sMsg = error.message || error.responseText || "Failed to load Round 2";
                    }
                    sap.m.MessageToast.show(sMsg);

                    setTimeout(function () {
                        that._showRound2Error();
                    }, 100);
                });
        },

        // ── Inject API data into core:HTML DOM ────────────────────────
        _renderRound2Section: function (aProblems, nDuration, nPassScore, nProbCount) {
            var oR2Dom = this.getView().byId("round2SectionHtml") ?
                this.getView().byId("round2SectionHtml").getDomRef() : null;
            if (!oR2Dom) { return; }

            var findEl = function (id) { return oR2Dom.querySelector("#" + id); };

            // Fill info pills
            if (findEl("r2ProbCount")) { findEl("r2ProbCount").textContent = nProbCount; }
            if (findEl("r2Duration"))  { findEl("r2Duration").textContent  = nDuration + " min"; }
            if (findEl("r2PassMark"))  { findEl("r2PassMark").textContent  = nPassScore + "%"; }

            // Fill problem list
            var oListEl = oR2Dom.querySelector("#r2ProblemList");
            if (!oListEl) { return; }

            if (aProblems.length === 0) {
                oListEl.innerHTML = "<div class='aiqR2Empty'>No problems configured for Round 2.</div>";
                return;
            }

            oListEl.innerHTML = aProblems.map(function (oP) {
                var sDiff = oP.difficulty
                    ? (oP.difficulty.charAt(0).toUpperCase() + oP.difficulty.slice(1).toLowerCase())
                    : "Easy";
                return [
                    "<div class='aiqR2ProbRow'>",
                    "  <div class='aiqR2ProbLeft'>",
                    "    <div class='aiqR2ProbNum'>" + oP.index + "</div>",
                    "    <div>",
                    "      <div class='aiqR2ProbName'>" + oP.title + "</div>",
                    "      <div class='aiqR2ProbTopic'>" + oP.topic + "</div>",
                    "    </div>",
                    "  </div>",
                    "  <span class='aiqDiffBadge " + oP.diffClass + "'>" + sDiff + "</span>",
                    "</div>"
                ].join("");
            }).join("");
        },

        // ── Error fallback inside Round 2 list area ───────────────────
        _showRound2Error: function () {
            var oR2Dom = this.getView().byId("round2SectionHtml") ?
                this.getView().byId("round2SectionHtml").getDomRef() : null;
            if (!oR2Dom) { return; }
            var oListEl = oR2Dom.querySelector("#r2ProblemList");
            if (oListEl) {
                oListEl.innerHTML = "<div class='aiqR2Error'>Could not load Round 2 problems. Please try again.</div>";
            }
        },

        // ── Helper: difficulty → CSS class ────────────────────────────
        _getDiffClass: function (sDiff) {
            var s = (sDiff || "").toLowerCase();
            if (s === "easy")   { return "aiqDiffEasy"; }
            if (s === "medium") { return "aiqDiffMedium"; }
            if (s === "hard")   { return "aiqDiffHard"; }
            return "aiqDiffEasy";
        },

        // ── Navigation ────────────────────────────────────────────────
        onReviewAnswers: function () {
            this.getOwnerComponent().getRouter().navTo("review");
        },

        onNewTest: function () {
            this.getOwnerComponent().getRouter().navTo("setup");
        },

        onStartRound2: function () {
            var oSession     = this.getOwnerComponent().getModel("session");
            var oResultModel = this.getOwnerComponent().getModel("resultState");

            // Pass everything the Coding controller needs via session model
            oSession.setProperty("/round1Completed",   true);
            oSession.setProperty("/currentRound",      2);
            oSession.setProperty("/round2Test",        oResultModel.getProperty("/round2Test")     || {});
            oSession.setProperty("/round2Problems",    oResultModel.getProperty("/round2Problems") || []);
            oSession.setProperty("/round2ElapsedTime", 0);
            oSession.setProperty("/round2Answers",     []);

            this.getOwnerComponent().getRouter().navTo("view1");
        }

    });
});