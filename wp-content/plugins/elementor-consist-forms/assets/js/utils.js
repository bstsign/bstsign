var clientIp;
let filesList = {},
  submitterBtn,
  submitUrl,
  advancedBtnClicked = false;
(async ($) => {
  await $.getJSON('https://api.ipify.org?format=json', (data) => {
    clientIp = data.ip;
  });
})(jQuery);

var $ = jQuery,
  clickedFormButton = '',
  parseUrl = {
    url: '',
    schema: '',
    domain: '',
    path: '',
    vars: {},
    getUrl: function (url) {
      this.url = url || window.location.href;
      return this.url;
    },
    getSchema: function (url) {
      var url = url || this.getUrl(),
        isShema = url.indexOf('://');
      this.schema = '';
      if (isShema !== -1) {
        this.schema = url.slice(0, url.indexOf('://'));
      }
      return this.schema;
    },
    getDomain: function (url) {
      var url = url || this.getUrl(),
        schema = this.getSchema(url),
        uri = schema ? url.slice(url.indexOf('://') + 3) : url;
      this.domain =
        uri.indexOf('/') !== 0 ? uri.slice(0, uri.indexOf('/')) : '';
      return this.domain;
    },
    getPath: function (url) {
      var url = url || this.getUrl(),
        domain = this.getDomain(url),
        path = domain
          ? url.slice(url.indexOf(domain) + domain.length + 1)
          : url.slice(url.indexOf('/') + 1),
        isQuery = path.indexOf('?');
      this.path = isQuery !== -1 ? path.slice(0, isQuery) : path;
      return this.path;
    },
    getVars: function (url) {
      var hash = [],
        url = url || this.getUrl(),
        isQuery = url.indexOf('?'),
        query,
        queryVars,
        i;
      this.vars = {};
      if (isQuery !== -1) {
        query = url.slice(url.indexOf('?') + 1);
        if (query.length > 0) {
          queryVars = query.split('&');
          for (i = 0; i < queryVars.length; i++) {
            if (queryVars[i].indexOf('=') !== -1) {
              hash = queryVars[i].split('=');
              this.vars[hash[0]] = hash[1];
            }
          }
        }
      }
      return this.vars;
    },
    getAll: function (url) {
      this.url = url || this.getUrl();
      this.schema = this.getSchema(url);
      this.domain = this.getDomain(url);
      this.path = this.getPath(url);
      this.vars = this.getVars(url);
      return {
        url: this.url,
        schema: this.schema,
        domain: this.domain,
        path: this.path,
        vars: this.vars,
      };
    },
  },
  generateCombinedQuery = (vars, additionalVars) => {
    var queryString = '',
      urlQueryVars = parseUrl.getVars();
    additionalVars.forEach((q) => {
      if (q in urlQueryVars) {
        vars[q] = urlQueryVars[q];
      }
    });
    queryString = $.param(vars);

    return queryString;
  },
  validateUrl = function (text) {
    var pat =
        /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/,
      regEx = new RegExp(pat);
    return text.match(regEx);
  },
  getAdditionalFormData = function (form) {
    var form_id = $(form).attr('id'),
      formDataParams = window[`cform_${form_id}`].additional_form_data,
      today = new Date();
    let formData = {};
    for (var param of formDataParams) {
      switch (param) {
        case 'date':
          formData = {
            ...formData,
            date: `${today.getFullYear()}-${`0${today.getMonth() + 1}`.slice(
              -2
            )}-${`0${today.getDate()}`.slice(-2)}`,
          };
          break;
        case 'time':
          formData = {
            ...formData,
            time: `${`0${today.getHours()}`.slice(
              -2
            )}:${`0${today.getMinutes()}`.slice(
              -2
            )}:${`0${today.getSeconds()}`.slice(-2)}`,
          };
          break;
        case 'link_to_page':
          formData = {
            ...formData,
            link_to_page: window.location.href,
          };
          break;
        case 'user_agent':
          formData = {
            ...formData,
            user_agent: window.navigator.userAgent,
          };
          break;
        case 'sender_IP':
          formData = { ...formData, client_ip: clientIp };
          break;
        case 'form_ID':
          formData = { ...formData, form_id: form_id };
          break;
      }
    }
    return formData;
  },
  getFormSerializeData = async function (form) {
    return new Promise(async (resolve) => {
      var formData = $(form).serializeArray();
      let innerFormData = {};

      var form_id = $(form).attr('id');
      var includedForms = $(`#${form_id}`).find('form');
      if (includedForms.length) {
        for (form of includedForms) {
          innerFormData = {
            ...(await getFormSerializeData(form)),
            ...innerFormData,
          };
        }
        resolve({
          ...[...Object.values(formData), ...Object.values(innerFormData)],
        });
      } else {
        resolve(formData);
      }
    });
  },
  getSignatureData = function (form) {
    var form_id = $(form).attr('id');
    if ($(form).find('.elementor-field-type-signature')) {
      var sigFields = $(form).find('.elementor-field-type-signature img');
      var sigData = [];
      for (var sig of sigFields) {
        sigData[$(sig).attr('name')] = $(sig).attr('src');
      }
      return sigData;
    } else {
      return false;
    }
  },
  getFileUploadData = async (form) => {
    if ($(form).find('.elementor-upload-field')) {
      var filesFields = $(form).find('.elementor-upload-field');
      var data = {};
      for (var fileField of filesFields) {
        var fileFieldName = $(fileField).attr('name');
        data[fileFieldName] = [];

        if (filesList[fileFieldName] !== undefined) {
          for (file of filesList[fileFieldName]) {
            base64 = await getBase64(file);
            data[fileFieldName].push({ fileName: file.name, base64: base64 });
          }
        }
      }
      return data;
    } else {
      return {};
    }
  },
  getTableData = (form) => {
    if ($(form).find('table.consist-table')) {
      var tables = $(form).find('table.consist-table');
      var data = {};
      for (var table of tables) {
        if ($(table).hasClass('send-table-data')) {
          var tableId = $(table).attr('id');
          data[tableId] = [];
          if ($(table).find('tbody').find('tr')) {
            var rows = $(table).find('tbody').find('tr');
            for (var row of rows) {
              var columns = $(row).find('td');
              var rowData = {};
              for (var column of columns) {
                if (!$(column).hasClass('remove-row')) {
                  if ($(column).data('column_type') === 'checkbox') {
                    rowData[$(column).data('col')] = $(column)
                      .text()
                      .split(',');
                  } else {
                    rowData[$(column).data('col')] = $(column).text();
                  }
                }
              }
              data[tableId].push(rowData);
            }
          }
        }
      }
      console.log(data);
      return data;
    } else {
      return {};
    }
  },
  getAutocompleteData = (form) => {
    if ($(form).find('.cautocomplete')) {
      var autocompleteFields = $(form).find('.cautocomplete');
      var data = {};
      for (var autocompleteField of autocompleteFields) {
        var autocompleteFieldName = $(autocompleteField).attr('name'),
          variableName = `${$(autocompleteField).attr('id')}_fieldVars`,
          fieldOptionsKeys = Object.values(window[variableName].options),
          fieldOptionsValues = Object.keys(window[variableName].options),
          fieldSelectedValue = $(autocompleteField).val(),
          index = fieldOptionsValues.indexOf(fieldSelectedValue);
        data[autocompleteFieldName] =
          index !== -1 ? fieldOptionsKeys[index] : '';
      }
      return data;
    } else {
      return {};
    }
  },
  getFormData = async (form) => {
    var sData = await getFormSerializeData(form),
      sigData = getSignatureData(form),
      uploadData = await getFileUploadData(form),
      tableData = getTableData(form),
      autocompleteData = getAutocompleteData(form);
    console.log('DEBUG: sData', sData);
    console.log('DEBUG: sigData', sigData);
    console.log('DEBUG: uploadData', uploadData);
    console.log('DEBUG: tableData', tableData);
    console.log('DEBUG: autocompleteData', autocompleteData);
    let formData = getAdditionalFormData(form),
      fieldName;
    formData = {
      ...formData,
      ...sigData,
      ...uploadData,
      ...tableData,
      ...autocompleteData,
    };
    $.each(sData, (k, v) => {
      fieldName = v.name;
      if (fieldName in autocompleteData) {
        return;
      }
      if (fieldName.substr(-2, 2) === '[]') {
        fieldName = v.name.substr(0, v.name.length - 2);
        if (formData[fieldName] === undefined) {
          formData[fieldName] = [];
        }
        formData[fieldName].push(v.value);
      } else if (Object.keys(formData).includes(fieldName)) {
        if (Array.isArray(formData[fieldName])) {
          formData[fieldName].push(v.value);
        } else {
          formData[fieldName] = [formData[fieldName]];
          formData[fieldName].push(v.value);
        }
      } else {
        formData[fieldName] = v.value;
      }
    });

    console.log('DEBUG: formData ', formData);
    return formData;
  },
  checkRadioDefault = function (input) {
    $(input).removeAttr('checked');
    let defaultValues = $(`.elementor-field-type-${$(input).attr('type')}`)
      .data('default')
      .toString();
    defaultValues = defaultValues.includes('|')
      ? defaultValues.split('|')
      : [defaultValues];
    if (defaultValues.includes($(input).val().toString())) {
      $(input).attr('checked', true).click();
    }
  },
  selectDefault = function (element, defaults) {
    for (var option of $(element).find('option')) {
      $(option).removeAttr('selected');
    }
    if (defaults) {
      if ($(element).attr('multiple')) {
        var selectedOptions = defaults.split('|');
        for (var option in selectedOptions) {
          $(`option[value=${option}]`).attr('selected', true);
        }
        $(element).val(selectedOptions).change();
      } else {
        let selectedOption = defaults.toString();
        if (selectedOption.includes('|')) {
          selectedOption = selectedOption.split('|')[0];
        }
        $(`option[value=${selectedOption}]`).attr('selected', true);
        $(element).val(selectedOption).change();
      }
    } else {
      var firstOption = $(element).find('option').first();
      $(firstOption).attr('selected', true);
      $(element).val($(firstOption).val()).change();
    }
  },
  populateOptions = function (element) {
    let i, id;
    return $.ajax({
      type: 'get',
      url: $(element).data('onload_url'),
      dataType: 'json',
      success: function (response) {
        console.log('DEBUG: Field onload success:', response);

        var elementType = $(element).data('element_type');
        switch (elementType) {
          case 'text':
            if ($(element).find('input').hasClass('cautocomplete')) {
              var fieldId = $(element).find('input').attr('id');
              console.log('response', response);
              window[`${fieldId}_fieldVars`].options = response;
              var autocompleteOptions = Object.keys(response);
              makeAutocompleteField(
                $(element).find('input'),
                autocompleteOptions
              );
              break;
            }
          case 'date':
          case 'time':
            var input = $(element).find('input');
            $(input).val(response[Object.keys(response)[0]]);
            break;
          case 'select':
            var select = $(element).find('select');
            $(select).html('');
            populateSelect($(select), response);
            if ($(element).data('default')) {
              selectDefault(select, $(element).data('default'));
            }
            break;
          case 'radio':
          case 'checkbox':
            populateRadioCheckbox(element, elementType, response);
            break;
          case 'table':
            var table = $(element).find('table');
            if (
              !response[$(table).attr('id')] ||
              $(table).find('tbody tr').length != 0
            ) {
              break;
            }
            populateTable(table, response[$(table).attr('id')]);
            break;
        }
      },
      error: function (data) {
        console.log('DEBUG: Field onload error:', data);
      },
    });
  },
  populateTable = (table, tableData) => {
    for (var row of tableData) {
      addRow(table, row);
    }
  },
  populateSelect = function (select, selectData) {
    for (var key in selectData) {
      $(select).append(`<option value="${selectData[key]}">${key}</option>`);
    }
  },
  populateRadioCheckbox = function (element, elementType, radioCheckboxData) {
    console.log(
      'DEBUG: populateRadioCheckbox',
      $(element),
      elementType,
      radioCheckboxData
    );
    var label = $(element).children().first('label');
    var inputLabelClassTypography =
      $(element).data('typography') === 'custom'
        ? 'class="custom-typography"'
        : '';
    var inlineWrapper = $(element).find('.inline-wrapper');
    // Remove previous input fields in group
    if (inlineWrapper.length) {
      $(inlineWrapper).html('');
    } else {
      $(element).html('').append(label);
    }

    id = $(element).attr('id');
    i = 0;
    let option;
    for (var key in radioCheckboxData) {
      console.log(key, radioCheckboxData[key]);
      option = `<div class="elementor-field-option elementor-size-sm" style="margin:0 5px;">
        <input type="${elementType}" value="${
        radioCheckboxData[key]
      }" id="${id}-${i}" name="${id}${
        elementType === 'checkbox' ? '[]' : ''
      }"></input>
        <label for="${id}-${i}" ${inputLabelClassTypography}>${key}</label>
        </div>`;
      if (inlineWrapper.length) {
        $(inlineWrapper).append(option);
      } else {
        $(element).append(option);
      }
      i++;
    }
  },
  evaluateConditionString = async function (str, form) {
    try {
      var lines = str.split('\n'),
        strLines = [],
        formData = await getFormData(form);
      lines.forEach(function (line) {
        strLines.push(`(${line})`);
      });
      str = strLines.join(' && ');
      var fields = [...str.matchAll(/\{.*?\}/gm)];
      fields.forEach(function (f) {
        var fname = f[0].trim().replaceAll(/\{|\}/g, '');
        if ($(`[name="${fname}"]`).length) {
          switch ($(`[name="${fname}"]`).attr('type')) {
            case 'select':
              if (Array.isArray(formData[fname])) {
                str = str.replaceAll(
                  f,
                  `"${JSON.stringify(formData[fname]).replaceAll('"', '\\"')}"`
                );
              } else {
                str = str.replaceAll(f, `"[\\"${formData[fname]}\\"]"`);
              }
              break;
            case 'radio':
            default:
              str = str.replaceAll(f, `"${formData[fname]}"`);
              break;
          }
        }
        if ($(`[name="${fname}[]"]`).length) {
          switch ($(`[name="${fname}[]"]`).attr('type')) {
            case 'radio':
              str = str.replaceAll(
                f,
                `"${
                  Array.isArray(formData[fname])
                    ? JSON.stringify(formData[fname]).replaceAll(/[\["\]]/g, '')
                    : ''
                }"`
              );
              break;
            case 'checkbox':
              str = str.replaceAll(
                f,
                `"${
                  Array.isArray(formData[fname])
                    ? JSON.stringify(formData[fname]).replaceAll('"', '\\"')
                    : '[\\"\\"]'
                }"`
              );
              break;
          }
        }
      });

      console.log(`DEBUG: Evaluate condition ${str}`);
      console.log(`DEBUG: Evaluate result`, eval(str));
      return eval(str);
    } catch (error) {
      console.log(`DEBUG: Evaluation error on a condition ${str}.`);
      console.log(error);
      console.log(`DEBUG: Evaluate result`, true);
      return true;
    }
  },
  runConditions = async function (element) {
    var conditionType = $(element).data('condition-type');
    var condition = $(element).data('condition');
    var form = $(element).parents('form');
    switch (conditionType) {
      case 'show':
        if (await evaluateConditionString(condition, form)) {
          $(element).show();
        } else {
          $(element).hide();
        }
        break;
      case 'hide':
        if (await evaluateConditionString(condition, form)) {
          $(element).hide();
        } else {
          $(element).show();
        }
        break;
    }
  };

