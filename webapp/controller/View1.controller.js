sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/m/VBox",
    "sap/m/HBox",
    "sap/m/Text",
    "sap/m/FormattedText",
    "sap/m/ObjectStatus",
    "sap/m/Button",
    "sap/ui/core/Icon",
], function (BaseController, JSONModel, MessageToast, MessageBox, VBox, HBox, Text, FormattedText, ObjectStatus, Button, Icon) {
    "use strict";

    var EXT_MAP = { JavaScript: "solution.js", Java: "Solution.java", Python: "solution.py" };
    var DIFF_STATE = { Easy: "Success", Medium: "Warning", Hard: "Error" };
    var STATUS_STATE = { "Submitted": "Success", "In Progress": "Warning", "Not Attempted": "None" };

    return BaseController.extend("sap.com.interview.controller.View1", {

        // ─────────────────────────────────────────────────
        //  LIFECYCLE
        // ─────────────────────────────────────────────────
        onInit: function () {
            this._timerInterval = null;
            this._state = this.getOwnerComponent().getModel("state");

            this._questions = [];

            // ── Fullscreen state flags (mirrors Test controller pattern) ──
            this._testSubmitted = false;
            this._testDialogOpen = false;

            // ── Security: disable right-click, copy, paste, dev shortcuts ──
            // document.addEventListener("contextmenu", function (e) { e.preventDefault(); });
            // document.addEventListener("copy",        function (e) { e.preventDefault(); });
            // document.addEventListener("cut",         function (e) { e.preventDefault(); });
            // document.addEventListener("paste",       function (e) { e.preventDefault(); });
            // document.addEventListener("keydown",     function (e) {
            //     if (e.ctrlKey && ["c","C","x","X","v","V"].indexOf(e.key) !== -1) {
            //         e.preventDefault();
            //     }
            //     // F11 toggles fullscreen manually
            //     if (e.key === "F11") {
            //         e.preventDefault();
            //     }
            // });

            // ── Security: detect fullscreen exit / tab switch / window blur ──
            // NOTE: keep these bindings active even while the listeners below
            // are commented out, so onExit's removeEventListener calls are safe
            // and so re-enabling is a one-line uncomment when you're ready.
            this._boundFullscreenChange = this._onFullscreenChange.bind(this);
            this._boundVisibilityChange = this._onVisibilityChange.bind(this);
            this._boundWindowBlur       = this._onWindowBlur.bind(this);

            // document.addEventListener("fullscreenchange",       this._boundFullscreenChange);
            // document.addEventListener("webkitfullscreenchange", this._boundFullscreenChange);
            // document.addEventListener("visibilitychange",       this._boundVisibilityChange);
            // window.addEventListener("blur",                     this._boundWindowBlur);

            var self = this;
            this.getOwnerComponent().getRouter().getRoute("view1").attachPatternMatched(function () {

                var oSession = self.getOwnerComponent().getModel("session");
                if (!oSession.getProperty("/candidateName")) {
                    return self.getOwnerComponent().getRouter().navTo("login");
                }

                // Reset flags on every fresh route match
                self._testSubmitted = false;
                self._testDialogOpen = false;

                // 1. Fetch raw payload from 'oProgrammingModel'
                var oViewModel = self.getView().getModel("oProgrammingModel");
                var oRawData = oViewModel ? oViewModel.getData() : null;
                var aRawQuestions = oRawData && oRawData.Questions ? oRawData.Questions : [];

                var parseJSON = function (str) { try { return JSON.parse(str || "{}"); } catch (e) { return {}; } };
                var parseArray = function (str) { try { return JSON.parse(str || "[]"); } catch (e) { return []; } };

                // 2. Transform raw questions into clean view structures
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
                        status: "Not Attempted",
                        codeStore: { JavaScript: "", Java: "", Python: "" }
                    };
                });

                // 3. Sync global 'questions' component model
                var oQuestionsComponentModel = self.getOwnerComponent().getModel("questions");
                if (oQuestionsComponentModel) {
                    oQuestionsComponentModel.setProperty("/items", self._questions);
                }

                // 4. Reset state and build UI
                self._state.setProperty("/currentIndex", 0);
                self._state.setProperty("/questionLabel", "Q 1 of " + self._questions.length);

                if (oRawData && oRawData.Duration) {
                    self._state.setProperty("/timerSeconds", oRawData.Duration * 60);
                }

                self._buildDots();
                self._loadQuestion(0);

                if (self._timerInterval) { clearInterval(self._timerInterval); }
                self._startTimer();

                // ── Enter fullscreen when the coding test starts ──
                self._enterFullscreen();
            });
        },

        onExit: function () {
            if (this._timerInterval) { clearInterval(this._timerInterval); }

            // Clean up fullscreen and all event listeners
            this._exitFullscreen();
            document.removeEventListener("fullscreenchange", this._boundFullscreenChange);
            document.removeEventListener("webkitfullscreenchange", this._boundFullscreenChange);
            document.removeEventListener("visibilitychange", this._boundVisibilityChange);
            window.removeEventListener("blur", this._boundWindowBlur);
        },

        // ─────────────────────────────────────────────────
        //  FULLSCREEN HELPERS  (mirrors Test controller)
        // ─────────────────────────────────────────────────

        /** Request fullscreen across all browser vendors */
        _enterFullscreen: function () {
            var elem = document.documentElement;
            if (elem.requestFullscreen) { elem.requestFullscreen(); }
            else if (elem.webkitRequestFullscreen) { elem.webkitRequestFullscreen(); }
            else if (elem.msRequestFullscreen) { elem.msRequestFullscreen(); }
        },

        /** Exit fullscreen safely, checking element exists first */
        _exitFullscreen: function () {
            if (document.fullscreenElement ||
                document.webkitFullscreenElement ||
                document.msFullscreenElement) {
                if (document.exitFullscreen) { document.exitFullscreen(); }
                else if (document.webkitExitFullscreen) { document.webkitExitFullscreen(); }
                else if (document.msExitFullscreen) { document.msExitFullscreen(); }
            }
        },

        /**
         * Fires when Esc is pressed or browser exits fullscreen.
         * Guarded by _testSubmitted so it does NOT fire on a valid submit.
         */
        _onFullscreenChange: function () {
            if (!document.fullscreenElement &&
                !document.webkitFullscreenElement &&
                !this._testSubmitted &&
                !this._testDialogOpen) {
                this._autoSubmitTest("You have exited fullscreen mode.");
            }
        },

        _onVisibilityChange: function () {
            if (document.hidden &&
                !this._testSubmitted &&
                !this._testDialogOpen) {
                this._autoSubmitTest("Tab was switched or window was minimized.");
            }
        },

        _onWindowBlur: function () {
            if (!this._testSubmitted &&
                !this._testDialogOpen) {
                this._autoSubmitTest("Window lost focus.");
            }
        },

        /**
         * Warns the user and optionally force-submits.
         * If the user clicks No → re-enter fullscreen.
         */
        _autoSubmitTest: function (sMessage) {
            if (this._testDialogOpen) { return; }

            this._testDialogOpen = true;
            var self = this;

            MessageBox.show(
                sMessage + "\n\nDo you want to submit the test now?",
                {
                    icon: MessageBox.Icon.WARNING,
                    title: "Warning",
                    actions: [MessageBox.Action.YES, MessageBox.Action.NO],

                    onClose: function (oAction) {
                        self._testDialogOpen = false;

                        if (oAction === MessageBox.Action.YES) {
                            self._testSubmitted = true;
                            // Exit fullscreen then finalise
                            self._exitFullscreen();
                            self.onSubmitAll();          // existing finalise logic
                        } else {
                            // User wants to continue → put them back in fullscreen
                            setTimeout(function () {
                                self._enterFullscreen();
                            }, 300);
                        }
                    }
                }
            );
        },

        /**
         * Force-finalises the ENTIRE test attempt regardless of which question
         * the candidate is currently on. Used by the anti-cheat auto-submit flow
         * (fullscreen exit / tab switch / window blur) and can also be wired to
         * the "Submit All" toolbar button.
         *
         * Unlike onSubmit() (which submits ONE question), this:
         *   1. Saves the candidate's current in-progress code for the active
         *      question (even if it hasn't been run/validated) so nothing is lost.
         *   2. Marks the TestAttempt as submitted via UpdateTestAttempt.
         *   3. Shows a single confirmation dialog and stops the timer.
         */
        onSubmitAll: function () {
            var self = this;
            var view = this.getView();

            if (this._timerInterval) {
                clearInterval(this._timerInterval);
                this._timerInterval = null;
            }

            // Persist whatever code is currently in the editor before finalising
            this._saveCurrentCode();

            var idx = this._state.getProperty("/currentIndex");
            var q   = this._questions ? this._questions[idx] : null;
            var lang = this._state.getProperty("/currentLang") || "JavaScript";
            var code = view.byId("codeEditor") ? view.byId("codeEditor").getValue().trim() : "";

            var pSaveCurrent = Promise.resolve();

            // Only attempt to save the current question's answer if it hasn't
            // already been submitted and there's actual code to save.
            if (q && q.status !== "Submitted" && code) {
                q.status = q.aiScore ? q.status : "Submitted";
                pSaveCurrent = this.saveCurrentCandidateAnswer(q, code).catch(function (err) {
                    // Don't block finalisation if this single save fails —
                    // log it, the TestAttempt-level submit below still proceeds.
                    console.error("Failed to save final in-progress answer:", err);
                });
            }

            pSaveCurrent
                .then(function () {
                    return self.UpdateTestAttempt("submitted");
                })
                .then(function () {
                    self._testSubmitted = true;

                    sap.m.MessageBox.success(
                        "Your assessment has been submitted. Thank you for attending the interview! Our experts will evaluate your code and get back to you soon.",
                        {
                            title: "Assessment Submitted Successfully",
                            actions: [sap.m.MessageBox.Action.OK]
                        }
                    );
                })
                .catch(function (err) {
                    var sErrorMsg = err && (err.message || err.responseText) || "An unexpected error occurred while submitting.";
                    sap.m.MessageToast.show("Submission failed: " + sErrorMsg);
                    console.error(err);
                });
        },

        // ─────────────────────────────────────────────────
        //  QUESTION LOADING
        // ─────────────────────────────────────────────────
        _loadQuestion: function (index) {
            var q = this._questions[index];
            var lang = this._state.getProperty("/currentLang") || "JavaScript";
            var view = this.getView();

            if (!q) return sap.m.MessageToast.show("Error: Selected question context is unavailable.");

            // 1. Core State Properties Sync
            this._state.setProperty("/currentIndex", index);
            this._state.setProperty("/questionLabel", "Q " + (index + 1) + " of " + this._questions.length);
            this._updateProgress();

            // 2. Header Meta Properties
            view.byId("qNumLabel").setText("Question " + (index + 1) + " of " + this._questions.length);
            view.byId("qTitle").setText(q.title || "Coding Challenge");

            var sDifficulty = q.difficulty || "easy";
            var diffBadge = view.byId("diffBadge");
            diffBadge.setText(sDifficulty);
            if (typeof DIFF_STATE !== "undefined") diffBadge.setState(DIFF_STATE[sDifficulty] || "None");

            diffBadge.removeStyleClass("badge-easy badge-medium badge-hard");
            diffBadge.addStyleClass("badge-" + sDifficulty.toLowerCase());

            var sStatus = q.status || "Unsolved";
            var statusBadge = view.byId("statusBadge");
            statusBadge.setText(sStatus);
            if (typeof STATUS_STATE !== "undefined") statusBadge.setState(STATUS_STATE[sStatus] || "None");

            view.byId("topicBadge").setText(q.topic || "General");

            // 3. Problem description
            var sProblemText = q.question_text || q.description || q.desc || "";
            view.byId("qDesc").setHtmlText("<p style='line-height:1.5; color:#333;'>" + sProblemText + "</p>");

            // 4. Examples
            var exBox = view.byId("examplesContainer");
            exBox.destroyItems();

            var aRawExamples = q.examples || q.options || [];
            aRawExamples.forEach(function (ex, i) {
                var rows = new sap.m.VBox().addStyleClass("exampleBlock");
                rows.addItem(new sap.m.Text({ text: "Example " + (i + 1) }).addStyleClass("exLabel"));

                var sInputVal = "", sOutputVal = "", sNoteVal = "";
                if (ex.note && typeof ex.note === "object") {
                    sInputVal = ex.note.input || "";
                    sOutputVal = ex.note.output || "";
                    sNoteVal = ex.note.description || ex.note.note || "";
                } else {
                    sInputVal = ex.input || "";
                    sOutputVal = ex.output || "";
                    sNoteVal = ex.note || "";
                }

                var inRow = new sap.m.HBox();
                inRow.addItem(new sap.m.Text({ text: "Input:" }).addStyleClass("exKey"));
                inRow.addItem(new sap.m.Text({ text: sInputVal }).addStyleClass("exVal"));
                rows.addItem(inRow);

                var outRow = new sap.m.HBox();
                outRow.addItem(new sap.m.Text({ text: "Output:" }).addStyleClass("exKey"));
                outRow.addItem(new sap.m.Text({ text: sOutputVal }).addStyleClass("exVal"));
                rows.addItem(outRow);

                if (sNoteVal) rows.addItem(new sap.m.Text({ text: "// " + sNoteVal }).addStyleClass("exNote"));

                exBox.addItem(rows);
            });

            // 5. Constraints
            var conBox = view.byId("constraintsContainer");
            conBox.destroyItems();

            var aConstraints = q.constraints || [];
            aConstraints.forEach(function (c) {
                var sConstraintText = typeof c === "object" ? (c.text || c.option_text || "") : c;
                if (sConstraintText) {
                    var row = new sap.m.HBox({ alignItems: "Center" }).addStyleClass("constraintRow");
                    row.addItem(new sap.ui.core.Icon({ src: "sap-icon://circle-task-2" }).addStyleClass("constraintBullet"));
                    row.addItem(new sap.m.Text({ text: sConstraintText }).addStyleClass("constraintText"));
                    conBox.addItem(row);
                }
            });

            // 6. Code editor
            var oStarterSource = q.starter_code || q.starter || {};
            var oStorageSource = q.codeStore || {};
            var code = oStorageSource[lang] || oStarterSource[lang] || "";
            view.byId("codeEditor").setValue(code);

            var sExt = "js";
            if (lang === "Python") { sExt = "py"; }
            else if (lang === "Java") { sExt = "java"; }
            view.byId("fileInfo").setText((typeof EXT_MAP !== "undefined" ? EXT_MAP[lang] : null) || "solution." + sExt);

            // 7. Navigation buttons
            view.byId("prevBtn").setEnabled(index > 0);
            view.byId("nextBtn").setEnabled(index < this._questions.length - 1);

            this._resetOutput();
            this._updateDots();

            // 8. Check if this question was already submitted (CandidateAnswers lookup)
            // Guarded against race conditions: if the candidate navigates away
            // before this resolves, the result is discarded instead of being
            // applied to whatever question is now on screen.
            this._checkIfAnswerExists(q, index);
        },

        /**
         * @param {Object} oQuestion - question object to check
         * @param {Number} nRequestedIndex - the _currentQuestion index at the
         *        time this check was kicked off, used to discard stale results
         *        if the candidate has since navigated to a different question.
         */
        _checkIfAnswerExists: async function (oQuestion, nRequestedIndex) {
            var oSession = this.getOwnerComponent().getModel("session");
            var attemptId = oSession.getProperty("/attemptId");
            var view = this.getView();

            if (!attemptId || !oQuestion || !oQuestion.id) return false;

            try {
                var aResults = await this.ajaxReadWithJQuery("CandidateAnswers", {
                    filters: {
                        attempt_id: attemptId,
                        question_id: oQuestion.id
                    }
                });

                // ── Stale-response guard ──
                // If the candidate has moved to a different question while this
                // request was in flight, drop the result instead of mutating the
                // currently-displayed question's button/badge state.
                if (this._state.getProperty("/currentIndex") !== nRequestedIndex) {
                    return false;
                }

                var submitBtn = view.byId("submitBtn");
                var bExists = Array.isArray(aResults) && aResults.length > 0;

                if (bExists) {
                    var oExisting = aResults[0];

                    // Sync local question state from the saved record
                    oQuestion.status = "Submitted";
                    oQuestion.aiScore = oExisting.ai_score || oExisting.marks_awarded || 0;

                    // Lock the Submit button — already answered
                    if (submitBtn) {
                        submitBtn.setText("✓ Submitted");
                        submitBtn.setEnabled(false);
                    }

                    // Reflect "Submitted" on the status badge too
                    var statusBadge = view.byId("statusBadge");
                    if (statusBadge) {
                        statusBadge.setText("Submitted");
                        statusBadge.setState(STATUS_STATE["Submitted"] || "Success");
                    }

                    // Restore the previously submitted code into the editor
                    var lang = this._state.getProperty("/currentLang") || "JavaScript";
                    if (oExisting.submitted_code) {
                        oQuestion.codeStore[oExisting.language || lang] = oExisting.submitted_code;
                        view.byId("codeEditor").setValue(oExisting.submitted_code);
                    }

                    this._updateDots();
                    this._updateProgress();
                } else {
                    // No existing record — make sure Submit button is enabled/normal
                    if (submitBtn) {
                        submitBtn.setText("✓ Submit");
                        submitBtn.setEnabled(true);
                    }
                }
                return bExists;
            } catch (oErr) {
                console.error("Failed to check existing CandidateAnswers record:", oErr);
                // Fail-open: don't block the candidate if the check itself errors out
                return false;
            }
        },

        _resetOutput: function () {
            var view = this.getView();
            view.byId("outputPlaceholder").setVisible(true);
            view.byId("runningIndicator").setVisible(false);
            view.byId("testResultsContainer").setVisible(false);
            view.byId("testResultsContainer").destroyItems();
            // view.byId("testSummary").setVisible(false);
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
            // view.byId("testSummary").setVisible(false);
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

        // ─────────────────────────────────────────────────
        //  RENDER TEST RESULTS
        // ─────────────────────────────────────────────────
        _renderTestResults: function (results, q) {
            var view = this.getView();
            var container = view.byId("testResultsContainer");
            container.destroyItems();

            var passed = 0;
            results.forEach(function (r, i) {
                if (r.pass) { passed++; }

                var block = new sap.m.VBox().addStyleClass("testBlock " + (r.pass ? "test-pass" : "test-fail"));

                var hdr = new sap.m.HBox({ alignItems: "Center" }).addStyleClass("testBlockHdr " + (r.pass ? "test-hdr-pass" : "test-hdr-fail"));
                hdr.addItem(new sap.ui.core.Icon({ src: r.pass ? "sap-icon://accept" : "sap-icon://decline" }).addStyleClass(r.pass ? "iconPass" : "iconFail"));
                hdr.addItem(new sap.m.Text({ text: " Test " + (i + 1) + " — " + (r.pass ? "Passed" : "Failed") }).addStyleClass("testHdrText"));
                block.addItem(hdr);

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

            // var summary = view.byId("testSummaryStatus");
            var total = results.length;
            if (passed === total) {
                // summary.setText("All " + total + " tests passed");
                // summary.setState("Success");
                sap.m.MessageToast.show("All " + total + " test cases passed!");
            } else {
                // summary.setText((total - passed) + " / " + total + " tests failed");
                // summary.setState("Error");
                sap.m.MessageToast.show((total - passed) + " test case(s) failed");
            }
            // view.byId("testSummary").setVisible(true);
        },

        // ─────────────────────────────────────────────────
        //  SUBMIT (HANDLES MULTIPLE QUESTIONS CORRECTLY)
        // ─────────────────────────────────────────────────
        onSubmit: async function () {
            var view = this.getView();
            var submitBtn = view.byId("submitBtn");

            if (!submitBtn.getEnabled()) { return; }

            submitBtn.setText("⏳ Evaluating...");
            submitBtn.setEnabled(false);

            var idx = this._state.getProperty("/currentIndex");
            var q = this._questions ? this._questions[idx] : null;

            if (!q || Object.keys(q).length === 0) {
                sap.m.MessageToast.show("Question data is still loading or invalid. Please refresh the page!");
                submitBtn.setText("✓ Submit");
                submitBtn.setEnabled(true);
                return;
            }

            var lang = this._state.getProperty("/currentLang") || "JavaScript";
            var code = view.byId("codeEditor").getValue().trim();
            var sStarterCode = q.starter && q.starter[lang] ? q.starter[lang].trim() : "";

            if (!code || code === sStarterCode) {
                sap.m.MessageToast.show("Write your solution before submitting!");
                submitBtn.setText("✓ Submit");
                submitBtn.setEnabled(true);
                return;
            }

            var localTestResults = [];
            var allLocalTestsPassed = true;

            try {
                localTestResults = await this._simulateTestResults(q);
                allLocalTestsPassed = localTestResults.every(function (r) { return r.pass; });
            } catch (e) {
                allLocalTestsPassed = false;
            }

            if (!allLocalTestsPassed && lang === "JavaScript") {
                view.byId("outputPlaceholder").setVisible(false);
                view.byId("runningIndicator").setVisible(false);
                this._renderTestResults(localTestResults, q);

                sap.m.MessageToast.show("Code fails local validation tests. Fix errors before submitting!");
                submitBtn.setText("✓ Submit");
                submitBtn.setEnabled(true);
                return;
            }

            view.byId("outputPlaceholder").setVisible(false);
            view.byId("runningIndicator").setVisible(true);
            view.byId("testResultsContainer").setVisible(false);
            // view.byId("testSummary").setVisible(false);

            // var oAiPanel = view.byId("aiFeedbackPanel");
            // if (oAiPanel) { oAiPanel.setVisible(false); }

            var self = this;

            Promise.resolve()
                .then(function () {
                    view.byId("runningIndicator").setVisible(false);

                    var totalTests = localTestResults.length || 1;
                    var passedCount = localTestResults.filter(function (r) { return r.pass; }).length;
                    var calculatedScore = Math.round((passedCount / totalTests) * 10);

                    q.status = "Submitted";
                    q.aiScore = calculatedScore;

                    self._renderTestResults(localTestResults, q);

                    // if (view.byId("aiScoreTitle")) { view.byId("aiScoreTitle").setText(q.aiScore + " / 10"); }

                    // if (view.byId("aiFeedbackText")) {
                    //     view.byId("aiFeedbackText").setHtmlText("<div style='color: #666;'>Local test runs complete. Solution recorded.</div>");
                    // }
                    // var sugBox = view.byId("aiSuggestionsContainer");
                    // if (sugBox) { sugBox.destroyItems(); }
                    // if (oAiPanel) { oAiPanel.setVisible(true); }

                    self._updateDots();

                    var statusBadge = view.byId("statusBadge");
                    if (statusBadge) {
                        statusBadge.setText("Submitted");
                        statusBadge.setState(q.aiScore >= 4 ? "Success" : "Error");
                    }

                    self._updateProgress();

                    // Step 1: Save the answer for this single question to the DB first
                    return self.saveCurrentCandidateAnswer(q, code);
                })
                .then(function () {
                    // ─── CHECK IF THIS IS THE LAST QUESTION ───
                    var iTotalQuestions = self._questions ? self._questions.length : 0;
                    var isLastQuestion = (idx === iTotalQuestions - 1);

                    if (isLastQuestion) {
                        // If it's the final question, lock the entire TestAttempt as "submitted"
                        return self.UpdateTestAttempt("submitted")
                            .then(function () {
                                self._testSubmitted = true;

                                sap.m.MessageBox.success(
                                    "Thank you for attending the interview! Our experts will evaluate your code and get back to you soon.",
                                    {
                                        title: "Assessment Submitted Successfully",
                                        actions: [sap.m.MessageBox.Action.OK],
                                        onClose: function (oAction) {
                                            // Optional: Redirect candidate back to summary portal dashboard
                                        }
                                    }
                                );
                            });
                    } else {
                        // If there are more questions remaining, just show a success toast and don't close the test
                        sap.m.MessageToast.show("Solution for Question " + (idx + 1) + " saved successfully! Proceed to the next question.");
                        return Promise.resolve();
                    }
                })
                .catch(function (err) {
                    view.byId("runningIndicator").setVisible(false);
                    var sErrorMsg = err.message || err.responseText || "An unexpected database issue occurred.";
                    sap.m.MessageToast.show("Submission failed: " + sErrorMsg);
                    console.error(err);
                })
                .then(function () {
                    // Toggle buttons elegantly based on whether it was the final submission or not
                    var iTotalQuestions = self._questions ? self._questions.length : 0;
                    if (idx === iTotalQuestions - 1) {
                        submitBtn.setText("✓ Submitted");
                        submitBtn.setEnabled(false);
                    } else {
                        submitBtn.setText("✓ Resubmit");
                        submitBtn.setEnabled(true);
                    }
                });
        },

        UpdateTestAttempt: function (status) {
            var oSession = this.getOwnerComponent().getModel("session");
            var oTest = this.getView().getModel("oProgrammingModel").getProperty("/tests");

            var iTotalQuestions = this._questions ? this._questions.length : 0;
            var iTotalScore = 0;

            if (this._questions) {
                this._questions.forEach(function (q) { iTotalScore += q.aiScore ? parseFloat(q.aiScore) : 0; });
            }

            var iMaxPossiblePoints = iTotalQuestions * 10;
            var iCalculatedPercentage = iMaxPossiblePoints > 0 ? ((iTotalScore / iMaxPossiblePoints) * 100).toFixed(2) : 0;

            var oPayload = {
                status: status,
                submitted_at: new Date().toISOString(),
                total_marks: iTotalScore,
                score: iCalculatedPercentage,
                result_status: iCalculatedPercentage >= parseFloat(oTest.pass_score) ? "Pass" : "Fail",
                test_id: oTest.id
            };

            return this.ajaxUpdateWithJQuery("TestAttempt", {
                filters: { id: oSession.getProperty("/attemptId") },
                data: oPayload
            });
        },

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
                ai_feedback: "Local validation completed.",
                ai_score: oQuestion.aiScore || 0,
                code_status: oQuestion.status || "Submitted"
            };

            return this.ajaxCreateWithJQuery("CandidateAnswers", { data: oPayload });
        },

        // ─────────────────────────────────────────────────
        //  RUN TESTS BUTTON
        // ─────────────────────────────────────────────────
        onRunTestsButtonPress: async function () {
            var view = this.getView();
            var q = this._questions[this._state.getProperty("/currentIndex")];

            view.byId("outputPlaceholder").setVisible(false);
            view.byId("runningIndicator").setVisible(true);

            await this._simulateTestResults(q)
                .then(function (aFinalResults) {
                    this._renderTestResults(aFinalResults, q);
                }.bind(this))
                .catch(function (oError) { console.error(oError); })
                .finally(function () { view.byId("runningIndicator").setVisible(false); });
        },

        _simulateTestResults: async function (q) {
            var view = this.getView();
            var code = view.byId("codeEditor").getValue().trim();
            var lang = this._state.getProperty("/currentLang") || "JavaScript";
            var aExamples = q.examples || q.options || [];

            var functionName = q.functionName || q.entryPoint;
            if (!functionName) {
                if (lang === "JavaScript") {
                    var oVarMatch = code.match(/(?:var|let|const)\s+([a-zA-Z0-9_]+)\s*=\s*function/);
                    if (oVarMatch) {
                        functionName = oVarMatch[1];
                    } else {
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

            var oPayload = {
                title: q.title || "Coding Challenge",
                language: lang,
                code: code,
                functionName: functionName,
                cases: aExamples.map(function (ex) {
                    var oNote = ex.note && typeof ex.note === "object" ? ex.note : ex;
                    return { input: oNote.input, output: oNote.output };
                })
            };

            try {
                return await this.ajaxCreateWithJQuery("run", { data: oPayload });
            } catch (error) {
                var sMsg = error.responseText || error.message || "Failed to reach compilation service.";
                return aExamples.map(function (ex) {
                    var oNote = ex.note && typeof ex.note === "object" ? ex.note : ex;
                    return { input: oNote.input, expected: oNote.output, got: "RuntimeError: " + sMsg, pass: false, time: 0 };
                });
            }
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
            this._state.setProperty("/timerDisplay", this._pad(h) + ":" + this._pad(m) + ":" + this._pad(sec));
        },

        _pad: function (n) {
            return String(n).padStart(2, "0");
        }

    });
});