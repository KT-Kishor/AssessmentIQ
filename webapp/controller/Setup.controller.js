sap.ui.define([
  "./BaseController", // Import BaseController 
  "sap/m/MessageToast"
], function (BaseController, MessageToast) {
  "use strict";

  return BaseController.extend("sap.com.interview.controller.Setup", {
    onInit: function () {
      var oRouter = this.getOwnerComponent().getRouter();
      oRouter.getRoute("setup").attachPatternMatched(this._onRouteMatched, this);
    },
    _onRouteMatched: function () {
      var oSession = this.getOwnerComponent().getModel("session");

      if (!oSession.getProperty("/candidateName")) {
        return this.getOwnerComponent().getRouter().navTo("login");
      }
      this.QuestionsReadCall(1, "oQuestionStatsModel");
      this.QuestionsReadCall(2, "oProgrammingModel");
    },
    onStartAptitude: function () {
      this.getOwnerComponent().getRouter().navTo("start");
    },

    onStartProgramming: function () {
      this.getOwnerComponent().getRouter().navTo("view1");
    },

    QuestionsReadCall: function (testId, modelName) {
      var oPage = this.byId("homePage");
      oPage.setBusy(true);

      this.ajaxReadWithJQuery("Questions", { test_id: testId })
        .then(response => {
          oPage.setBusy(false);

          var aQuestions = response.questions || [];
          var tests = response.test || [];
          var totalPoints = 0;

          aQuestions.forEach(q => {
            totalPoints += Number(q.marks || 0);
          });

          var oModel = new sap.ui.model.json.JSONModel({
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
