$('.loader').hide();
$('.main').css('display', 'grid');

var chat_container_height = 500;
var chat_messages = $("#All > p").length;
var sidechat_length = 0;

// check speed must be faster than init speed
var chat_check_speed = 3000;
var chat_init_speed  = 1000;

function addEvents() {
    $('.sidechat_controls_add').off();
    $('.sidechat_controls_add').on('click', function(e) {
        let p = prompt('Provide email address or publickey of user to add:');
        if (p != null) {
            let cmd = "add "+p;
            $('.chat_new-message-input').val(cmd);
            var e = jQuery.Event("keypress");
            e.which = 13;
            $('.chat_new-message-input').trigger(e);
        }
    });

    $('.chat_orange_button').off();
    $('.chat_orange_button').on('click', function(e) {
        let p = prompt('Provide email address or publickey of user to add:');
        if (p != null) {
            let cmd = "add "+p;
            $('.chat_new-message-input').val(cmd);
            var e = jQuery.Event("keypress");
            e.which = 13;
            $('.chat_new-message-input').trigger(e);
        }
    });


    $('.sidechat_controls_info').off();
    $('.sidechat_controls_info').on('click', function(e) {
        alert("version 0.1");
    });
}

function scrollToBottom() { $("#chat_main").animate({ scrollTop: $('#chat_main').prop("scrollHeight")}, 100); }

function showMailchat() {
    $('#chat_new-message').show();
    $('.chat_chat-room-selector').show();
    $('.chat_orange_button').show();
    $('#chat_header').css('background-color','#fff');
    $('#chat_saitoText').css('color','#444');
    $('.mail_chat_popup').css('bottom','500px');
    $('#chat_main').css('height', '420px');
}

function hideMailchat() {
    $('#chat_new-message').hide();
    $('.chat_chat-room-selector').hide();
    $('.chat_orange_button').hide();
    $('#chat_header').css('background-color','#fff');
    $('#chat_saitoText').css('color','#a5a5a5');
    $('.mail_chat_popup').css('bottom','40px');
    $('#chat_main').css('height', '0px');
}


function toggleMailchat() {
    if ($('.mail_chat_popup').hasClass('show')) {
        hideMailchat();
    } else {
        showMailchat();
    }
}


var chat_check_timer = setInterval(function() {
    let tmpcm = $("#All > p").length;
    if (tmpcm > chat_messages) {
    chat_messages = tmpcm;
    if (chat_container_height == 40) {
        $('#chat_header').css('background-color','#9deca1');
        $('#chat_saitoText').css('color', '#444');
        init_length = tmpcm;
    }
    }

    // and check if we have added a user
    if ($(".chat_chat-room-option").length > sidechat_length) {
        initialize_sidechat();
        addEvents();
    }

}, chat_check_speed);

setTimeout(function() { initialize_sidechat(); addEvents();}, chat_init_speed);


function initialize_sidechat() {
    if ($(window).width() <= 900) {
        // $('.mail_chat_popup').hide();
        $('.sidechat').hide();
        $('.sidechat_controls').hide();
        return;
    }
    $('.sidechat').empty();
    $('.chat_chat-room-option').each(function() {
        chat_messages = $("#ALL > p").length;
        sidechat_length++;

        if ($(this).html() != "All") {

            let n = $(this).html();
            let v = $(this).val();
            let h = '<div class="sidechat_contact" id="'+v+'">'+n+'</div>';
            $('.sidechat').append(h);

            $('.sidechat_contact').off();
            $('.sidechat_contact').on('click', function() {
                $('.chat_chat-room-selector').val($(this).attr('id'));
                $('.chat_chat-room-selector').change();
                if (chat_container_height < 500) { $('#chat_header').click(); }
                $('#chat_new-message-input').focus();
            });

        }
    });

}