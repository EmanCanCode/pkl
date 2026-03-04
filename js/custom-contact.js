(function ($) {
  $("#contact_form").validate({
    submitHandler: function (form) {
      var form_btn = $(form).find('button[type="submit"]');
      var form_result_div = "#form-result";
      $(form_result_div).remove();
      form_btn.before(
        '<div id="form-result" class="alert alert-success" role="alert" style="display: none;"></div>',
      );
      var form_btn_old_msg = form_btn.html();
      form_btn.html(form_btn.prop("disabled", true).data("loading-text"));

      var payload = {
        name: $(form).find('[name="form_name"]').val(),
        email: $(form).find('[name="form_email"]').val(),
        subject: $(form).find('[name="form_subject"]').val(),
        phone: $(form).find('[name="form_phone"]').val(),
        message: $(form).find('[name="form_message"]').val(),
      };

      $.ajax({
        url: "/api/contact",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify(payload),
        dataType: "json",
        success: function (data) {
          if (data.status === "true") {
            $(form).find(".form-control").val("");
            $(form_result_div)
              .removeClass("alert-danger")
              .addClass("alert-success");
          } else {
            $(form_result_div)
              .removeClass("alert-success")
              .addClass("alert-danger");
          }
          form_btn.prop("disabled", false).html(form_btn_old_msg);
          $(form_result_div).html(data.message).fadeIn("slow");
          setTimeout(function () {
            $(form_result_div).fadeOut("slow");
          }, 6000);
        },
        error: function () {
          form_btn.prop("disabled", false).html(form_btn_old_msg);
          $(form_result_div)
            .removeClass("alert-success")
            .addClass("alert-danger");
          $(form_result_div)
            .html("Message could not be sent. Please try again.")
            .fadeIn("slow");
          setTimeout(function () {
            $(form_result_div).fadeOut("slow");
          }, 6000);
        },
      });
    },
  });
})(jQuery);
