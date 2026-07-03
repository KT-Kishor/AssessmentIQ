sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/ui/core/BusyIndicator",
  "sap/m/MessageToast",
], function (Controller, JSONModel, BusyIndicator, MessageToast) {
  "use strict";

  return Controller.extend("sap.com.interview.controller.BaseController", {

    getRouter: function () {
      return sap.ui.core.UIComponent.getRouterFor(this);
    },

    //Common read call for all the app
    async ajaxReadWithJQuery(sUrl, filter) {
      const queryString = new URLSearchParams(filter).toString();
      return new Promise((resolve, reject) => {
        $.ajax({
          url: this.getView().getModel("session").getData().url + sUrl + "?" + queryString,
          method: "GET",
          headers: this.getView().getModel("session").getData().headers,
          success: (data) => {
            resolve(data);
          },
          error: (error) => {
            reject(error);
          }
        });
      });
    },
    //Common create call for all the app
    async ajaxCreateWithJQuery(sUrl, oPayLoad) {
      return new Promise((resolve, reject) => {
        $.ajax({
          url: this.getView().getModel("session").getData().url + sUrl,
          method: "POST",
          data: JSON.stringify(oPayLoad),
          headers: this.getView().getModel("session").getData().headers,
          success: function (data) {
            resolve(data);
          },
          error: function (error) {
            reject(error);
          }
        });
      });
    },
    //Common update call for all the app
    async ajaxUpdateWithJQuery(sUrl, oPayLoad) {
      return new Promise((resolve, reject) => {
        $.ajax({
          url: this.getView().getModel("session").getData().url + sUrl,
          method: "PUT",
          data: JSON.stringify(oPayLoad),
          headers: this.getView().getModel("session").getData().headers,
          success: function (data) {
            resolve(data);
          },
          error: function (error) {
            reject(error);
          }
        });
      });
    },
    //Common delete call for all the app
    async ajaxDeleteWithJQuery(sUrl, oPayLoad) {
      return new Promise((resolve, reject) => {
        $.ajax({
          url: this.getView().getModel("session").getData().url + sUrl,
          method: "DELETE",
          contentType: "application/json",
          dataType: "json",
          data: JSON.stringify(oPayLoad),
          headers: this.getView().getModel("session").getData().headers,
          success: function (data) {
            resolve(data);
          },
          error: function (error) {
            reject(error);
          }
        });
      });
    },

    updateCandidateLoginStatus: function (candidateId, bStatus) {

      var oPayload = {
        filters: {
          id: candidateId
        },
        data: {
          isLoggedIn: bStatus,
          loginTime: new Date().toISOString()
        }
      };

      this.ajaxUpdateWithJQuery("Candidate", oPayload)
        .then(function (response) {
          console.log("Candidate login status updated.");
        })
        .catch(function () {
          sap.m.MessageBox.error("Unable to update candidate.");
        });
    }

  })
});