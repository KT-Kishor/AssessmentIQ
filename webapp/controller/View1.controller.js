sap.ui.define([
    "./BaseController", // Import BaseController 
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/VBox",
    "sap/m/HBox",
    "sap/m/Text",
    "sap/m/FormattedText",
    "sap/m/ObjectStatus",
    "sap/m/Button",
    "sap/ui/core/Icon",
], function (BaseController, JSONModel, MessageToast, VBox, HBox, Text, FormattedText, ObjectStatus, Button, Icon) {
    "use strict";

    var EXT_MAP = { JavaScript: "solution.js", Java: "Solution.java", Python: "solution.py" };
    var DIFF_STATE = { Easy: "Success", Medium: "Warning", Hard: "Error" };
    var STATUS_STATE = { "Submitted": "Success", "In Progress": "Warning", "Not Attempted": "None" };

    return BaseController.extend("sap.com.interview.controller.View1", {
        //  LIFECYCLE
        // ─────────────────────────────────────────────────
        onInit: function () {
            this._timerInterval = null;
            this._state = this.getOwnerComponent().getModel("state");

            // We will initialize this._questions dynamically inside the route pattern match listener instead.
            this._questions = [];

            var self = this;
            this.getOwnerComponent().getRouter().getRoute("view1").attachPatternMatched(function () {

                const oSession = self.getOwnerComponent().getModel("session");

                if (!oSession.getProperty("/candidateName")) return self.getOwnerComponent().getRouter().navTo("login");

                // 1. Fetch the raw payload data from 'oProgrammingModel'
                var oViewModel = self.getView().getModel("oProgrammingModel");
                var oRawData = oViewModel ? oViewModel.getData() : null;
                var aRawQuestions = oRawData && oRawData.Questions ? oRawData.Questions : [];

                // Helper safe JSON parse methods
                var parseJSON = function (str) { try { return JSON.parse(str || "{}"); } catch (e) { return {}; } };
                var parseArray = function (str) { try { return JSON.parse(str || "[]"); } catch (e) { return []; } };

                // 2. Transform the raw backend questions into the clean structures your view elements expect
                self._questions = aRawQuestions.map(function (q) {
                    var aExamples = (q.options || []).map(function (opt) {
                        var oNoteObj = parseJSON(opt.note);
                        return {
                            input: oNoteObj.input || "",
                            output: oNoteObj.output || "",
                            note: oNoteObj.description || ""
                        };
                    });

                    return {
                        id: q.id,
                        title: q.title,
                        difficulty: q.difficulty ? q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1) : "Easy",
                        skill: q.skill_levels ? q.skill_levels.split(",") : [],
                        languages: q.allowed_languages ? q.allowed_languages.split(",") : [],
                        topic: q.topic,
                        desc: q.question_text,
                        constraints: parseArray(q.constraints),
                        examples: aExamples,
                        starter: parseJSON(q.starter_code),
                        status: "Not Attempted", // Baseline status expected by STATUS_STATE badge object
                        codeStore: { JavaScript: "", Java: "", Python: "" } // Container to cache user draft inputs
                    };
                });

                // 3. Keep your global 'questions' component model synchronized if other views depend on it
                var oQuestionsComponentModel = self.getOwnerComponent().getModel("questions");
                if (oQuestionsComponentModel) {
                    oQuestionsComponentModel.setProperty("/items", self._questions);
                }

                // 4. Reset state controls and kick off UI layout updates
                self._state.setProperty("/currentIndex", 0);
                self._state.setProperty("/questionLabel", "Q 1 of " + self._questions.length);

                // Dynamically configure timer limit if "Duration" comes directly from the test configuration properties
                if (oRawData && oRawData.Duration) {
                    var iSeconds = oRawData.Duration * 60; // converts minutes to seconds
                    self._state.setProperty("/timerSeconds", iSeconds);
                }

                self._buildDots();
                self._loadQuestion(0);

                if (self._timerInterval) { clearInterval(self._timerInterval); }
                self._startTimer();
            });
        },

        onExit: function () {
            if (this._timerInterval) { clearInterval(this._timerInterval); }
        },

        // ─────────────────────────────────────────────────
        //  QUESTION LOADING
        // ─────────────────────────────────────────────────
        _loadQuestion: function (index) {
            debugger;
            var q = this._questions[index];
            var lang = this._state.getProperty("/currentLang") || "JavaScript";
            var view = this.getView();

            if (!q) {
                sap.m.MessageToast.show("Error: Selected question context is unavailable.");
                return;
            }

            // 1. Core State Properties Sync
            this._state.setProperty("/currentIndex", index);
            this._state.setProperty("/questionLabel", "Q " + (index + 1) + " of " + this._questions.length);
            this._updateProgress();

            // 2. Header Meta Properties Initialization
            view.byId("qNumLabel").setText("Question " + (index + 1) + " of " + this._questions.length);
            view.byId("qTitle").setText(q.title || "Coding Challenge");

            // Difficulty Badges Control
            var sDifficulty = q.difficulty || "easy";
            var diffBadge = view.byId("diffBadge");
            diffBadge.setText(sDifficulty);
            if (typeof DIFF_STATE !== "undefined") {
                diffBadge.setState(DIFF_STATE[sDifficulty] || "None");
            }
            diffBadge.removeStyleClass("badge-easy badge-medium badge-hard");
            diffBadge.addStyleClass("badge-" + sDifficulty.toLowerCase());

            // Status Badges
            var sStatus = q.status || "Unsolved";
            var statusBadge = view.byId("statusBadge");
            statusBadge.setText(sStatus);
            if (typeof STATUS_STATE !== "undefined") {
                statusBadge.setState(STATUS_STATE[sStatus] || "None");
            }

            view.byId("topicBadge").setText(q.topic || "General");

            // 3. FIX: Handle problem description text gracefully across payload variations
            var sProblemText = q.question_text || q.description || q.desc || "";
            view.byId("qDesc").setHtmlText("<p style='line-height:1.5; color:#333;'>" + sProblemText + "</p>");

            // 4. FIX: Safely parse both "examples" and nested "options" layout arrays
            var exBox = view.byId("examplesContainer");
            exBox.destroyItems();

            // Normalize raw options data to a standard array format
            var aRawExamples = q.examples || q.options || [];

            aRawExamples.forEach(function (ex, i) {
                var rows = new sap.m.VBox().addStyleClass("exampleBlock");
                rows.addItem(new sap.m.Text({ text: "Example " + (i + 1) }).addStyleClass("exLabel"));

                // Extract data properly, whether flat or nested within an option block
                var sInputVal = "";
                var sOutputVal = "";
                var sNoteVal = "";

                if (ex.note && typeof ex.note === "object") {
                    sInputVal = ex.note.input || "";
                    sOutputVal = ex.note.output || "";
                    sNoteVal = ex.note.description || ex.note.note || "";
                } else {
                    sInputVal = ex.input || "";
                    sOutputVal = ex.output || "";
                    sNoteVal = ex.note || "";
                }

                // Render Input Row
                var inRow = new sap.m.HBox();
                inRow.addItem(new sap.m.Text({ text: "Input:" }).addStyleClass("exKey"));
                inRow.addItem(new sap.m.Text({ text: sInputVal }).addStyleClass("exVal"));
                rows.addItem(inRow);

                // Render Output Row
                var outRow = new sap.m.HBox();
                outRow.addItem(new sap.m.Text({ text: "Output:" }).addStyleClass("exKey"));
                outRow.addItem(new sap.m.Text({ text: sOutputVal }).addStyleClass("exVal"));
                rows.addItem(outRow);

                // Render Explanation Note Row if it exists
                if (sNoteVal) {
                    rows.addItem(new sap.m.Text({ text: "// " + sNoteVal }).addStyleClass("exNote"));
                }

                exBox.addItem(rows);
            });

            // 5. Constraints Array Safe Iteration
            var conBox = view.byId("constraintsContainer");
            conBox.destroyItems();

            var aConstraints = q.constraints || [];
            aConstraints.forEach(function (c) {
                // Safe check: extract string if constraint arrives as an object wrapper
                var sConstraintText = typeof c === "object" ? (c.text || c.option_text || "") : c;

                if (sConstraintText) {
                    var row = new sap.m.HBox({ alignItems: "Center" }).addStyleClass("constraintRow");
                    row.addItem(new sap.ui.core.Icon({ src: "sap-icon://circle-task-2" }).addStyleClass("constraintBullet"));
                    row.addItem(new sap.m.Text({ text: sConstraintText }).addStyleClass("constraintText"));
                    conBox.addItem(row);
                }
            });

            // 6. FIX: Resolve code strings accurately across 'starter_code' and 'starter' keys
            var oStarterSource = q.starter_code || q.starter || {};
            var oStorageSource = q.codeStore || {};
            var code = oStorageSource[lang] || oStarterSource[lang] || "";

            view.byId("codeEditor").setValue(code);

            var sExt = "js";
            if (lang === "Python") { sExt = "py"; }
            else if (lang === "Java") { sExt = "java"; }
            view.byId("fileInfo").setText((typeof EXT_MAP !== "undefined" ? EXT_MAP[lang] : null) || "solution." + sExt);

            // 7. Navigation Buttons State Enforcement
            view.byId("prevBtn").setEnabled(index > 0);
            view.byId("nextBtn").setEnabled(index < this._questions.length - 1);

            // Clear previous output views and trigger dots updates
            this._resetOutput();
            this._updateDots();
        },

        _resetOutput: function () {
            var view = this.getView();
            view.byId("outputPlaceholder").setVisible(true);
            view.byId("runningIndicator").setVisible(false);
            view.byId("testResultsContainer").setVisible(false);
            view.byId("testResultsContainer").destroyItems();
            view.byId("testSummary").setVisible(false);
        },

        // ─────────────────────────────────────────────────
        //  NAVIGATION
        // ─────────────────────────────────────────────────
        onPrev: function () {
            var idx = this._state.getProperty("/currentIndex");
            if (idx > 0) { this._saveCurrentCode(); this._loadQuestion(idx - 1); }
        },

        onNext: function () {
            var idx = this._state.getProperty("/currentIndex");
            if (idx < this._questions.length - 1) { this._saveCurrentCode(); this._loadQuestion(idx + 1); }
        },

        onDotPress: function (index) {
            this._saveCurrentCode();
            this._loadQuestion(index);
        },

        _saveCurrentCode: function () {
            var idx = this._state.getProperty("/currentIndex");
            var lang = this._state.getProperty("/currentLang");
            var code = this.getView().byId("codeEditor").getValue();
            this._questions[idx].codeStore[lang] = code;
        },

        // ─────────────────────────────────────────────────
        //  LANGUAGE
        // ─────────────────────────────────────────────────
        onLangChange: function (oEvent) {
            this._saveCurrentCode();
            var lang = oEvent.getParameter("selectedItem").getKey();
            this._state.setProperty("/currentLang", lang);
            var idx = this._state.getProperty("/currentIndex");
            var q = this._questions[idx];
            this.getView().byId("codeEditor").setValue(q.codeStore[lang] || q.starter[lang] || "");
            this.getView().byId("fileInfo").setText(EXT_MAP[lang]);
            MessageToast.show("Switched to " + lang);
        },

        onCodeChange: function () {
            this._saveCurrentCode();
        },

        // ─────────────────────────────────────────────────
        //  RESET
        // ─────────────────────────────────────────────────
        onReset: function () {
            var idx = this._state.getProperty("/currentIndex");
            var lang = this._state.getProperty("/currentLang");
            var q = this._questions[idx];
            this.getView().byId("codeEditor").setValue(q.starter[lang] || "");
            q.codeStore[lang] = "";
            MessageToast.show("Code reset to starter template");
        },

        // ─────────────────────────────────────────────────
        //  RUN
        // ─────────────────────────────────────────────────
        onRun: function () {
            var idx = this._state.getProperty("/currentIndex");
            var lang = this._state.getProperty("/currentLang") || "JavaScript";
            var q = this._questions[idx];

            if (!q) {
                sap.m.MessageToast.show("Question context is unavailable!");
                return;
            }

            var code = this.getView().byId("codeEditor").getValue().trim();
            var sStarterCode = q.starter && q.starter[lang] ? q.starter[lang].trim() : "";

            if (!code || code === sStarterCode) {
                sap.m.MessageToast.show("Write your solution first!");
                return;
            }

            var view = this.getView();
            view.byId("outputPlaceholder").setVisible(false);
            view.byId("runningIndicator").setVisible(true);
            view.byId("testResultsContainer").setVisible(false);
            view.byId("testSummary").setVisible(false);
            view.byId("runBtn").setEnabled(false);

            var self = this;
            setTimeout(async function () {
                try {
                    var results = await self._simulateTestResults(q);
                    self._renderTestResults(results, q);
                } catch (oErr) {
                    sap.m.MessageToast.show("Test Execution Interrupted: " + oErr.message);
                } finally {
                    view.byId("runningIndicator").setVisible(false);
                    view.byId("runBtn").setEnabled(true);
                }
            }, 900);
        },

        // ─────────────────────────────────────────────────────────────────────────────
        // 3. RENDER TEST RESULTS: Resolves control references natively
        // ─────────────────────────────────────────────────────────────────────────────
        _renderTestResults: function (results, q) {
            var view = this.getView();
            var container = view.byId("testResultsContainer");
            container.destroyItems();

            var passed = 0;
            results.forEach(function (r, i) {
                if (r.pass) { passed++; }

                // Explicitly using sap.m namespaced constructs to prevent global ReferenceErrors
                var block = new sap.m.VBox().addStyleClass("testBlock " + (r.pass ? "test-pass" : "test-fail"));

                // Header configuration
                var hdr = new sap.m.HBox({ alignItems: "Center" }).addStyleClass("testBlockHdr " + (r.pass ? "test-hdr-pass" : "test-hdr-fail"));
                hdr.addItem(new sap.ui.core.Icon({ src: r.pass ? "sap-icon://accept" : "sap-icon://decline" }).addStyleClass(r.pass ? "iconPass" : "iconFail"));
                hdr.addItem(new sap.m.Text({ text: " Test " + (i + 1) + " — " + (r.pass ? "Passed" : "Failed") }).addStyleClass("testHdrText"));
                // hdr.addItem(new sap.m.Text({ text: r.time + "ms" }).addStyleClass("testTime"));
                block.addItem(hdr);

                // Content details container
                var body = new sap.m.VBox().addStyleClass("testBlockBody");
                [
                    ["Input:", r.input],
                    ["Expected:", r.expected],
                    ["Got:", r.got]
                ].forEach(function (pair) {
                    var row = new sap.m.HBox({ alignItems: "Start" }).addStyleClass("testRow");
                    row.addItem(new sap.m.Text({ text: pair[0] }).addStyleClass("testKey"));
                    row.addItem(new sap.m.Text({ text: pair[1] }).addStyleClass(r.pass || pair[0] !== "Got:" ? "testVal" : "testValFail"));
                    body.addItem(row);
                });
                block.addItem(body);
                container.addItem(block);
            });

            container.setVisible(true);

            // Render aggregated status summary layout
            var summary = view.byId("testSummaryStatus");
            var total = results.length;
            if (passed === total) {
                summary.setText("All " + total + " tests passed");
                summary.setState("Success");
                sap.m.MessageToast.show("All " + total + " test cases passed!");
            } else {
                summary.setText((total - passed) + " / " + total + " tests failed");
                summary.setState("Error");
                sap.m.MessageToast.show((total - passed) + " test case(s) failed");
            }
            view.byId("testSummary").setVisible(true);
        },

        // ─────────────────────────────────────────────────────────────────────────────
        // 1. DYNAMIC SUBMIT FUNCTION
        // ─────────────────────────────────────────────────────────────────────────────
        onSubmit: async function () {
            var view = this.getView();
            var submitBtn = view.byId("submitBtn");

            // 1. Double-click Guard Layer: Prevents spamming requests while running
            if (!submitBtn.getEnabled()) return;
            
            submitBtn.setText("⏳ Evaluating...");
            submitBtn.setEnabled(false);

            var idx = this._state.getProperty("/currentIndex");
            var q = this._questions ? this._questions[idx] : null;

            // 2. EMPTY-DATA GUARD: Block submission if data isn't loaded ("Q 1 of 0" bug fix)
            if (!q || Object.keys(q).length === 0) {
                sap.m.MessageToast.show("Question data is still loading or invalid. Please refresh the page!");
                submitBtn.setText("✓ Submit");
                submitBtn.setEnabled(true);
                return;
            }

            var lang = this._state.getProperty("/currentLang") || "JavaScript";
            var code = view.byId("codeEditor").getValue().trim();
            var sStarterCode = q.starter && q.starter[lang] ? q.starter[lang].trim() : "";

            // Validate that the user actually wrote some code
            if (!code || code === sStarterCode) {
                sap.m.MessageToast.show("Write your solution before submitting!");
                submitBtn.setText("✓ Submit");
                submitBtn.setEnabled(true);
                return;
            }

            // 3. STRICT LOCAL RUNTIME VALIDATION GUARD
            var localTestResults = [];
            var allLocalTestsPassed = true;

            try {
                localTestResults = await this._simulateTestResults(q);
                allLocalTestsPassed = localTestResults.every(function (r) { return r.pass; });
            } catch (e) {
                allLocalTestsPassed = false;
            }

            // Stop execution early if their code breaks the basic example cases locally
            if (!allLocalTestsPassed && lang === "JavaScript") {
                view.byId("outputPlaceholder").setVisible(false);
                view.byId("runningIndicator").setVisible(false);
                this._renderTestResults(localTestResults, q);

                sap.m.MessageToast.show("Code fails local validation tests. Fix errors before submitting!");
                submitBtn.setText("✓ Submit");
                submitBtn.setEnabled(true);
                return;
            }

            // Adjust visibility flags for the submission run phase
            view.byId("outputPlaceholder").setVisible(false);
            view.byId("runningIndicator").setVisible(true);
            view.byId("testResultsContainer").setVisible(false);
            view.byId("testSummary").setVisible(false);

            var oAiPanel = view.byId("aiFeedbackPanel");
            if (oAiPanel) oAiPanel.setVisible(false);

            // 4. Map UI Data into the Exact payload structure the backend expects
            var oPayload = {
                title: q.title || "",
                difficulty: q.difficulty || "easy",
                topic: q.topic || "General",
                language: lang,
                question_text: q.description || q.question_text || "",
                constraints: q.constraints || [],
                examples: (q.examples || []).map(function (ex) {
                    return { input: ex.input, output: ex.output, note: ex.note || "" };
                }),
                code: code
            };

            var self = this;

            // 5. Fire your Custom AJAX Wrapper
            this.ajaxCreateWithJQuery("evaluateStudentCode", {data: oPayload})
                .then(function (response) {
                    // Safe check: Parse if response comes back as a raw string stream
                    if (typeof response === "string") {
                        try {
                            response = JSON.parse(response);
                        } catch (e) {
                            throw new Error("Invalid response string format received from server.");
                        }
                    }

                    // Verify Express payload wrapper architecture
                    if (!response.success || !response.result) throw new Error(response.error || "Evaluation failed or returned an empty result payload.");

                    // Drill down to your actual evaluation object keys
                    var analysis = response.result;

                    // Turn off loading animation spinner
                    view.byId("runningIndicator").setVisible(false);

                    // 6. Save data into local state tracker properties
                    q.status = "Submitted";
                    q.aiScore = analysis.correctnessScore !== undefined ? analysis.correctnessScore : 0;

                    // Build a highly-professional, styled HTML presentation layout
                    q.aiFeedback = [
                        "<div style='font-size: 1.1rem; margin-bottom: 8px;'><strong>Evaluation Summary:</strong></div>",
                        "<p style='color: #555; line-height: 1.4; margin-bottom: 12px;'>" + (analysis.detailedFeedback || "No detailed breakdown summary provided.") + "</p>",
                        "<hr style='border: 0; border-top: 1px solid #e5e5e5; margin: 12px 0;'>",
                        "<table style='width: 100%; border-collapse: collapse; font-size: 0.95rem;'>",
                        "  <tr>",
                        "    <td style='padding: 6px 0; color: #666; width: 40%;'><strong>Time Complexity:</strong></td>",
                        "    <td style='padding: 6px 0; font-family: monospace; font-weight: bold; color: #004085;'>" + (analysis.timeComplexity || "Not Provided") + "</td>",
                        "  </tr>",
                        "  <tr>",
                        "    <td style='padding: 6px 0; color: #666;'><strong>Space Complexity:</strong></td>",
                        "    <td style='padding: 6px 0; font-family: monospace; font-weight: bold; color: #004085;'>" + (analysis.spaceComplexity || "Not Provided") + "</td>",
                        "  </tr>",
                        "</table>"
                    ].join("");

                    // Collate weaknesses and strengths into suggestions list
                    q.aiSuggestions = (analysis.weaknesses || []).map(function (w) { return "⚠ " + w; }).concat(
                        (analysis.strengths || []).map(function (s) { return "✓ " + s; })
                    );

                    // Update the lower output pane test list representation
                    self._renderTestResults(localTestResults, q);

                    // 7. Update UI Text Fields safely with real server values
                    if (view.byId("aiScoreTitle")) view.byId("aiScoreTitle").setText(q.aiScore + " / 10");

                    if (view.byId("aiFeedbackText")) view.byId("aiFeedbackText").setHtmlText(q.aiFeedback);

                    // Rebuild Suggestions Box natively using sap.m elements & icons
                    var sugBox = view.byId("aiSuggestionsContainer");
                    if (sugBox) {
                        sugBox.destroyItems();
                        q.aiSuggestions.forEach(function (s) {
                            var isWarning = s.startsWith("⚠");
                            var sStyle = isWarning ? "margin-left: 8px; font-weight: 500; color: #bb0000;" : "margin-left: 8px; color: #007000;";
                            var sIcon = isWarning ? "sap-icon://alert" : "sap-icon://accept";
                            var sIconColor = isWarning ? "Critical" : "Positive";

                            var sugRow = new sap.m.HBox({
                                alignItems: "Center",
                                class: "sapUiTinyMarginBottom"
                            });

                            sugRow.addItem(new sap.ui.core.Icon({ src: sIcon, color: sIconColor }));
                            sugRow.addItem(new sap.m.FormattedText().setHtmlText("<span style='" + sStyle + "'>" + s.substring(2) + "</span>"));
                            sugBox.addItem(sugRow);
                        });
                    }

                    // Display the freshly populated AI feedback canvas panel
                    if (oAiPanel) {
                        oAiPanel.setVisible(true);
                    }

                    // 8. Sync Progress Elements across upper navigation bar components
                    self._updateDots();

                    var statusBadge = view.byId("statusBadge");
                    if (statusBadge) {
                        statusBadge.setText("Submitted");
                        statusBadge.setState(q.aiScore >= 4 ? "Success" : "Error");
                    }

                    self._updateProgress();
                    sap.m.MessageToast.show("Evaluation processing complete!");

                    // FIXED: Save ONLY the current question answer instead of looping all
                    return self.saveCurrentCandidateAnswer(q, code);
                })
                .then(function () {
                    // Finally, commit total aggregated balance metrics down to TestAttempt table
                    return self.UpdateTestAttempt("In Progress");
                })
                .then(function () {
                    sap.m.MessageToast.show("All solution progress successfully secured to DB!");
                })
                .catch(function (err) {
                    view.byId("runningIndicator").setVisible(false);
                    var sErrorMsg = err.message || err.responseText || "An unexpected networking issue occurred.";
                    sap.m.MessageToast.show("Submission failed: " + sErrorMsg);
                    console.error(err);
                })
                .then(function () {
                    // 9. ALWAYS unlock submit button state regardless of process execution paths
                    submitBtn.setText("✓ Submit");
                    submitBtn.setEnabled(true);
                });
        },

        UpdateTestAttempt: function (status) {
            var oSession = this.getOwnerComponent().getModel("session");

            // For a coding test, calculating aggregated metrics across all attempted questions
            var iTotalQuestions = this._questions ? this._questions.length : 0;
            var iTotalScore = 0;

            if (this._questions) {
                this._questions.forEach(function (q) {
                    iTotalScore += q.aiScore ? parseFloat(q.aiScore) : 0;
                });
            }

            var iMaxPossiblePoints = iTotalQuestions * 10;
            var iCalculatedPercentage = iMaxPossiblePoints > 0 ? ((iTotalScore / iMaxPossiblePoints) * 100).toFixed(2) : 0;

            var oPayload = {
                status: status, // "In Progress" or final status if terminating test
                submitted_at: new Date().toISOString(),
                total_marks: iTotalScore,
                score: iCalculatedPercentage,
                result_status: iCalculatedPercentage >= 40 ? "Pass" : "Fail"
            };

            var requestData = {
                filters: {
                    id: oSession.getProperty("/attemptId")
                },
                data: oPayload
            };

            return this.ajaxUpdateWithJQuery("TestAttempt", requestData)
                .then(function (response) {
                    return response;
                })
                .catch(function (error) {
                    throw error;
                });
        },

        // FIXED FUNCTION NAME & APPROACH: Focuses only on the submitted question to prevent duplicate rows
        saveCurrentCandidateAnswer: function (oQuestion, sCurrentCode) {
            var oSession = this.getOwnerComponent().getModel("session");
            var attemptId = oSession.getProperty("/attemptId");
            var lang = this._state.getProperty("/currentLang") || "JavaScript";

            var oPayload = {
                attempt_id: attemptId,
                question_id: oQuestion.id,
                marks_awarded: oQuestion.aiScore || 0,
                submitted_code: sCurrentCode || "",
                language: lang,
                ai_feedback: oQuestion.aiFeedback || "",
                ai_score: oQuestion.aiScore || 0,
                code_status: oQuestion.status || "Submitted"
            };

            // NOTE: If your backend framework uses Upsert logic (Update if exists, else insert), 
            // make sure your standard endpoint maps this using primary keys (attempt_id + question_id)
            return this.ajaxCreateWithJQuery("CandidateAnswers", {
                data: oPayload
            })
                .then(function (response) {
                    return response;
                })
                .catch(function (error) {
                    throw error;
                });
        },
        // =========================================================================
        // RUN TESTS BUTTON ACTION HANDLER (PROMISE THEN VERSION)
        // =========================================================================
        onRunTestsButtonPress: async function () {
            var view = this.getView();
            var q = this._questions[this._state.getProperty("/currentIndex")];

            view.byId("outputPlaceholder").setVisible(false);
            view.byId("runningIndicator").setVisible(true);

            // Call the async function and extract the data inside .then()
            await this._simulateTestResults(q)
                .then(function (aFinalResults) {
                    this._renderTestResults(aFinalResults, q);
                }.bind(this))
                .catch(function (oError) {
                    console.error(oError);
                })
                .finally(function () {
                    view.byId("runningIndicator").setVisible(false);
                });
        },

        _simulateTestResults: async function (q) {
            var view = this.getView();
            var code = view.byId("codeEditor").getValue().trim();
            var lang = this._state.getProperty("/currentLang") || "JavaScript";
            var aExamples = q.examples || q.options || [];

            // DYNAMIC RESOLUTION: Auto-extract the target function name from the editor source template
            var functionName = q.functionName || q.entryPoint;
            if (!functionName) {
                if (lang === "JavaScript") {
                    var oVarMatch = code.match(/(?:var|let|const)\s+([a-zA-Z0-9_]+)\s*=\s*function/);

                    if (oVarMatch) {
                        functionName = oVarMatch[1];
                    } else {
                        // 2. Fallback to classic style declaration: function name(
                        var oClassicMatch = code.match(/function\s+([a-zA-Z0-9_]+)\s*\(/);
                        functionName = oClassicMatch ? oClassicMatch[1] : "solution";
                    }
                } else if (lang === "Python") {
                    var oMatch = code.match(/def\s+([a-zA-Z0-9_]+)\s*\(/);
                    functionName = oMatch ? oMatch[1] : "solution";
                } else if (lang === "Java") {
                    var oMatch = code.match(/(?:public|protected|private|static|\s) +[\w\<\>\[\]]+\s+([a-zA-Z0-9_]+)\s*\(/);
                    functionName = oMatch ? oMatch[1] : "solution";
                }
            }

            // Prepare unified payload object structure for ALL runtime engine environments
            var oPayload = {
                title: q.title || "Coding Challenge",
                language: lang,
                code: code,
                functionName: functionName,
                cases: aExamples.map(function (ex) {
                    var oNote = ex.note && typeof ex.note === "object" ? ex.note : ex;
                    return {
                        input: oNote.input,
                        output: oNote.output
                    };
                })
            };

            // =========================================================================
            // UNIFIED ASYNC/AWAIT PIPELINE FOR ALL LANGUAGES
            // =========================================================================
            try {
                // Await the response array straight from the wrapper utility call
                var aBackendResults = await this.ajaxCreateWithJQuery("run", {
                    data: oPayload
                });

                // Return the clean matrix data array [ {input, expected, got, pass} ]
                return aBackendResults;

            } catch (error) {
                // Fallback row error mapping grid if connection drops or environment is unreachable
                var sMsg = error.responseText || error.message || "Failed to reach compilation service.";

                return aExamples.map(function (ex) {
                    var oNote = ex.note && typeof ex.note === "object" ? ex.note : ex;
                    return {
                        input: oNote.input,
                        expected: oNote.output,
                        got: "RuntimeError: " + sMsg,
                        pass: false,
                        time: 0
                    };
                });
            }
        },
        // ─────────────────────────────────────────────────
        //  SUBMIT ALL (top bar)
        // ─────────────────────────────────────────────────
        onSubmitAll: function () {
            var submitted = this._questions.filter(function (q) { return q.status === "Submitted"; }).length;
            MessageToast.show(submitted + " / " + this._questions.length + " questions submitted. Finalising assessment...");
        },

        // ─────────────────────────────────────────────────
        //  PROGRESS DOTS
        // ─────────────────────────────────────────────────
        _buildDots: function () {
            var dotBar = this.getView().byId("dotContainer");
            dotBar.destroyItems();
            var self = this;
            this._questions.forEach(function (q, i) {
                var btn = new Button({
                    text: String(i + 1),
                    type: "Default",
                    press: self.onDotPress.bind(self, i)
                }).addStyleClass("navDot");
                btn.data("index", i);
                dotBar.addItem(btn);
            });
        },

        _updateDots: function () {
            var idx = this._state.getProperty("/currentIndex");
            var dotBar = this.getView().byId("dotContainer");
            var items = dotBar.getItems();
            var qs = this._questions;

            items.forEach(function (btn, i) {
                btn.removeStyleClass("dot-active dot-submitted dot-inprogress dot-untouched");
                if (qs[i].status === "Submitted") { btn.addStyleClass("dot-submitted"); }
                else if (qs[i].status === "In Progress") { btn.addStyleClass("dot-inprogress"); }
                else { btn.addStyleClass("dot-untouched"); }
                if (i === idx) { btn.addStyleClass("dot-active"); }
            });
        },

        _updateProgress: function () {
            var submitted = this._questions.filter(function (q) { return q.status === "Submitted"; }).length;
            var pct = Math.round((submitted / this._questions.length) * 100);
            this._state.setProperty("/progressPct", pct + "%");
        },

        // ─────────────────────────────────────────────────
        //  TIMER
        // ─────────────────────────────────────────────────
        _startTimer: function () {
            var self = this;
            this._updateTimerDisplay();
            this._timerInterval = setInterval(function () {
                var secs = self._state.getProperty("/timerSeconds") - 1;
                if (secs < 0) { secs = 0; clearInterval(self._timerInterval); }
                self._state.setProperty("/timerSeconds", secs);
                self._updateTimerDisplay();
                var timerBtn = self.getView().byId("timerBtn");
                if (secs < 600) {
                    timerBtn.removeStyleClass("timerBtn");
                    timerBtn.addStyleClass("timerBtnWarn");
                }
                if (secs === 0) { MessageToast.show("Time is up! Assessment ended."); }
            }, 1000);
        },

        _updateTimerDisplay: function () {
            var s = this._state.getProperty("/timerSeconds");
            var h = Math.floor(s / 3600);
            var m = Math.floor((s % 3600) / 60);
            var sec = s % 60;
            var display = this._pad(h) + ":" + this._pad(m) + ":" + this._pad(sec);
            this._state.setProperty("/timerDisplay", display);
        },

        _pad: function (n) {
            return String(n).padStart(2, "0");
        }

    });
});
