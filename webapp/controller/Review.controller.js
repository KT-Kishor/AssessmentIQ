sap.ui.define([
    "./BaseController", // Import BaseController
], function (BaseController) {
    "use strict";

    return BaseController.extend("sap.com.interview.controller.Review", {

        // ── Lifecycle ─────────────────────────────────────────────────
        onInit: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("review").attachPatternMatched(this._onRouteMatched, this);
        },

        // ── Route Match Handler ───────────────────────────────────────
        _onRouteMatched: function () {
            setTimeout(function () {
                this._renderReviewContent();
            }.bind(this), 0);
        },

        // ── Dynamic HTML Generator Engine ─────────────────────────────
        _renderReviewContent: function () {
            var oComponent = this.getOwnerComponent();
            var oStatsModel = oComponent.getModel("oQuestionStatsModel");
            var oSession = oComponent.getModel("session");

            // Safeguards: Handle cases where direct page refresh clears model data
            if (!oStatsModel || !oSession || !oStatsModel.getProperty("/Questions")) {
                var oHTMLControl = this.byId("reviewListHtml");
                if (oHTMLControl) {
                    oHTMLControl.setContent("<div class='aiqNoData'>No assessment data available for review. Please restart.</div>");
                }
                return;
            }

            var aQuestions = oStatsModel.getProperty("/Questions");
            var aAnswers = oSession.getProperty("/answers") || [];
            var sHtml = "<div class='aiqReviewCardsContainer'>";

            // Loop through all questions to build comparison structures
            aQuestions.forEach(function (oQ, nIndex) {
                var nCandidateSelectedOptionId = aAnswers[nIndex];
                var bSkipped = (nCandidateSelectedOptionId === null || nCandidateSelectedOptionId === undefined);

                // Find the option object that the candidate actually selected
                var oCandidateOption = oQ.options.find(function (opt) {
                    return opt.id === nCandidateSelectedOptionId;
                });

                // Determine overall correctness flag for the current question layout card
                var bIsCorrect = false;
                if (!bSkipped && oCandidateOption && oCandidateOption.is_correct === 1) {
                    bIsCorrect = true;
                }

                // Start building Card Wrapper
                sHtml += "<div class='aiqQCard'>";
                sHtml += "  <div class='aiqQCardContent'>";
                
                // 1. Badge Header Status (Top-aligned)
                if (bSkipped) {
                    sHtml += "  <span class='aiqReviewBadge aiqBadgeWarning'>SKIPPED</span>";
                } else if (bIsCorrect) {
                    sHtml += "  <span class='aiqReviewBadge aiqBadgeSuccess'>CORRECT</span>";
                } else {
                    sHtml += "  <span class='aiqReviewBadge aiqBadgeError'>INCORRECT</span>";
                }

                // 2. Question Number Counter
                var sDisplayNum = ("0" + (nIndex + 1)).slice(-2);
                sHtml += "    <div class='aiqQNumber'>QUESTION " + sDisplayNum + "</div>";

                // 3. Question Text Prompt
                sHtml += "    <div class='aiqQText'>" + oQ.question_text + "</div>";

                // 4. Options Container Stack
                sHtml += "    <div class='aiqOptionsList'>";

                oQ.options.forEach(function (oOpt, nOptIndex) {
                    // Generate UI display letters (A, B, C, D...) dynamically from array indices
                    var sOptLetter = String.fromCharCode(65 + nOptIndex);
                    
                    var bIsCandidateChoice = (oOpt.id === nCandidateSelectedOptionId);
                    var bIsThisCorrect = (oOpt.is_correct === 1);
                    
                    var sModifierClass = "";
                    var sRadioCls = "aiqRadioCircle";

                    // Determine CSS highlighting classes based on database configuration match flags
                    if (bIsThisCorrect) {
                        sModifierClass = " aiqOptCorrect"; // Soft Green Background for the correct answer
                        sRadioCls += " aiqRadioCheckedCorrect";
                    } else if (bIsCandidateChoice && !bIsCorrect) {
                        sModifierClass = " aiqOptWrong";   // Soft Red Background if candidate chose a wrong answer
                        sRadioCls += " aiqRadioCheckedWrong";
                    } else if (bIsCandidateChoice) {
                        sRadioCls += " aiqRadioCheckedCorrect";
                    }

                    sHtml += "      <div class='aiqOption" + sModifierClass + "' style='cursor: default;'>";
                    
                    // Custom Simulated Radio Button Node
                    sHtml += "        <div class='" + sRadioCls + "'>";
                    sHtml += "          <div class='aiqRadioDot'></div>";
                    sHtml += "        </div>";

                    // Letter Badge (A, B, C, D)
                    sHtml += "        <div class='aiqOptLetter'>" + sOptLetter + "</div>";
                    
                    // Answer Content Description Text
                    sHtml += "        <div class='aiqOptText'>" + oOpt.option_text + "</div>";
                    sHtml += "      </div>";
                });

                sHtml += "    </div>"; // End options stack
                sHtml += "  </div>";   // End card content body
                sHtml += "</div>";     // End card wrapper
            });

            sHtml += "</div>";

            // Inject template string cleanly into target HTML control instance
            var oTargetControl = this.byId("reviewListHtml");
            if (oTargetControl) {
                oTargetControl.setContent(sHtml);
                
                // Secondary check: Ensure frame redraws if DOM execution contexts lag
                if (oTargetControl.getDomRef()) {
                    oTargetControl.invalidate();
                }
            }
        },

        // ── Navigation Link Target ────────────────────────────────────
        onBackToResults: function () {
            this.getOwnerComponent().getRouter().navTo("result");
        }

    });
});