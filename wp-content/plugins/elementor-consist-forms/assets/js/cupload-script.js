(function ($) {
  $(document).ready(function () {
    let fileInputs = $('.cupload'),
      customButtons = $('.cupload-button');

    for (let i = 0; i < fileInputs.length; i++) {
      $(customButtons[i]).on('click', function () {
        $(`#${$(customButtons[i]).attr('id').replace('_button', '')}`).click();
      });
    }

    fileInputs.each(function (i, f) {
      let fileFieldName = $(f).attr('name');
      filesList[fileFieldName] = [];
      $(f).on('change', function () {
        // $(f).focusout();
        let fileListTableId = `${$(f).attr('id')}-table`;
        if ($(f)[0].files.length == 0) {
          console.log('DEBUG: No files selected');
          return;
        }

        for (let i = 0; i < $(f)[0].files.length; i++) {
          filesList[fileFieldName].push($(f)[0].files[i]);
        }

        let filesTable = $(`#${fileListTableId}`),
          filesTransfer = new DataTransfer();
        $(filesTable).find('tbody').html('');
        for (let i = 0; i < filesList[fileFieldName].length; i++) {
          let file = filesList[fileFieldName][i];
          filesTransfer.items.add(file);
          let filesTable = $(`#${fileListTableId}`),
            newRow = $(''),
            removeButton = $(
              '<td class="remove-row" ><i class="eicon-trash"></i></td>'
            );

          $(removeButton).click(function (e) {
            let fileIndex = $(this).closest('tr').data('row_number'),
              rows = $(filesTable).find('tbody tr'),
              fileFieldName = $(this)
                .closest('table')
                .attr('id')
                .replace('-table', '');
            if (fileIndex === rows.length - 1) {
              filesList[fileFieldName].pop();
            } else {
              filesList[fileFieldName].splice(fileIndex, 1);
            }
            if (filesList[fileFieldName].length == 0) {
              $(`input[name="${fileFieldName}"]`)[0].files =
                new DataTransfer().files;
              console.log('DEBUG: No files selected');
            }
            $(this).closest('tr').remove();
            for (let i = fileIndex; i < rows.length; i++) {
              $(rows[i]).attr('data-row_number', i - 1);
            }
            console.log(
              `DEBUG: Files of ${fileFieldName} changed`,
              filesList[fileFieldName]
            );
            if (
              filesList[fileFieldName].length <
              $(`#${fileFieldName}`).data('max_files')
            ) {
              $(`#${fileFieldName}_button`).attr('disabled', false);
            }
            $(f).focusout();
          });

          let fileName = file.name.split('.');
          let fileExtension = fileName.pop();
          fileName = fileName.join('.');
          let fileSize =
            file.size / 1024 / 1024 > 1
              ? `${(file.size / 1024 / 1024).toFixed(2)} MB`
              : `${(file.size / 1024).toFixed(2)} KB`;
          newRow += `<td>${fileName}</td>
              <td>${fileSize}</td>
              <td>${fileExtension}</td>`;
          $(filesTable)
            .find('tbody')
            .append(
              $(`<tr data-row_number=${i}></tr>`).append(newRow, removeButton)
            );
        }
        $(`input[name="${fileFieldName}"]`)[0].files = filesTransfer.files;
        $(`#${fileFieldName}`)
          .parents('.elementor-field-type-upload')
          .find('button.cupload-button')
          .blur();
        if (
          filesList[fileFieldName].length >=
          $(`#${fileFieldName}`).data('max_files')
        ) {
          $(`#${fileFieldName}_button`).attr('disabled', true);
        }
        console.log(
          `DEBUG: Files of ${fileFieldName} changed`,
          filesList[fileFieldName]
        );
        $(f).focusout();
      });
    });
  });
})(jQuery);

function getBase64(file) {
  return new Promise((resolve, reject) => {
    var reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      resolve(reader.result);
    };
    reader.onerror = reject;
  });
}
