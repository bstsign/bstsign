(function ($) {
  $(document).ready(function () {
    // Get fieldVars from wp_localize_script in cautocomplete.php
    var autocompleteFields = $('input.cautocomplete');
    if (autocompleteFields.length > 0) {
      for (var autocompleteField of autocompleteFields) {
        var autocompleteOptions =
          window[`${$(autocompleteField).attr('id')}_fieldVars`].options;
        makeAutocompleteField(
          autocompleteField,
          Object.keys(autocompleteOptions)
        );
      }
    }
  });
})(jQuery);

function makeAutocompleteField(autocompleteField, autocompleteOptions) {
  numResults = $(autocompleteField).data('num_results');
  $(autocompleteField).autocomplete(
    {
      source: (request, response) => {
        var results = $.ui.autocomplete.filter(
          autocompleteOptions,
          request.term
        );
        response(results.slice(0, numResults));
      },
      select: (event, ui) => {
        $(autocompleteField).val(ui.item.label);
        $(autocompleteField).trigger('keyup');
      },
    },
    {}
  );

  $(autocompleteField).on('keyup', (event) => {
    $(autocompleteField).attr(
      'value_is_from_list',
      $.inArray($(autocompleteField).val(), autocompleteOptions) !== -1
        ? 'true'
        : 'false'
    );
    $(autocompleteField).valid();
  });
}
