sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/Device",
    "sap/ui/model/json/JSONModel"
], function (UIComponent, Device, JSONModel) {
    "use strict";

    return UIComponent.extend("sap.com.interview.Component", {

        metadata: {
            manifest: "json",
            interfaces: ["sap.ui.core.IAsyncContentCreation"]
        },

        init: function () {
            UIComponent.prototype.init.apply(this, arguments);

            // Initialize the session model (shared across all views)
            var oSessionModel = new JSONModel({
                url: "https://rest.kalpavrikshatechnologies.com/",
                headers: {
                    name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
                    password: "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u",
                    "Content-Type": "application/json"
                },
                candidateName: "",
                candidateEmail: "",
                currentQuestion: 0,
                totalQuestions: 10,
                timeLimit: 15,
                timeLeft: 900,
                answers: [],
                submitted: false,
                startTime: null,
                elapsedTime: 0,
                score: 0,
                correctCount: 0,
                wrongCount: 0,
                timerRunning: false
            });
            this.setModel(oSessionModel, "session");

            // Initialize router
            this.getRouter().initialize();
        }
    });
});