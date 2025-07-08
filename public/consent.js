document.addEventListener("DOMContentLoaded", function () {
  var consentButton = document.getElementById("codecov-consent-accept");
  consentButton.addEventListener("click", async function () {
    const result = await browser.runtime.sendMessage({
      type: "set_consent",
      payload: true,
    });

    if (result) {
      console.log("Consent granted, closing tab");
      close();
    } else {
      console.error(
        "Something went wrong saving consent. Please report this at https://github.com/codecov/codecov-browser-extension/issues"
      );
    }
  });

  var uninstallButton = document.getElementById("codecov-uninstall");
  uninstallButton.addEventListener("click", async function () {
    await browser.management
      .uninstallSelf()
      .then(() => {
        console.log("App uninstalled, closing tab");
        close();
      })
      .catch(() => {
        console.log(
          "Uninstall confirmation declined or something else went wrong."
        );
        close();
      });
  });
});