/* ====== Get clicked button accross platforms (solves an issue on iOS) ====== */
document.addEventListener('click', function (e) {
  if (e.target.matches('button')) {
    e.target.focus();
    clickedFormButton = $(e.target).attr('op');
  }
});
/* ====== Add form validation methods========================================= */
$.validator.addMethod(
  'email',
  function (text, element) {
    var pat =
      /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return this.optional(element) || text.match(pat);
  },
  $.validator.format(consist_utils.generalMessages.validation.email)
);
$.validator.addMethod(
  'id_number',
  function (text, element) {
    if (text.length !== 9) return this.optional(element);
    let sum = 0,
      incNum;
    for (const i in text) {
      incNum = Number(text[i]) * ((i % 2) + 1);
      sum += incNum > 9 ? incNum - 9 : incNum;
    }
    return this.optional(element) || sum % 10 === 0;
  },
  $.validator.format(consist_utils.generalMessages.validation.id_number)
);
$.validator.addMethod(
  'pattern',
  function (text, element) {
    var pat = new RegExp(element.pattern);
    return this.optional(element) || text.match(pat);
  },
  $.validator.format(consist_utils.generalMessages.validation.pattern)
);
$.validator.addMethod(
  'minimumselection',
  function (text, element) {
    var count = 0;
    var minimum = 0;
    if (element.type == 'checkbox') {
      var parentId = element.id.substr(0, element.id.lastIndexOf('-'));
      minimum = document.getElementById(parentId).getAttribute('data-minimum');
      var options = $(`input[id*=${parentId}]`);
      for (var i = 0; i < options.length; i++) {
        if (options[i].checked) {
          count++;
        }
      }
    } else {
      minimum = element.getAttribute('data-minimum');
      var options = element.children;
      for (var i = 0; i < options.length; i++) {
        if (options[i].selected) {
          count++;
        }
      }
    }

    return count >= minimum;
  },
  $.validator.format(consist_utils.generalMessages.validation.minimumselection)
);
$.validator.addMethod(
  'time_range',
  function (text, element) {
    var min,
      max,
      minValid = true,
      maxValid = true;
    val = new Date('01-01-2011 ' + element.value);
    if (element.hasAttribute('minhour')) {
      min = new Date('01-01-2011 ' + element.getAttribute('minhour'));
      minValid = val >= min;
    }
    if (element.hasAttribute('maxhour')) {
      var max = new Date('01-01-2011 ' + element.getAttribute('maxhour'));
      maxValid = val <= max;
    }
    if (max < min) {
      return minValid || maxValid;
    }
    return minValid && maxValid;
  },
  $.validator.format(consist_utils.generalMessages.validation.time_range)
);
$.validator.addMethod(
  'date_range',
  function (text, element) {
    date_format = element.getAttribute('dateformat').split('/');
    parsed_date = element.value;
    if (!parsed_date) {
      return true;
    }
    if (parsed_date.includes('-')) {
      parsed_date = parsed_date.split('-');
    } else if (parsed_date.includes('/')) {
      parsed_date = parsed_date.split('/');
    } else if (parsed_date.includes('.')) {
      parsed_date = parsed_date.split('.');
    }
    new_date = `${parsed_date[date_format.indexOf('Y')]}-${
      parsed_date[date_format.indexOf('m')]
    }-${parsed_date[date_format.indexOf('d')]}`;
    valid = true;
    if (element.min) {
      valid = new Date(new_date) >= new Date(element.min);
    }
    if (element.max) {
      valid = valid && new Date(element.max) >= new Date(new_date);
    }
    return valid;
    // return (new Date(new_date) >= new Date(element.min)) && new Date(element.max) >= new Date(new_date);
  },
  $.validator.format(consist_utils.generalMessages.validation.date_range)
);
$.validator.addMethod(
  'signature_required',
  function (text, element) {
    return text === 'valid';
  },
  $.validator.format(
    consist_utils.generalMessages.validation.signature_required
  )
);
$.validator.addMethod(
  'max_files_validate',
  function (text, element) {
    // if (element.files.length > element.getAttribute('data-max_files')) {
    //   return false;
    // }
    let fileFieldName = element.getAttribute('name'),
      maxFiles = element.getAttribute('data-max_files');
    if (filesList[fileFieldName].length > maxFiles) {
      return false;
    }
    return true;
  },
  $.validator.format(
    consist_utils.generalMessages.validation.max_files_validate
  )
);
$.validator.addMethod(
  'max_size_validate',
  function (text, element) {
    // var max_size = element.getAttribute('data-max_size');
    // for (var i = 0; i < element.files.length; i++) {
    //   if (element.files[i].size / 1024 / 1024 > max_size) {
    //     return false;
    //   }
    // }
    let fileFieldName = element.getAttribute('name'),
      max_size = element.getAttribute('data-max_size');
    // console.log("DEBUG: files for field " + fileFieldName, filesList[fileFieldName]);
    for (var i = 0; i < filesList[fileFieldName].length; i++) {
      if (filesList[fileFieldName][i].size / 1024 / 1024 > max_size) {
        return false;
      }
    }
    return true;
  },
  $.validator.format(consist_utils.generalMessages.validation.max_size_validate)
);
$.validator.addMethod('min_validate', function (text, element) {
  let min = element.getAttribute('min_validate');
  if (parseInt(element.value) < parseInt(min)) {
    return false;
  }
  return true;
});
$.validator.addMethod('max_validate', function (text, element) {
  let max = element.getAttribute('max_validate');
  if (parseInt(element.value) > parseInt(max)) {
    return false;
  }
  return true;
});
$.validator.addMethod('step_validate', function (text, element) {
  let step = element.getAttribute('step_validate');
  if (parseInt(element.value) % parseInt(step) !== 0) {
    return false;
  }
  return true;
});
$.validator.addMethod(
  'file_types_validate',
  function (text, element) {
    // var file_types = element.getAttribute('data-file_types');
    // for (var i = 0; i < element.files.length; i++) {
    //   if (!file_types.includes(element.files[i].name.split('.').pop())) {
    //     return false;
    //   }
    // }
    let fileFieldName = element.getAttribute('name'),
      fileTypes = element.getAttribute('data-file_types');
    for (var i = 0; i < filesList[fileFieldName].length; i++) {
      if (
        !fileTypes.includes(filesList[fileFieldName][i].name.split('.').pop())
      ) {
        return false;
      }
    }
    return true;
  },
  $.validator.format(
    consist_utils.generalMessages.validation.file_type_validate
  )
);
$.validator.addMethod(
  'require_from_list_validate',
  function (text, element) {
    return (
      element.getAttribute('value_is_from_list') === 'true' ||
      element.value === ''
    );
  },
  $.validator.format(
    consist_utils.generalMessages.validation.require_from_list_validate
  )
);
$.validator.addMethod('number', function (text, element) {
  return this.optional(element) || text.match(new RegExp('^[0-9]*$'));
});

/* =========================================================================== */
