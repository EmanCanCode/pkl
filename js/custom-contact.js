(function ($) {
  var API_BASE = "/api";

  function renderFormResult(form, type, message) {
    var form_result_div = "#form-result";
    $(form_result_div).remove();
    $(form)
      .find('button[type="submit"]')
      .before(
        '<div id="form-result" class="alert alert-' +
          type +
          '" role="alert">' +
          message +
          "</div>",
      );

    setTimeout(function () {
      $(form_result_div).fadeOut("slow");
    }, 4000);
  }

  $("#contact_form").validate({
    submitHandler: function (form) {
      var name = $(form).find('[name="form_name"]').val();
      var email = $(form).find('[name="form_email"]').val();
      var subject =
        $(form).find('[name="form_subject"]').val() || "Contact Form Inquiry";
      var phone = $(form).find('[name="form_phone"]').val();
      var message = $(form).find('[name="form_message"]').val();

      var submitButton = $(form).find('button[type="submit"]');
      submitButton.prop("disabled", true);

      $.ajax({
        type: "POST",
        url: API_BASE + "/contact",
        contentType: "application/json",
        dataType: "json",
        data: JSON.stringify({
          name: name,
          email: email,
          subject: subject,
          phone: phone,
          message: message,
        }),
      })
        .done(function (response) {
          var successMessage =
            (response && response.message) ||
            "Your message has been sent successfully.";
          renderFormResult(form, "success", successMessage);
          $(form).find(".form-control").val("");
        })
        .fail(function (xhr) {
          var errorMessage =
            (xhr.responseJSON && xhr.responseJSON.message) ||
            "Something went wrong while sending your message. Please try again.";
          renderFormResult(form, "danger", errorMessage);
        })
        .always(function () {
          submitButton.prop("disabled", false);
        });
    },
  });
})(jQuery);
