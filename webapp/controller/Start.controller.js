sap.ui.define([
    "./BaseController", // Import BaseController 
    "sap/ui/model/json/JSONModel", // JSON model for data handling
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function(BaseController, JSONModel, MessageToast, MessageBox) {
    "use strict";

    return BaseController.extend("sap.com.interview.controller.Start", {

        onInit: function() {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("start").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function() {
            var oSession = this.getOwnerComponent().getModel("session");
            var sName = oSession.getProperty("/candidateName");
            var sEmail = oSession.getProperty("/candidateEmail");

            // Guard: if no candidate name, redirect back to login
            if (!sName) return this.getOwnerComponent().getRouter().navTo("login");

            this.byId("loggedInText").setText("Logged in as: " + sName + " (" + sEmail + ")");
            this.QuestionsReadCall();
        },

        QuestionsReadCall: function() {
            var oPage = this.byId("startPage");
            oPage.setBusy(true);

            this.ajaxReadWithJQuery("Questions")
                .then(response => {
                    oPage.setBusy(false);

                    var aQuestions = response.questions || [];
                    var tests = response.test || [];
                    var totalPoints = 0;

                    aQuestions.forEach(function(q) {
                        totalPoints += Number(q.marks || 0);
                    });
                    var oStatsModel = new JSONModel({
                        QuestionCount: aQuestions.length,
                        Duration: tests?.duration_mins || 0,
                        TotalPoints: totalPoints,
                        Questions: aQuestions,
                        tests: tests
                    });

                    this.getOwnerComponent().setModel(oStatsModel, "oQuestionStatsModel");

                }).catch((error) => {
                    oPage.setBusy(false);
                    MessageToast.show(
                        JSON.parse(error.responseText).message ||
                        error.message ||
                        error.responseText
                    );
                });
        },

        onBeginTest: function() {
            // 1. Start the global busy indicator immediately
            sap.ui.core.BusyIndicator.show(0); 

            var oSession = this.getOwnerComponent().getModel("session");
            var oQuestionStatsModel = this.getOwnerComponent().getModel("oQuestionStatsModel");

            var aAnswers = [];
            for (var i = 0; i < 10; i++) {
                aAnswers.push(null);
            }

            oSession.setProperty("/answers", aAnswers);
            oSession.setProperty("/currentQuestion", 0);
            oSession.setProperty("/timeLeft",
            oQuestionStatsModel.getProperty("/tests/duration_mins") * 60);
            oSession.setProperty("/submitted", false);
            oSession.setProperty("/startTime", Date.now());
            oSession.setProperty("/elapsedTime", 0);

            var oPayload = {
                candidate_id: oSession.getProperty("/candidates_id"),
                test_id: 2,
                status: "in_progress"
            };

            this.ajaxCreateWithJQuery("TestAttempt", {
                data: oPayload
            }).then(function(response) {
                oSession.setProperty("/attemptId", response?.data?.results?.insertId);

                // Open Camera Dialog (busy indicator stays on)
                this.openCameraDialog();

            }.bind(this)).catch(function() {
                // 2. Hide busy indicator if the AJAX call fails
                sap.ui.core.BusyIndicator.hide(); 
                sap.m.MessageBox.error("Unable to start test.");
            });
        },

        openCameraDialog: function() {
            if (!this.oCameraDialog) {
                sap.ui.core.Fragment.load({
                    name: "sap.com.interview.fragment.SelfieCam",
                    controller: this
                }).then(function(oDialog) {
                    this.oCameraDialog = oDialog;
                    this.getView().addDependent(oDialog);
                    
                    // Turn off busy indicator ONLY after the dialog has successfully opened visually
                    oDialog.attachAfterOpen(function() {
                        sap.ui.core.BusyIndicator.hide();
                        this._StartCamera();
                    }.bind(this));

                    oDialog.attachAfterClose(this._StopCamera.bind(this));
                    oDialog.open();
                }.bind(this)).catch(function() {
                    // 3. Hide busy indicator if fragment loading fails
                    sap.ui.core.BusyIndicator.hide();
                });
            } else {
                // If the dialog already exists, attach a one-time listener to hide the indicator when it re-opens
                this.oCameraDialog.attachEventOnce("afterOpen", function() {
                    sap.ui.core.BusyIndicator.hide();
                });
                this.oCameraDialog.open();
            }
        },

        _StartCamera: async function() {
            try {
                this._cameraStream =
                    await navigator.mediaDevices.getUserMedia({
                        video: true
                    });

                var video = document.getElementById("video");
                if (video) {
                    video.srcObject = this._cameraStream;
                    video.onloadedmetadata = function() {
                        video.play();
                    };
                }

            } catch (error) {
                sap.m.MessageBox.error(
                    "Camera access denied. Please allow camera permission."
                );
            }
        },

        _StopCamera: function() {
            if (this._cameraStream) {
                this._cameraStream.getTracks().forEach(function(track) {
                    track.stop();
                });
                this._cameraStream = null;
            }

            var video = document.getElementById("video");
            if (video) {
                video.srcObject = null;
            }
        },

        IC_onCapturePress: function() {
            var bConsent = sap.ui.getCore().byId("idConsentCheck").getSelected();

            if (!bConsent) {
                sap.m.MessageBox.warning(
                    "Please provide your consent before capturing the photo."
                );
                return;
            }

            var video = document.getElementById("video");
            if (!video) {
                sap.m.MessageToast.show("Camera not ready");
                return;
            }

            var canvas = document.createElement("canvas");
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            var ctx = canvas.getContext("2d");
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            var sBase64Image = canvas.toDataURL("image/jpeg");
            this._saveCandidatePhoto(sBase64Image);
        },

        _saveCandidatePhoto: function(sImage) {
            var oSession = this.getOwnerComponent().getModel("session");
            var oPayload = {
                data: {
                    ID: oSession.getProperty("/candidates_id"),
                    Photo: sImage.split(",")[1]
                },
                filters: {
                    ID: oSession.getProperty("/candidates_id")
                }
            };

            sap.ui.core.BusyIndicator.show(0);
            this.ajaxUpdateWithJQuery("CandidatePhoto", oPayload)
                .then(function() {
                    sap.ui.core.BusyIndicator.hide();
                    sap.m.MessageToast.show("Photo captured successfully");
                    this._StopCamera();
                    if (this.oCameraDialog) {
                        this.oCameraDialog.close();
                    }
                    this._enableFullscreen();
                    this.getOwnerComponent().getRouter().navTo("test");
                }.bind(this)).catch(function() {
                    sap.ui.core.BusyIndicator.hide();
                    sap.m.MessageBox.error("Failed to save photo.");
                });
        },

        _enableFullscreen: function() {
            var elem = document.documentElement;
            if (elem.requestFullscreen) {
                elem.requestFullscreen();
            } else if (elem.webkitRequestFullscreen) {
                elem.webkitRequestFullscreen();
            } else if (elem.msRequestFullscreen) {
                elem.msRequestFullscreen();
            }
        },

        IC_onPressCloseCameraDialog: function() {
            this._StopCamera();
            if (this.oCameraDialog) {
                this.oCameraDialog.close();
            }
        },

        onConsentSelect: function (oEvent) {
            var bSelected = oEvent.getParameter("selected");
            sap.ui.getCore().byId("idCaptureBtn").setEnabled(bSelected);
        }

    });
});