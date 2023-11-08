(function ($) {
  $(document).ready(function () {
    var successActionHandler = function (form) {
        var form_id = $(form).attr('id');
        if (
          window[`cform_${form_id}`].submit_actions.includes(
            'post_submit_function_call'
          ) &&
          window[`cform_${form_id}`].post_sub_success_function_name
        ) {
          console.log('DEBUG: Running post submit success function');
          window[window[`cform_${form_id}`].post_sub_success_function_name]();
        }
        if (
          window[`cform_${form_id}`].submit_actions.includes('redirect') &&
          window[`cform_${form_id}`].redirect_to
        ) {
          var redirectTo = window[`cform_${form_id}`].redirect_to;
          window.location.replace(redirectTo);
        } else if (window[`cform_${form_id}`].submit_success_message) {
          alert(window[`cform_${form_id}`].submit_success_message);
        }
      },
      reservedKeywordsHandler = function (data) {
        console.log('DEBUG: Cecking for reserved keywords in response');
        if (data['alert_message']) {
          alert(data['alert_message']);
        }
        if (data['redirect_url']) {
          window.location.replace(data['redirect_url']);
        }
      },
      errorActionHandler = function (form) {
        var form_id = $(form).attr('id');
        if (window[`cform_${form_id}`].submit_error_message) {
          alert(window[`cform_${form_id}`].submit_error_message);
        }
      },
      formSubmitHandler = function (form) {
        if (typeof loaderOn === 'function') {
          loaderOn();
        }
        var form_id = $(form).attr('id');
        if (
          $(submitterBtn).data('advanced_url') === undefined ||
          $(submitterBtn).data('advanced_url') === ''
        ) {
          submitUrl = window[`cform_${form_id}`].form_submit_url;
          advancedBtnClicked = false;
        } else {
          submitUrl = $(submitterBtn).data('advanced_url');
          advancedBtnClicked = true;
        }
        try {
          if (window[`cform_${form_id}`].pre_submit_function) {
            window[window[`cform_${form_id}`].pre_submit_function]();
          }
        } catch {
          console.log(
            `ERROR: Function ${
              window[`cform_${form_id}`].pre_submit_function
            } does not exist`
          );
        }
        formDataPromise = getFormData(form);
        formDataPromise.then((formData) => {
          if (validateUrl(submitUrl)) {
            $.ajax({
              type: 'POST',
              url: submitUrl,
              data: JSON.stringify(formData),
              dataType: 'json',
              contentType: 'application/json; charset=utf-8',
              // crossDomain: true,
              success: (data) => {
                if (!advancedBtnClicked) {
                  console.log('DEBUG: Form submit success', data);
                  successActionHandler(form);

                  reservedKeywordsHandler(data);
                  populateForm(form_id, data);
                } else {
                  console.log('DEBUG: Advanced form submit success', data);
                  populateForm(form_id, data);
                  console.log('DEBUG: Form populated', form_id, data);

                  reservedKeywordsHandler(data);
                }
              },
              error: (data) => {
                console.log('DEBUG: Form submit error', data);
                if (
                  window[`cform_${form_id}`].submit_actions.includes(
                    'post_submit_function_call'
                  ) &&
                  window[`cform_${form_id}`].post_sub_error_function_name
                ) {
                  console.log('DEBUG: Running post submit error function');
                  window[
                    window[`cform_${form_id}`].post_sub_error_function_name
                  ]();
                }
                errorActionHandler(form);
              },
              complete: () => {
                submitterBtn = undefined;
                if (typeof loaderOff === 'function') {
                  loaderOff();
                }
              },
            });
          }
        });
      },
      populateForm = (formId, data) => {
        let elementType;
        for (var fid in data) {
          if ($(`#${fid}`).prop('nodeName') !== undefined) {
            elementType = $(`#${fid}`).prop('nodeName').toLowerCase();
          }
          if ($(`#${fid}-0`).prop('nodeName') !== undefined) {
            elementType =
              $(`#${fid}-0`).attr('name').substr(-2, 2) === '[]'
                ? 'checkbox'
                : 'radio';
            elementType = $(`#${fid}-0`).attr('type');
          } else if (
            ['checkbox', 'radio'].includes($(`#${fid}`).data('element_type'))
          ) {
            elementType = $(`#${fid}`).data('element_type');
          }
          if (elementType) {
            switch (elementType) {
              case 'input':
                $(`${elementType}#${fid}`).val(data[fid]);
                break;
              case 'select':
                if (advancedBtnClicked) {
                  $(`${elementType}#${fid}`).html('');
                  populateSelect($(`${elementType}#${fid}`), data[fid]);
                } else {
                  $(`${elementType}#${fid}`).val(data[fid]);
                  $(`${elementType}#${fid}`).trigger('change');
                }
                break;
              case 'radio':
                if (advancedBtnClicked) {
                  console.log('DEBUG: ad pop radio');
                  populateRadioCheckbox($(`#${fid}`), elementType, data[fid]);
                } else {
                  $(`input[name="${fid}"][value="${data[fid]}"]`).trigger(
                    'click'
                  );
                }
                break;
              case 'checkbox':
                if (advancedBtnClicked) {
                  $(`#${fid} div.elementor-field-option`).each(function (d) {
                    $(d).remove();
                  });
                  populateRadioCheckbox($(`#${fid}`), elementType, data[fid]);
                } else {
                  var checkboxes = $(`input[name="${fid}[]"]`);
                  var checkboxName = checkboxes.length > 0 ? `${fid}[]` : fid;
                  if (checkboxes.length > 0) {
                    for (var i = 0; i < checkboxes.length; i++) {
                      $(
                        `input[name="${checkboxName}"][value="${data[fid][i]}"]`
                      )
                        .prop('checked', true)
                        .trigger('change');
                    }
                  } else {
                    $(`input[name="${checkboxName}"][value="${data[fid]}"]`)
                      .prop('checked', true)
                      .trigger('change');
                  }
                  $(`input[name="${checkboxName}"][value="${data[fid]}"]`)
                    .prop('checked', true)
                    .trigger('change');
                }
                break;
              case 'table':
                if (advancedBtnClicked) {
                  clearTable($(`#${fid}`));
                }
                populateTable($(`#${fid}`), data[fid]);
                break;
            }
          }
        }
      };

    let forms = $('.cform'),
      buttons = $('button[role=cbutton]'),
      widgets = $('[role=consist_widget'),
      conditinedElements = $('.has-conditioning'),
      elementorElement,
      consistForm,
      cFormVars,
      onload,
      onloadQuery = '';

    // Bind changes in form for the conditioning
    $('body').on('change', 'input, select, textarea', function (e) {
      for (element of conditinedElements) {
        runConditions(element);
      }
    });

    // Run on all buttons and bind if 'op' not submit
    buttons.each((i, b) => {
      if ($(b).attr('op') !== 'submit') {
        $(b).on('click', function (e) {
          submitterBtn = $(this);
          if ($(b).attr('op') !== 'advanced') {
            e.preventDefault();
          }
          console.log(`DEBUG: ${$(this).attr('op').toUpperCase()} was clicked`);
          switch ($(this).attr('op')) {
            case 'reset':
              var form = $(this).closest('form'),
                inputFields = $(form).find(':input:not([readonly], select)'),
                selectFields = $(form).find('select:not([readonly])'),
                sigFields = $(form).find('.elementor-field-type-signature img');

              for (var input of inputFields) {
                switch ($(input).attr('type')) {
                  case 'checkbox':
                  case 'radio':
                    checkRadioDefault(input);
                    break;
                  case 'file':
                    $(input)[0].files = new DataTransfer().files;
                    filesList[$(input).attr('name')] = [];
                    $(`#${$(input).attr('id')}-table tbody`).html('');
                    break;
                  default:
                    $(input).val($(input).data('default') || '');
                    break;
                }
              }

              for (var select of selectFields) {
                selectDefault(
                  select,
                  $(select).parents('.elementor-field-group').data('default')
                );
              }

              for (var sig of sigFields) {
                $(sig).attr(
                  'src',
                  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH5gIRESAmxMFZvQAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAAAC0lEQVQI12NgAAIAAAUAAeImBZsAAAAASUVORK5CYII='
                );
              }
              break;
            case 'save':
              // TODO: save form (TBD)
              break;
            case 'advanced':
            default:
              // Do nothing
              break;
            case 'open_modal':
              console.log('DEBUG: Open popup');
              $(`#${$(b).attr('id')}_modal`).trigger('click');
              break;
          }
        });
      } else {
        console.log('DEBUG: Submit button');
      }
    });

    // textarea character counter
    let textareas = $('textarea.cinput');
    $(textareas).each((i, a) => {
      $(`#${$(a).attr('id')}_current-chars`).text($(a).val().length);

      $(a).keyup(function (e) {
        $(`#${$(a).attr('id')}_current-chars`).text($(a).val().length);
      });
    });

    var a = [];
    for (var element of widgets) {
      if ($(element).data('onload_url')) {
        a.push(populateOptions(element));
      }
    }

    // Populate all forms when all ajax requests are resolved, whether successful or not
    $.when(...a).always(function (...k) {
      // Run on all forms in page
      forms.each((i, f) => {
        cFormVars = window[`cform_${$(f).attr('id')}`];
        onload = cFormVars.form_onload_url
          ? parseUrl.getAll(cFormVars.form_onload_url)
          : { path: false };

        // Build the form's pseudo DOM elements
        $(f).text('');
        elementorElement = $(f).closest('.elementor-element');

        consistForm = `<form id="${cFormVars.form_id}" class="elementor-form-widget-wrap elementor-widget-container" method="post" action="${cFormVars.form_submit_url}" />`;

        $(f)
          .closest('.elementor-container')
          .wrapInner(elementorElement)
          .wrapInner(consistForm);

        elementorElement.remove();

        // Bind validation to the form
        $(`form#${$(f).attr('id')}`).validate({
          focusInvalid: false,
          errorElement: 'span',
          errorPlacement: (error, element) => {
            if (element.attr('type') === 'radio') {
              error.insertAfter(element.closest('.elementor-radio-wrapper'));
            } else if (element.attr('type') === 'checkbox') {
              error.insertAfter(element.closest('.elementor-checkbox-wrapper'));
            } else {
              error.insertAfter(element);
            }
          },
          onfocusout: function (element) {
            this.element(element);
          },
          submitHandler: formSubmitHandler,
        });

        // Populate form data
        if (onload.path) {
          onloadQuery = generateCombinedQuery(
            onload.vars,
            cFormVars.query_params
          );
          onloadUrl = `${onload.schema}${onload.schema ? '://' : ''}${
            onload.domain
          }/${onload.path}${onloadQuery ? '?' + onloadQuery : ''}`;
          $.ajax({
            type: 'get',
            url: onloadUrl,
            contentType: 'application/json; charset=utf-8',
            success: (data) => {
              populateForm($(f).attr('id'), data);
              console.log('DEBUG: Populate success', data);
              console.log(data['alert_message']);
              reservedKeywordsHandler(data);
              // TODO: Populate the form on all widget types
            },
            error: (data) => {
              console.log('DEBUG: error', data);
              // TODO: Alert user?
            },
          });
        }

        // Run all conditions
        for (element of conditinedElements) {
          runConditions(element);
        }
      });
    });
  });
})(jQuery);
