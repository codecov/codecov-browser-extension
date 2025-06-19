document.addEventListener("DOMContentLoaded", function () {
  var button = document.getElementById("codecov-consent-accept");
  button.addEventListener("click", async function () {
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
});
