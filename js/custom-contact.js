(function ($) {
  $("#contact_form").validate({
    submitHandler: function (form) {
      var name = $(form).find('[name="form_name"]').val();
      var email = $(form).find('[name="form_email"]').val();
      var subject = $(form).find('[name="form_subject"]').val() || "Contact Form Inquiry";
      var phone = $(form).find('[name="form_phone"]').val();
      var message = $(form).find('[name="form_message"]').val();

      var body = "Name: " + name + "\n";
      body += "Email: " + email + "\n";
      if (phone) body += "Phone: " + phone + "\n";
      body += "\n" + message;

      var mailtoLink =
        "mailto:hello@pkl.club" +
        "?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent(body);

      window.location.href = mailtoLink;

      // Show success message
      var form_result_div = "#form-result";
      $(form_result_div).remove();
      $(form).find('button[type="submit"]').before(
        '<div id="form-result" class="alert alert-success" role="alert">Opening your email client...</div>',
      );
      $(form).find(".form-control").val("");
      setTimeout(function () {
        $(form_result_div).fadeOut("slow");
      }, 4000);
    },
  });
})(jQuery);
