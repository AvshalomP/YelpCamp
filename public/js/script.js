var urlImage        = $("#urlImage"); 
var editUrlImage    = $("#editUrlImage"); 
var uploadImage     = $("#uploadImage"); 

urlImage.toggle();
editUrlImage.toggle();

$("#choose").on("change", function(){
    $(".imageInput").toggle();
    if($(this).val() === '2'){
        uploadImage.prop('required', true);
        urlImage.prop('required', false);
        urlImage.val('');
    }
    else{
        urlImage.prop('required', true);
        editUrlImage.prop('required', true);
        uploadImage.prop('required', false);
        $("#uploadImage").replaceWith($("#uploadImage").val('').clone(true));
    }
});