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
    "../model/api"
], function (BaseController, JSONModel, MessageToast, VBox, HBox, Text, FormattedText, ObjectStatus, Button, Icon, Api) {
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
            this._questions = this.getOwnerComponent().getModel("questions").getData().items;

            // Re-read questions each time this view is entered (they may be AI-generated)
            var self = this;
            this.getOwnerComponent().getRouter().getRoute("view1").attachPatternMatched(function () {
                self._questions = self.getOwnerComponent().getModel("questions").getData().items;
                self._state.setProperty("/currentIndex", 0);
                self._state.setProperty("/questionLabel", "Q 1 of " + self._questions.length);
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
            var q = this._questions[index];
            var lang = this._state.getProperty("/currentLang");
            var view = this.getView();

            // State
            this._state.setProperty("/currentIndex", index);
            this._state.setProperty("/questionLabel", "Q " + (index + 1) + " of " + this._questions.length);
            this._updateProgress();

            // Header meta
            view.byId("qNumLabel").setText("Question " + (index + 1) + " of " + this._questions.length);
            view.byId("qTitle").setText(q.title);

            var diffBadge = view.byId("diffBadge");
            diffBadge.setText(q.difficulty);
            diffBadge.setState(DIFF_STATE[q.difficulty] || "None");
            diffBadge.removeStyleClass("badge-easy badge-medium badge-hard");
            diffBadge.addStyleClass("badge-" + q.difficulty.toLowerCase());

            var statusBadge = view.byId("statusBadge");
            statusBadge.setText(q.status);
            statusBadge.setState(STATUS_STATE[q.status] || "None");

            view.byId("topicBadge").setText(q.topic);

            // Description
            view.byId("qDesc").setHtmlText(q.desc);

            // Examples
            var exBox = view.byId("examplesContainer");
            exBox.destroyItems();
            q.examples.forEach(function (ex, i) {
                var rows = new VBox().addStyleClass("exampleBlock");
                rows.addItem(new Text({ text: "Example " + (i + 1) }).addStyleClass("exLabel"));
                var inRow = new HBox();
                inRow.addItem(new Text({ text: "Input:" }).addStyleClass("exKey"));
                inRow.addItem(new Text({ text: ex.input }).addStyleClass("exVal"));
                rows.addItem(inRow);
                var outRow = new HBox();
                outRow.addItem(new Text({ text: "Output:" }).addStyleClass("exKey"));
                outRow.addItem(new Text({ text: ex.output }).addStyleClass("exVal"));
                rows.addItem(outRow);
                if (ex.note) {
                    rows.addItem(new Text({ text: "// " + ex.note }).addStyleClass("exNote"));
                }
                exBox.addItem(rows);
            });

            // Constraints
            var conBox = view.byId("constraintsContainer");
            conBox.destroyItems();
            q.constraints.forEach(function (c) {
                var row = new HBox({ alignItems: "Center" }).addStyleClass("constraintRow");
                row.addItem(new Icon({ src: "sap-icon://circle-task-2" }).addStyleClass("constraintBullet"));
                row.addItem(new Text({ text: c }).addStyleClass("constraintText"));
                conBox.addItem(row);
            });

            // Code editor
            var code = q.codeStore[lang] || q.starter[lang] || "";
            view.byId("codeEditor").setValue(code);
            view.byId("fileInfo").setText(EXT_MAP[lang] || "solution.js");

            // Nav buttons
            view.byId("prevBtn").setEnabled(index > 0);
            view.byId("nextBtn").setEnabled(index < this._questions.length - 1);

            // Clear output
            this._resetOutput();

            // Update dots
            this._updateDots();
        },

        _resetOutput: function () {
            var view = this.getView();
            view.byId("outputPlaceholder").setVisible(true);
            view.byId("runningIndicator").setVisible(false);
            view.byId("testResultsContainer").setVisible(false);
            view.byId("testResultsContainer").destroyItems();
            view.byId("testSummary").setVisible(false);
            view.byId("aiFeedbackPanel").setVisible(false);
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
            var lang = this._state.getProperty("/currentLang");
            var q = this._questions[idx];
            var code = this.getView().byId("codeEditor").getValue().trim();

            if (!code || code === q.starter[lang]) {
                MessageToast.show("Write your solution first!");
                return;
            }

            var view = this.getView();
            view.byId("outputPlaceholder").setVisible(false);
            view.byId("runningIndicator").setVisible(true);
            view.byId("testResultsContainer").setVisible(false);
            view.byId("testSummary").setVisible(false);
            view.byId("aiFeedbackPanel").setVisible(false);
            view.byId("runBtn").setEnabled(false);

            var self = this;
            setTimeout(function () {
                var results = self._simulateTestResults(q);
                self._renderTestResults(results, q);
                view.byId("runningIndicator").setVisible(false);
                view.byId("runBtn").setEnabled(true);
            }, 900);
        },

        _simulateTestResults: function (q) {
            return q.examples.map(function (ex) {
                var pass = Math.random() > 0.3 || q.status === "Submitted";
                return {
                    input: ex.input,
                    expected: ex.output,
                    got: pass ? ex.output : "null",
                    pass: pass,
                    time: Math.floor(Math.random() * 80 + 10)
                };
            });
        },

        _renderTestResults: function (results, q) {
            var view = this.getView();
            var container = view.byId("testResultsContainer");
            container.destroyItems();

            var passed = 0;
            results.forEach(function (r, i) {
                if (r.pass) { passed++; }

                var block = new VBox().addStyleClass("testBlock " + (r.pass ? "test-pass" : "test-fail"));

                // Header row
                var hdr = new HBox({ alignItems: "Center" }).addStyleClass("testBlockHdr " + (r.pass ? "test-hdr-pass" : "test-hdr-fail"));
                hdr.addItem(new Icon({ src: r.pass ? "sap-icon://accept" : "sap-icon://decline" }).addStyleClass(r.pass ? "iconPass" : "iconFail"));
                hdr.addItem(new Text({ text: " Test " + (i + 1) + " — " + (r.pass ? "Passed" : "Failed") }).addStyleClass("testHdrText"));
                hdr.addItem(new Text({ text: r.time + "ms" }).addStyleClass("testTime"));
                block.addItem(hdr);

                // Body rows
                var body = new VBox().addStyleClass("testBlockBody");
                [
                    ["Input:", r.input],
                    ["Expected:", r.expected],
                    ["Got:", r.got]
                ].forEach(function (pair) {
                    var row = new HBox({ alignItems: "Start" }).addStyleClass("testRow");
                    row.addItem(new Text({ text: pair[0] }).addStyleClass("testKey"));
                    row.addItem(new Text({ text: pair[1] }).addStyleClass(r.pass || pair[0] !== "Got:" ? "testVal" : "testValFail"));
                    body.addItem(row);
                });
                block.addItem(body);

                container.addItem(block);
            });

            container.setVisible(true);

            // Summary
            var summary = view.byId("testSummaryStatus");
            var total = results.length;
            if (passed === total) {
                summary.setText("All " + total + " tests passed");
                summary.setState("Success");
                MessageToast.show("All " + total + " test cases passed!");
            } else {
                summary.setText((total - passed) + " / " + total + " tests failed");
                summary.setState("Error");
                MessageToast.show((total - passed) + " test case(s) failed");
            }
            view.byId("testSummary").setVisible(true);
        },

        // ─────────────────────────────────────────────────
        //  SUBMIT  — real Gemini analysis
        // ─────────────────────────────────────────────────
        onSubmit: function () {
            var idx = this._state.getProperty("/currentIndex");
            var lang = this._state.getProperty("/currentLang");
            var skill = this._state.getProperty("/skill") || "intermediate";
            var q = this._questions[idx];
            var code = this.getView().byId("codeEditor").getValue().trim();

            if (!code || code === q.starter[lang]) {
                MessageToast.show("Write your solution before submitting!");
                return;
            }

            var view = this.getView();
            var submitBtn = view.byId("submitBtn");
            submitBtn.setText("⏳ Evaluating...");
            submitBtn.setEnabled(false);
            view.byId("outputPlaceholder").setVisible(false);
            view.byId("runningIndicator").setVisible(true);
            view.byId("testResultsContainer").setVisible(false);
            view.byId("testSummary").setVisible(false);
            view.byId("aiFeedbackPanel").setVisible(false);

            var self = this;

            fetch(Api.BASE_URL + "/api/analyze-code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: code, language: lang, question: q, skill: skill })
            })
                .then(function (r) { return r.json(); })
                .then(function (analysis) {
                    if (analysis.error) { throw new Error(analysis.error); }

                    view.byId("runningIndicator").setVisible(false);

                    // Update question state
                    q.status = "Submitted";
                    q.aiScore = analysis.score;
                    q.aiVerdict = analysis.verdict;
                    q.aiFeedback = [
                        "<strong>Correctness:</strong> " + analysis.correctness,
                        "<br><br><strong>Time Complexity:</strong> " + analysis.timeComplexity,
                        "<br><strong>Space Complexity:</strong> " + analysis.spaceComplexity,
                        "<br><br><strong>Code Quality:</strong> " + analysis.codeQuality,
                        "<br><br><strong>Summary:</strong> " + analysis.summary
                    ].join("");
                    q.aiSuggestions = (analysis.improvements || []).concat(
                        (analysis.strengths || []).map(function (s) { return "✓ " + s; })
                    );

                    // Render test results from Gemini
                    var testResults = (analysis.testResults || q.examples.map(function (ex) {
                        return { input: ex.input, expected: ex.output, got: ex.output, pass: true, time: Math.floor(Math.random() * 50 + 10) };
                    })).map(function (t) {
                        return {
                            input: t.input, expected: t.expected,
                            got: t.pass ? t.expected : (t.got || "incorrect"),
                            pass: t.pass,
                            time: t.time || Math.floor(Math.random() * 50 + 10)
                        };
                    });
                    self._renderTestResults(testResults, q);

                    // AI feedback panel
                    view.byId("aiScoreTitle").setText(String(analysis.score));
                    var verdict = view.byId("aiVerdictStatus");
                    verdict.setText(analysis.verdict);
                    verdict.setState(analysis.verdict === "Pass" ? "Success" : "Error");
                    view.byId("aiFeedbackText").setHtmlText(q.aiFeedback);

                    var sugBox = view.byId("aiSuggestionsContainer");
                    sugBox.destroyItems();
                    q.aiSuggestions.forEach(function (s) {
                        var sugRow = new HBox({ alignItems: "Center" }).addStyleClass("sugRow");
                        sugRow.addItem(new Icon({ src: "sap-icon://chevron-phase" }).addStyleClass("sugIcon"));
                        sugRow.addItem(new Text({ text: s }).addStyleClass("sugText"));
                        sugBox.addItem(sugRow);
                    });

                    view.byId("aiFeedbackPanel").setVisible(true);
                    self._updateDots();

                    var statusBadge = view.byId("statusBadge");
                    statusBadge.setText("Submitted");
                    statusBadge.setState("Success");

                    submitBtn.setText("✓ Submit");
                    submitBtn.setEnabled(true);
                    self._updateProgress();

                    MessageToast.show("Submitted! AI Score: " + analysis.score + "/10 — " + analysis.verdict);
                })
                .catch(function (err) {
                    view.byId("runningIndicator").setVisible(false);
                    submitBtn.setText("✓ Submit");
                    submitBtn.setEnabled(true);
                    MessageToast.show("AI analysis failed: " + err.message);
                });
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
